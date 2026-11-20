"use client";

import { useState } from "react";
import { Search, Filter, FileText } from "lucide-react";
import VerifyButton from "./VerifyButton";
import { useRouter } from "next/navigation";

function statusBadge(status: string | null) {
  if (status === "DITERIMA")
    return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Diterima</span>;
  if (status === "DITOLAK")
    return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Ditolak</span>;
  return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Menunggu Konfirmasi</span>;
}

export default function PendaftaranTable({ pendaftarList, gelombangList }: { pendaftarList: any[], gelombangList: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGelombang, setFilterGelombang] = useState("");
  // ID santri yang gambar buktinya gagal dimuat (mis. buktinya PDF, bukan gambar).
  const [thumbFailed, setThumbFailed] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filteredData = pendaftarList.filter(s => {
    const matchSearch = s.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.noPendaftaran.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchGelombang = filterGelombang ? s.gelombangId === filterGelombang : true;
    
    return matchSearch && matchGelombang;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-primary-light/20 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari nama, No. Daftar..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-cream dark:bg-gray-800 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">No. Pendaftaran</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Nama Lengkap</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Gelombang</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Tanggal Daftar</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700">Bukti Pembayaran</th>
              <th className="p-4 font-semibold border-b border-primary-light/20 dark:border-gray-700 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredData.length > 0 ? filteredData.map((s, index) => (
              <tr key={s.id} className="border-b border-primary-light/10 dark:border-gray-700 hover:bg-bg-cream dark:bg-gray-800 transition-colors">
                <td className="p-4 text-center font-medium text-text-secondary dark:text-gray-400">{index + 1}</td>
                <td className="p-4">
                  <div className="font-mono font-medium text-primary">{s.noPendaftaran}</div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-text-primary dark:text-gray-100">{s.namaLengkap}</div>
                  <div className="text-text-secondary dark:text-gray-400 text-xs mt-1">{s.noWaSantri}</div>
                </td>
                <td className="p-4 text-text-secondary dark:text-gray-400">
                  {s.gelombang.periode.nama} <br/> <span className="font-medium text-xs border rounded px-1.5 py-0.5 mt-1 inline-block bg-white dark:bg-gray-900">{s.gelombang.nama}</span>
                </td>
                <td className="p-4 text-text-secondary dark:text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </td>
                <td className="p-4">
                  {s.fileBuktiPembayaran ? (
                    <div className="flex flex-col items-start gap-1.5">
                      {thumbFailed.has(s.id) ? (
                        <a
                          href={s.fileBuktiPembayaran}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-36 h-24 flex flex-col items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 border border-primary-light/30 rounded-lg text-text-secondary hover:ring-2 hover:ring-primary/50 transition-shadow"
                        >
                          <FileText size={20} />
                          <span className="text-xs font-medium">Dokumen (PDF)</span>
                          <span className="text-primary underline text-[11px]">Buka di Drive</span>
                        </a>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/admin/santri/${s.id}/bukti`}
                          alt={`Bukti pembayaran ${s.namaLengkap}`}
                          loading="lazy"
                          className="w-36 max-h-44 object-contain bg-gray-50 dark:bg-gray-800 border border-primary-light/30 rounded-lg"
                          onError={() =>
                            setThumbFailed((prev) => {
                              const next = new Set(prev);
                              next.add(s.id);
                              return next;
                            })
                          }
                        />
                      )}
                      {statusBadge(s.buktiPembayaranStatus)}
                    </div>
                  ) : (
                    <span className="text-text-secondary dark:text-gray-400 text-xs italic">Belum upload bukti</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-center items-center gap-2">
                    <VerifyButton santriId={s.id} isVerified={s.isVerified} buktiPembayaranStatus={s.buktiPembayaranStatus} hasBuktiPembayaran={!!s.fileBuktiPembayaran} />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-secondary dark:text-gray-400 italic">
                  Tidak ada pendaftar baru yang belum diverifikasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
