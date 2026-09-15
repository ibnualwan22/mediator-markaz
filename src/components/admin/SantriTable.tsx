"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Eye, FileSpreadsheet, Loader2, X } from "lucide-react";
import ImportExcelModal from "./ImportExcelModal";
import SearchAutocomplete from "@/components/admin/SearchAutocomplete";
import { useRouter } from "next/navigation";

export default function SantriTable({ 
  santriList, 
  gelombangs,
  periodes,
  query,
  selectedGelombangId,
  selectedPeriodeId
}: { 
  santriList: any[],
  gelombangs: any[],
  periodes: any[],
  query: string,
  selectedGelombangId: string,
  selectedPeriodeId: string
}) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUrutModal, setShowUrutModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const [isCopying, setIsCopying] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const COPY_FIELDS = [
    "Nama Arab", "Asal Provinsi", "Email", "No. WA Santri", 
    "Nama Wali", "No. WA Wali", "Pendidikan Terakhir (Lainnya)", 
    "Tahun Kelulusan", "Foto Profil (Backgroun Merah)", 
    "Nomor Paspor", "Tanggal Pembuatan Paspor", "Tanggal Kadaluarsa Paspor", "Pilihan Jurusan"
  ];
  const [selectedCopyFields, setSelectedCopyFields] = useState<string[]>(COPY_FIELDS);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = new URL("/api/admin/santri/export", window.location.origin);
      if (query) url.searchParams.set("search", query);
      if (selectedGelombangId !== "all") url.searchParams.set("gelombangId", selectedGelombangId);
      url.searchParams.set("periodeId", selectedPeriodeId);
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Transfer gagal");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Data_Santri_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyIncompleteData = async () => {
    if (selectedCopyFields.length === 0) {
       alert("Pilih minimal 1 jenis data untuk dicek kekosongannya!");
       return;
    }

    setIsCopying(true);
    let copyText = "Data santri yang data dirinya belum lengkap:\n\n";
    let incompleteCount = 0;

    santriList.forEach((s, idx) => {
      const missingFields: string[] = [];

      // Check default text fields
      if (selectedCopyFields.includes("Nama Arab") && (!s.namaArab || s.namaArab === "-" || s.namaArab === "")) missingFields.push("Nama Arab");
      if (selectedCopyFields.includes("Asal Provinsi") && (!s.asalProvinsi || s.asalProvinsi === "-" || s.asalProvinsi === "")) missingFields.push("Asal Provinsi");
      if (selectedCopyFields.includes("Email") && (!s.email || s.email === "-" || s.email === "")) missingFields.push("Email");
      if (selectedCopyFields.includes("No. WA Santri") && (!s.noWaSantri || s.noWaSantri === "-" || s.noWaSantri === "")) missingFields.push("No. WA Santri");
      if (selectedCopyFields.includes("Nama Wali") && (!s.namaWali || s.namaWali === "-" || s.namaWali === "")) missingFields.push("Nama Wali");
      if (selectedCopyFields.includes("No. WA Wali") && (!s.noWaWali || s.noWaWali === "-" || s.noWaWali === "")) missingFields.push("No. WA Wali");

      // Check Akademik
      // if riwayatAkademik is LAINNYA, then riwayatAkademikLainnya should not be empty
      if (selectedCopyFields.includes("Pendidikan Terakhir (Lainnya)") && s.riwayatAkademik === "LAINNYA" && (!s.riwayatAkademikLainnya || s.riwayatAkademikLainnya === "-" || s.riwayatAkademikLainnya === "")) {
        missingFields.push("Pendidikan Terakhir (Lainnya)");
      }
      if (selectedCopyFields.includes("Tahun Kelulusan") && (!s.tahunKelulusan || s.tahunKelulusan === 0)) missingFields.push("Tahun Kelulusan");

      // Check Foto Profil (Profil Santri)
      if (selectedCopyFields.includes("Foto Profil (Backgroun Merah)") && (!s.fotoProfil || s.fotoProfil === "-" || s.fotoProfil === "")) missingFields.push("Foto Profil (Backgroun Merah)");

      // Check Paspor
      if (selectedCopyFields.includes("Nomor Paspor") && (!s.nomorPaspor || s.nomorPaspor === "-" || s.nomorPaspor === "")) missingFields.push("Nomor Paspor");
      if (selectedCopyFields.includes("Tanggal Pembuatan Paspor") && !s.tanggalPembuatanPaspor) missingFields.push("Tanggal Pembuatan Paspor");
      if (selectedCopyFields.includes("Tanggal Kadaluarsa Paspor") && !s.tanggalKadaluarsaPaspor) missingFields.push("Tanggal Kadaluarsa Paspor");

      // Check Jurusan
      if (selectedCopyFields.includes("Pilihan Jurusan") && !s.jurusan) missingFields.push("Pilihan Jurusan");

      if (missingFields.length > 0) {
        incompleteCount++;
        copyText += `${incompleteCount}. ${s.namaLengkap}\n`;
        missingFields.forEach(field => {
          copyText += `- ${field}\n`;
        });
        copyText += '\n';
      }
    });

    if (incompleteCount === 0) {
      alert("Semua santri pada filter ini sudah memiliki data lengkap.");
      setIsCopying(false);
      setShowCopyModal(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      alert(`Berhasil menyalin ${incompleteCount} santri dengan data belum lengkap ke clipboard!`);
      setShowCopyModal(false);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      alert("Gagal menyalin ke clipboard.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-primary-light/20 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full max-w-2xl">
          {/* PERIODE FILTER */}
          <select
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary max-w-full sm:max-w-[200px]"
            value={selectedPeriodeId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) {
                params.set('periodeId', e.target.value);
                document.cookie = `admin_active_periode=${e.target.value}; path=/; max-age=31536000`;
              }
              else params.delete('periodeId');

              params.delete('gelombangId'); // reset gelombang when changing periode
              router.push(`/admin/santri?${params.toString()}`);
            }}
          >
            <option value="" disabled>Pilih Periode</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>

          {/* GELOMBANG FILTER */}
          <select
            className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm font-medium text-text-secondary dark:text-gray-400"
            value={selectedGelombangId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value !== "all") params.set('gelombangId', e.target.value);
              else params.delete('gelombangId');
              router.push(`?${params.toString()}`);
            }}
          >
            <option value="all">Semua Gelombang</option>
            {gelombangs.map(g => (
              <option key={g.id} value={g.id}>{g.nama}</option>
            ))}
          </select>

          <SearchAutocomplete 
            periodeId={selectedPeriodeId} 
            currentQuery={query}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCopyModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-200 rounded-lg transition-all text-sm font-semibold whitespace-nowrap`}
            title="Saring santri dengan data tidak lengkap"
          >
            <Filter size={16} /> Pilih Data Kosong
          </button>

          <div className="w-px h-6 bg-primary-light/30 mx-1 hidden sm:block"></div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center justify-center gap-2 px-4 py-2 ${isExporting ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20'} rounded-lg transition-all text-sm font-semibold whitespace-nowrap`}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {isExporting ? "Mengeksport..." : "Export Data"}
          </button>
          <button
            onClick={() => setShowUrutModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-success/10 hover:bg-success text-success hover:text-white border border-success/20 rounded-lg transition-all text-sm font-semibold whitespace-nowrap"
          >
            <FileSpreadsheet size={16} /> Import Nomor Urut
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg transition-all text-sm font-semibold whitespace-nowrap"
          >
            <FileSpreadsheet size={16} /> Import Bio
          </button>
          <div className="w-px h-6 bg-primary-light/30 mx-1 hidden sm:block"></div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary/5 text-text-primary dark:text-gray-100 text-sm">
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700 w-12 text-center">No.</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">No. Pendaftaran / NIC</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Nama Lengkap</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">No. Paspor</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Gelombang</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {santriList.length > 0 ? santriList.map((s, index) => (
              <tr key={s.id} className={`border-b border-primary-light/10 dark:border-gray-700 hover:bg-bg-cream dark:bg-gray-800 transition-colors ${s.isWithdrawn ? 'opacity-60 bg-red-50/50' : ''}`}>
                <td className="p-4 text-center font-medium text-text-secondary dark:text-gray-400">{index + 1}</td>
                <td className="p-4">
                  <div className="font-mono font-medium text-primary">{s.noPendaftaran}</div>
                  {s.nis ? (
                    <div className="text-xs font-mono font-bold text-success mt-1">NIC: {s.nis}</div>
                  ) : (
                    <div className="text-xs text-text-secondary dark:text-gray-400/70 mt-1">NIC belum ada</div>
                  )}
                  {s.nomorUrut && (
                    <div className="text-[10px] font-bold text-purple-600 mt-1.5 bg-purple-100 px-2 py-0.5 rounded-full inline-block">Urut: {s.nomorUrut}</div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-semibold text-text-primary dark:text-gray-100">{s.namaLengkap}</div>
                  <div className="text-text-secondary dark:text-gray-400 text-xs mt-1">{s.noWaSantri}</div>
                </td>
                <td className="p-4">
                  {s.nomorPaspor ? (
                    <div className="font-mono text-sm font-bold text-gray-700">{s.nomorPaspor}</div>
                  ) : (
                    <span className="text-xs italic text-gray-400">- Kosong -</span>
                  )}
                </td>
                <td className="p-4 text-text-secondary dark:text-gray-400">
                  {s.gelombang.periode.nama} <br /> <span className="font-medium text-xs border rounded px-1.5 py-0.5 mt-1 inline-block bg-white dark:bg-gray-900">{s.gelombang.nama}</span>
                </td>
                <td className="p-4 text-center">
                  <Link
                    href={`/admin/santri/${s.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-primary-light/40 dark:border-gray-700 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    <Eye size={14} /> Detail
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-secondary dark:text-gray-400 italic">
                  Tidak ada data camaba ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        gelombangList={gelombangs}
        onSuccess={() => {
          setShowImportModal(false);
          router.refresh();
        }}
        showGelombang={false}
      />

      <ImportExcelModal
        isOpen={showUrutModal}
        onClose={() => setShowUrutModal(false)}
        gelombangList={gelombangs}
        onSuccess={() => {
          setShowUrutModal(false);
          router.refresh();
        }}
        uploadUrl="/api/admin/santri/nis/import"
        templateUrl="/api/admin/santri/nis/template"
        showGelombang={false}
      />

      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                <h2 className="text-xl font-heading font-bold text-gray-800 dark:text-gray-100">Filter Salin Data Kosong</h2>
                <button onClick={() => setShowCopyModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors">
                  <X size={20} />
                </button>
             </div>
             <div className="p-6 overflow-y-auto w-full">
               <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 font-medium">Bapak ingin mensurvey data field mana saja yang saat ini masih KOSONG pada rentang filter tabel ini:</p>
               <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/30">
                    {COPY_FIELDS.map(col => (
                      <label key={col} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={selectedCopyFields.includes(col)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCopyFields([...selectedCopyFields, col]);
                            else setSelectedCopyFields(selectedCopyFields.filter(c => c !== col));
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 h-4 w-4 outline-none cursor-pointer"
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    ))}
               </div>
               
               <button
                  onClick={handleCopyIncompleteData}
                  disabled={isCopying}
                  className="w-full mt-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-sm"
               >
                 {isCopying ? <Loader2 size={18} className="animate-spin" /> : <Filter size={18} />}
                 {isCopying ? "Menyalin..." : "Salin ke Clipboard"}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
