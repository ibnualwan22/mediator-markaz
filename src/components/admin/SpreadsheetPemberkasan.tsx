"use client";

import { useState } from "react";
import { toggleCheckboxPemberkasan } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { useRouter } from "next/navigation";

export default function SpreadsheetPemberkasan({
  santriList,
  items,
  gelombangs,
  query,
  selectedGelombangId
}: {
  santriList: any[],
  items: any[],
  gelombangs: any[],
  query: string,
  selectedGelombangId: string
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
      
      {/* Filter Bar */}
      <div className="p-4 border-b border-primary-light/20 flex flex-wrap gap-4 items-center bg-bg-cream/30">
        <select 
          className="px-3 py-2 bg-white border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm"
          value={selectedGelombangId}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            params.set("gelombangId", e.target.value);
            router.push(`?${params.toString()}`);
          }}
        >
          {gelombangs.length === 0 && <option value="">Semua Gelombang</option>}
          {gelombangs.map(g => (
            <option key={g.id} value={g.id}>{g.nama}</option>
          ))}
        </select>
        
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
              <th colSpan={2} className="p-2 border-r border-primary-light/20 sticky left-0 z-30 bg-primary/20 text-center font-bold">Data Santri</th>
              
              {indoCount > 0 && (
                <th colSpan={indoCount} className="p-2 border-r border-primary-light/20 text-center font-bold bg-blue-50 text-blue-800">Berkas Dalam Negeri (INDONESIA)</th>
              )}
              {mesirCount > 0 && (
                <th colSpan={mesirCount} className="p-2 border-r border-primary-light/20 text-center font-bold bg-amber-50 text-amber-800">Berkas Luar Negeri (MESIR)</th>
              )}
              
              <th className="p-2 sticky right-0 z-30 bg-primary/20 text-center font-bold border-l border-primary-light/20">Summary</th>
            </tr>

            {/* Header 2: Item Names */}
            <tr className="border-b border-primary-light/20">
              <th className="p-2 border-r border-primary-light/10 sticky left-0 z-30 bg-primary/5 min-w-[80px]">NIS</th>
              <th className="p-2 border-r border-primary-light/30 sticky left-[80px] z-30 bg-primary/10 backdrop-blur min-w-[150px]">Nama</th>
              
              {visibleItems.map(item => (
                <th key={item.id} className="p-2 border-r border-primary-light/10 min-w-[100px] align-bottom" title={item.nama}>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="truncate w-full font-medium pr-1">{item.nama}</span>
                    {item.isActive && <span className="bg-danger text-white text-[8px] px-1 rounded">WJB</span>}
                  </div>
                </th>
              ))}

              <th className="p-2 border-l border-primary-light/20 sticky right-0 z-30 bg-primary/10 min-w-[100px] text-center text-xs">Progress</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {santriList.map((santri: any) => {
              let totalSelesai = 0;
              let requiredItemsLeft = 0;

              return (
                <tr key={santri.id} className="border-b border-primary-light/10 hover:bg-bg-cream/50 group">
                  <td className="p-2 border-r border-primary-light/10 sticky left-0 z-10 bg-white group-hover:bg-bg-cream font-mono font-medium text-primary">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/30 sticky left-[80px] z-10 bg-white/90 group-hover:bg-bg-cream/90 font-semibold truncate max-w-[150px]">{santri.namaLengkap}</td>
                  
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

                  <td className="p-2 border-l border-primary-light/20 sticky right-0 z-10 bg-white group-hover:bg-bg-cream text-center font-bold">
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
