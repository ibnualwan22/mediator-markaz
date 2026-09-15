"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Eye, FileSpreadsheet, Loader2 } from "lucide-react";
import ImportExcelModal from "./ImportExcelModal";
import { useRouter } from "next/navigation";

export default function SantriTable({ santriList, gelombangList }: { santriList: any[], gelombangList: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGelombang, setFilterGelombang] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUrutModal, setShowUrutModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const [isCopying, setIsCopying] = useState(false);

  const filteredData = santriList.filter(s => {
    const matchSearch = s.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.noPendaftaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchGelombang = filterGelombang ? s.gelombangId === filterGelombang : true;

    return matchSearch && matchGelombang;
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = new URL("/api/admin/santri/export", window.location.origin);
      if (searchTerm) url.searchParams.set("search", searchTerm);
      if (filterGelombang) url.searchParams.set("gelombangId", filterGelombang);
      
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
    setIsCopying(true);
    let copyText = "Data santri yang data dirinya belum lengkap\n";
    let incompleteCount = 0;

    filteredData.forEach((s, idx) => {
      const missingFields: string[] = [];

      // Check default text fields
      if (!s.namaArab || s.namaArab === "-" || s.namaArab === "") missingFields.push("Nama Arab");
      if (!s.asalProvinsi || s.asalProvinsi === "-" || s.asalProvinsi === "") missingFields.push("Asal Provinsi");
      if (!s.email || s.email === "-" || s.email === "") missingFields.push("Email");
      if (!s.noWaSantri || s.noWaSantri === "-" || s.noWaSantri === "") missingFields.push("No. WA Santri");
      if (!s.namaWali || s.namaWali === "-" || s.namaWali === "") missingFields.push("Nama Wali");
      if (!s.noWaWali || s.noWaWali === "-" || s.noWaWali === "") missingFields.push("No. WA Wali");

      // Check Akademik
      // if riwayatAkademik is LAINNYA, then riwayatAkademikLainnya should not be empty
      if (s.riwayatAkademik === "LAINNYA" && (!s.riwayatAkademikLainnya || s.riwayatAkademikLainnya === "-" || s.riwayatAkademikLainnya === "")) {
        missingFields.push("Pendidikan Terakhir (Lainnya)");
      }
      if (!s.tahunKelulusan || s.tahunKelulusan === 0) missingFields.push("Tahun Kelulusan");

      // Check Foto Profil (Profil Santri)
      if (!s.fotoProfil || s.fotoProfil === "-" || s.fotoProfil === "") missingFields.push("Foto Profil (Backgroun Merah)");

      // Check Paspor
      if (!s.nomorPaspor || s.nomorPaspor === "-" || s.nomorPaspor === "") missingFields.push("Nomor Paspor");

      if (missingFields.length > 0) {
        incompleteCount++;
        copyText += `${incompleteCount}. ${s.namaLengkap}\n`;
        missingFields.forEach(field => {
          copyText += `- ${field}\n`;
        });
      }
    });

    if (incompleteCount === 0) {
      alert("Semua santri pada filter ini sudah memiliki data lengkap.");
      setIsCopying(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      alert(`Berhasil menyalin ${incompleteCount} santri dengan data belum lengkap ke clipboard!`);
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
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama, No. Daftar, NIC..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-cream dark:bg-gray-800 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleCopyIncompleteData}
            disabled={isCopying}
            className={`flex items-center justify-center gap-2 px-4 py-2 ${isCopying ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-200'} rounded-lg transition-all text-sm font-semibold whitespace-nowrap`}
            title="Salin santri dengan profil belum lengkap"
          >
            <Filter size={16} /> {isCopying ? "Menyalin..." : "Salin Data Kosong"}
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
          <Filter size={18} className="text-text-secondary dark:text-gray-400" />
          <select
            value={filterGelombang}
            onChange={e => setFilterGelombang(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-bg-cream dark:bg-gray-800 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
          >
            <option value="">Semua Gelombang</option>
            {gelombangList.map(g => (
              <option key={g.id} value={g.id}>{g.periode.nama} - {g.nama}</option>
            ))}
          </select>
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
            {filteredData.length > 0 ? filteredData.map((s, index) => (
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
        gelombangList={gelombangList}
        onSuccess={() => {
          setShowImportModal(false);
          router.refresh();
        }}
        showGelombang={false}
      />

      <ImportExcelModal
        isOpen={showUrutModal}
        onClose={() => setShowUrutModal(false)}
        gelombangList={gelombangList}
        onSuccess={() => {
          setShowUrutModal(false);
          router.refresh();
        }}
        uploadUrl="/api/admin/santri/nis/import"
        templateUrl="/api/admin/santri/nis/template"
        showGelombang={false}
      />
    </div>
  );
}
