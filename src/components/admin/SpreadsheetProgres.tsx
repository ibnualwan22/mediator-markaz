"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { toggleCheckboxProgres, updateProgresFileUrl } from "@/app/admin/(dashboard)/progres/actions";
import { useRouter } from "next/navigation";

export default function SpreadsheetProgres({
  santriList,
  tahaps,
  gelombangs,
  periodes,
  query,
  selectedGelombangId,
  selectedPeriodeId
}: {
  santriList: any[];
  tahaps: any[];
  gelombangs: any[];
  periodes: any[];
  query: string;
  selectedGelombangId: string;
  selectedPeriodeId: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const activeTahaps = tahaps.filter(t => t.isActive);
  const inactiveTahapsCount = tahaps.length - activeTahaps.length;

  const handleToggle = async (progresSantriId: string, currentStatus: boolean) => {
    setIsLoading(true);
    await toggleCheckboxProgres(progresSantriId, !currentStatus);
    setIsLoading(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, recordId: string, santriName: string, documentName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("santriName", santriName);
      formData.append("documentName", documentName);

      const res = await fetch("/api/upload-drive", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.success && data.secure_url) {
        await updateProgresFileUrl(recordId, data.secure_url);
        // Automatically check the item if not already checked
        await toggleCheckboxProgres(recordId, true);
      } else {
        alert(data.error || "Gagal mengupload file");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 flex flex-col h-[calc(100vh-12rem)] w-full max-w-full lg:max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">
      
      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-primary-light/20 dark:border-gray-700 flex flex-shrink-0 flex-wrap gap-4 items-center bg-bg-cream dark:bg-gray-800/30 justify-between">
        <div className="flex gap-2">
          {/* PERIODE FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary max-w-[200px]"
            value={selectedPeriodeId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set('periodeId', e.target.value);
              else params.delete('periodeId');
              
              params.delete('gelombangId'); // reset gelombang when changing periode
              router.push(`/admin/progres?${params.toString()}`);
            }}
          >
            <option value="" disabled>Pilih Periode</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>

          {/* GELOMBANG FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary"
            value={selectedGelombangId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value !== "all") params.set('gelombangId', e.target.value);
              else params.delete('gelombangId');
              router.push(`/admin/progres?${params.toString()}`);
            }}
          >
            <option value="all">Semua Gelombang</option>
            {gelombangs.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>
        
        <form className="relative flex-1 max-w-sm">
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Cari NIC atau Nama..." 
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
          />
          <input type="hidden" name="gelombangId" value={selectedGelombangId} />
        </form>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 z-20 bg-primary/10 shadow-sm text-sm text-text-primary dark:text-gray-100">
            {/* Header 1: Category Group */}
            <tr className="border-b border-primary-light/20 dark:border-gray-700">
              <th colSpan={2} className="p-2 border-r border-primary-light/20 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 text-center font-bold sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Data Camaba</th>
              
              {activeTahaps.length > 0 && (
                <th colSpan={activeTahaps.length} className="p-2 border-r border-primary-light/20 dark:border-gray-700 text-center font-bold bg-green-50 text-green-800">Tahap Akademik Aktif</th>
              )}
              {inactiveTahapsCount > 0 && (
                <th colSpan={inactiveTahapsCount} className="p-2 border-r border-primary-light/20 dark:border-gray-700 text-center font-bold bg-gray-50 dark:bg-gray-800 text-gray-500">Tahap Non-Aktif (Legacy)</th>
              )}
              
              <th className="p-2 bg-[#f4f2eb] dark:bg-gray-800 text-center font-bold border-l border-primary-light/20 dark:border-gray-700">Summary</th>
            </tr>

            {/* Header 2: Item Names */}
            <tr className="border-b border-primary-light/20 dark:border-gray-700">
              <th className="p-2 border-r border-primary-light/10 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[80px] sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">NIC</th>
              <th className="p-2 border-r border-primary-light/30 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[150px] sticky left-[80px] z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Nama</th>
              
              {tahaps.map(tahap => (
                <th key={tahap.id} className={`p-2 border-r border-primary-light/10 dark:border-gray-700 min-w-[100px] align-bottom ${tahap.isActive ? 'bg-[#f4f2eb] dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`} title={tahap.nama}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="truncate w-full font-medium pr-1 whitespace-normal break-words leading-tight">{tahap.nama}</span>
                  </div>
                </th>
              ))}

              <th className="p-2 border-l border-primary-light/20 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[100px] text-center text-xs">Penyelesaian</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {santriList.map((santri: any) => {
              let totalSelesai = 0;
              let activeRequiredCount = 0;

              return (
                <tr key={santri.id} className="border-b border-primary-light/10 dark:border-gray-700 hover:bg-[#faf9f5] dark:bg-gray-800 transition-colors group">
                  <td className="p-2 border-r border-primary-light/10 dark:border-gray-700 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 font-mono font-bold text-primary whitespace-nowrap px-3 sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/30 dark:border-gray-700 sticky left-[80px] z-10 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 font-bold text-sm truncate min-w-[170px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">{santri.namaLengkap}</td>
                  
                  {tahaps.map(tahap => {
                    const record = santri.progresSantri.find((p: any) => p.tahapProgresId === tahap.id);
                    
                    if (record && record.selesai) {
                      totalSelesai++;
                    }
                    if (tahap.isActive) {
                      activeRequiredCount++;
                    }

                    return (
                      <td key={tahap.id} className={`p-2 border-r border-primary-light/10 dark:border-gray-700 text-center transition-colors ${record?.selesai ? 'bg-success/5 hover:bg-success/10' : (!tahap.isActive ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:bg-gray-800')}`}>
                        {record ? (
                          <div className="flex flex-col items-center justify-between h-full p-1 gap-2">
                            <input 
                               type="checkbox" 
                               checked={record.selesai}
                               onChange={() => !isLoading && handleToggle(record.id, record.selesai)}
                               className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-success focus:ring-success cursor-pointer disabled:opacity-50"
                               disabled={isLoading}
                            />
                            
                            <div className="w-full">
                              {!record.fileUrl ? (
                                <label className={`text-xs font-bold text-white bg-primary px-1.5 py-0.5 rounded cursor-pointer opacity-70 hover:opacity-100 flex items-center justify-center gap-1 w-full whitespace-nowrap ${isLoading ? 'pointer-events-none' : ''}`}>
                                   <UploadCloud size={10} /> Upload
                                   <input 
                                     type="file" 
                                     className="hidden" 
                                     accept=".pdf,.jpg,.jpeg,.png"
                                     onChange={(e) => handleUploadFile(e, record.id, santri.namaLengkap, tahap.nama)}
                                     disabled={isLoading}
                                   />
                                </label>
                              ) : (
                                <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded-full hover:bg-blue-100 whitespace-nowrap" title="Buka Dokumen">
                                  <span>Diupload ✓</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full p-2">
                            <span className="text-gray-300 text-xs italic">{tahap.isActive ? 'No master (sync)' : '-'}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-2 border-l border-primary-light/20 dark:border-gray-700 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 text-center font-bold">
                    <span className="text-primary">{totalSelesai} / {activeRequiredCount}</span>
                  </td>
                </tr>
              )
            })}
            
            {santriList.length === 0 && (
              <tr>
                <td colSpan={tahaps.length + 3} className="p-8 text-center italic text-text-secondary dark:text-gray-400 bg-white dark:bg-gray-900">
                  Belum ada data camaba pada filter ini.
                </td>
              </tr>
            )}
            
            {tahaps.length === 0 && santriList.length > 0 && (
               <tr>
                <td colSpan={20} className="p-8 text-center italic text-text-secondary dark:text-gray-400 bg-white dark:bg-gray-900">
                  Master tahap progres akademik masih kosong. Silakan setup di Halaman Master Progres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
