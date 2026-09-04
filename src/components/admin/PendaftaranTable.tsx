"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Eye } from "lucide-react";
import VerifyButton from "./VerifyButton";
import { useRouter } from "next/navigation";

export default function PendaftaranTable({ pendaftarList, gelombangList }: { pendaftarList: any[], gelombangList: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGelombang, setFilterGelombang] = useState("");
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
                  <div className="flex justify-center items-center gap-2">
                    <Link 
                      href={`/admin/santri/${s.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-primary-light/40 dark:border-gray-700 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors text-xs font-medium"
                    >
                      <Eye size={14} /> Detail
                    </Link>
                    <VerifyButton santriId={s.id} isVerified={s.isVerified} />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-secondary dark:text-gray-400 italic">
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
