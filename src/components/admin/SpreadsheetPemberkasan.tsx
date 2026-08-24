"use client";

import { useState } from "react";
import { toggleCheckboxPemberkasan, bulkToggleCheckboxPemberkasan } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { useRouter } from "next/navigation";

export default function SpreadsheetPemberkasan({
  santriList,
  items,
  gelombangs,
  periodes,
  query,
  selectedGelombangId,
  selectedPeriodeId
}: {
  santriList: any[];
  items: any[];
  gelombangs: any[];
  periodes: any[];
  query: string;
  selectedGelombangId: string;
  selectedPeriodeId: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [filterKategori, setFilterKategori] = useState<"ALL" | "INDONESIA" | "MESIR">("ALL");

  const visibleItems = items.filter(i => filterKategori === "ALL" || i.kategori === filterKategori);
  
  const indoCount = visibleItems.filter(i => i.kategori === 'INDONESIA').length;
  const mesirCount = visibleItems.filter(i => i.kategori === 'MESIR').length;

  const handleToggle = async (pemberkasanId: string, currentStatus: boolean) => {
    setIsLoading(true);
    await toggleCheckboxPemberkasan(pemberkasanId, !currentStatus);
    setIsLoading(false);
  };

  const handleCheckAll = async (itemId: string) => {
    const idsToUpdate: string[] = [];
    for (const santri of santriList) {
      const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === itemId);
      if (record && !record.sudahDikumpulkan) {
        idsToUpdate.push(record.id);
      }
    }
    if (idsToUpdate.length === 0) return;
    setIsLoading(true);
    await bulkToggleCheckboxPemberkasan(idsToUpdate, true);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 flex flex-col h-[calc(100vh-12rem)] w-full max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">
      
      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-primary-light/20 flex flex-shrink-0 flex-wrap gap-4 items-center bg-bg-cream/30">
        <div className="flex gap-2">
          {/* PERIODE FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 text-sm outline-none bg-white font-medium text-text-secondary focus:border-primary max-w-[200px]"
            value={selectedPeriodeId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set('periodeId', e.target.value);
              else params.delete('periodeId');
              
              params.delete('gelombangId'); // reset gelombang when changing periode
              router.push(`/admin/pemberkasan?${params.toString()}`);
            }}
          >
            <option value="" disabled>Pilih Periode</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>

          {/* GELOMBANG FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 text-sm outline-none bg-white font-medium text-text-secondary focus:border-primary"
            value={selectedGelombangId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value !== "all") params.set('gelombangId', e.target.value);
              else params.delete('gelombangId');
              router.push(`/admin/pemberkasan?${params.toString()}`);
            }}
          >
            <option value="all">Semua Gelombang</option>
            {gelombangs.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>
        
        <select 
          className="px-3 py-2 bg-white border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm font-medium"
          value={filterKategori}
          onChange={(e: any) => setFilterKategori(e.target.value)}
        >
          <option value="ALL">Semua Kategori Berkas</option>
          <option value="INDONESIA">Dalam Negeri (INDONESIA)</option>
          <option value="MESIR">Luar Negeri (MESIR)</option>
        </select>

        <form className="relative flex-1 max-w-sm">
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Cari NIS atau Nama..." 
            className="w-full px-4 py-2 bg-white border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm"
          />
          <input type="hidden" name="gelombangId" value={selectedGelombangId} />
        </form>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 z-20 bg-primary/10 shadow-sm text-xs text-text-primary">
            {/* Header 1: Category Group */}
            <tr className="border-b border-primary-light/20">
              <th colSpan={2} className="p-2 border-r border-primary-light/20 bg-[#f4f2eb] text-center font-bold sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Data Santri</th>
              
              {indoCount > 0 && (
                <th colSpan={indoCount} className="p-2 border-r border-primary-light/20 text-center font-bold bg-blue-50 text-blue-800">Berkas Dalam Negeri (INDONESIA)</th>
              )}
              {mesirCount > 0 && (
                <th colSpan={mesirCount} className="p-2 border-r border-primary-light/20 text-center font-bold bg-amber-50 text-amber-800">Berkas Luar Negeri (MESIR)</th>
              )}
              
              <th className="p-2 bg-[#f4f2eb] text-center font-bold border-l border-primary-light/20">Summary</th>
            </tr>

            {/* Header 2: Item Names */}
            <tr className="border-b border-primary-light/20">
              <th className="p-2 border-r border-primary-light/10 bg-[#f4f2eb] min-w-[80px]">NIS</th>
              <th className="p-2 border-r border-primary-light/30 bg-[#f4f2eb] min-w-[150px] sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Nama</th>
              
              {visibleItems.map(item => (
                <th key={item.id} className="p-2 border-r border-primary-light/10 bg-[#f4f2eb] min-w-[100px] align-bottom group" title={item.nama}>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="truncate w-full font-medium pr-1 whitespace-normal break-words leading-tight">{item.nama}</span>
                    {item.isActive && <span className="bg-danger text-white text-[8px] px-1 rounded ml-1">WJB</span>}
                  </div>
                  <button 
                    onClick={() => handleCheckAll(item.id)}
                    disabled={isLoading}
                    className="mt-1.5 w-full text-[8px] bg-success/10 text-success hover:bg-success/20 border border-success/20 px-1 py-1 rounded transition-colors font-bold whitespace-nowrap outline-none disabled:opacity-50"
                  >
                    CHECK ALL
                  </button>
                </th>
              ))}

              <th className="p-2 border-l border-primary-light/20 bg-[#f4f2eb] min-w-[100px] text-center text-xs">Progress</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {santriList.map((santri: any) => {
              let totalSelesai = 0;
              let requiredItemsLeft = 0;

              return (
                <tr key={santri.id} className="border-b border-primary-light/10 hover:bg-[#faf9f5] transition-colors group">
                  <td className="p-2 border-r border-primary-light/10 bg-white group-hover:bg-[#faf9f5] font-mono font-medium text-primary">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/30 sticky left-0 z-10 bg-white group-hover:bg-[#faf9f5] font-semibold truncate min-w-[150px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">{santri.namaLengkap}</td>
                  
                  {visibleItems.map(item => {
                    const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === item.id);
                    
                    if (record && record.sudahDikumpulkan) {
                      totalSelesai++;
                    } else if (item.isActive && !record?.sudahDikumpulkan) {
                      requiredItemsLeft++;
                    }

                    return (
                      <td key={item.id} className={`p-2 border-r border-primary-light/10 text-center cursor-pointer transition-colors ${record?.sudahDikumpulkan ? 'bg-success/5 hover:bg-success/10' : 'bg-white hover:bg-gray-50'}`}>
                        {record ? (
                          <div className="flex justify-center items-center h-full w-full" onClick={() => !isLoading && handleToggle(record.id, record.sudahDikumpulkan)}>
                            <input 
                               type="checkbox" 
                               checked={record.sudahDikumpulkan}
                               readOnly
                               className="w-4 h-4 rounded text-success focus:ring-success cursor-pointer"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-300 text-[10px] italic">No master<br/>(sync)</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-2 border-l border-primary-light/20 bg-white group-hover:bg-[#faf9f5] text-center font-bold">
                    {requiredItemsLeft === 0 ? (
                      <span className="text-success">{totalSelesai} / {visibleItems.length} (OK)</span>
                    ) : (
                      <span className="text-danger">{totalSelesai} / {visibleItems.length}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            
            {santriList.length === 0 && (
              <tr>
                <td colSpan={visibleItems.length + 3} className="p-8 text-center italic text-text-secondary bg-white">
                  Belum ada data santri pada filter ini.
                </td>
              </tr>
            )}
            
            {items.length === 0 && santriList.length > 0 && (
               <tr>
                <td colSpan={20} className="p-8 text-center italic text-text-secondary bg-white">
                  Master item berkas masih kosong. Silakan setup di Halaman Master Item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
