"use client";

import { useState } from "react";
import { toggleCheckboxPemberkasan, bulkToggleCheckboxPemberkasan, updateFileUrl } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, ChevronDown, ChevronUp, FileText, X, AlertCircle } from "lucide-react";

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
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [activeItemModal, setActiveItemModal] = useState<any | null>(null);
  const [itemModalView, setItemModalView] = useState<'MISSING' | 'ARSIP'>('MISSING');

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
        await updateFileUrl(recordId, data.secure_url);
        // Automatically check the item if not already checked
        await toggleCheckboxPemberkasan(recordId, true);
      } else {
        alert(data.error || "Gagal mengupload file");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
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

      {/* Summary Card Collapsible */}
      <div className="border-b border-primary-light/20 bg-white">
        <div 
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSummaryExpanded(!summaryExpanded)}
        >
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-primary text-sm flex items-center gap-2">
              <FileText size={16} /> Ringkasan Dokumen
            </h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {visibleItems.length} Dokumen
            </span>
          </div>
          {summaryExpanded ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
        </div>
        
        {summaryExpanded && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[35vh] overflow-y-auto custom-scrollbar">
            {visibleItems.map(item => {
              // Hitung jumlah santri yang BELUM lengkap untuk item ini
              const belumLengkap = santriList.filter(santri => {
                const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === item.id);
                return !record || !record.sudahDikumpulkan;
              }).length;

              return (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setActiveItemModal(item);
                    setItemModalView('MISSING');
                  }}
                  className="bg-white border border-primary-light/30 rounded-xl p-3 shadow-sm hover:shadow hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between min-h-[90px]"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary leading-tight text-xs flex-1" title={item.nama}>
                      {item.nama}
                    </h3>
                    {belumLengkap > 0 ? (
                      <span className="bg-danger/10 text-danger px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                        {belumLengkap} Kurang
                      </span>
                    ) : (
                      <span className="bg-success/10 text-success px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                        Lengkap
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-secondary flex justify-between items-center mt-auto">
                    <span className="truncate max-w-[120px]">{item.kategori === 'INDONESIA' ? 'Dalam Negeri' : 'Luar Negeri'}</span>
                    <span className="text-primary font-semibold flex items-center gap-1 hover:underline">
                      Detail <ChevronDown size={10} className="-rotate-90" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Modal (Popup Detail Ringkasan) */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95">
            <div className="p-4 border-b border-primary-light/20 flex justify-between items-center bg-bg-cream/30">
              <div>
                <h2 className="font-bold text-primary text-lg leading-tight">{activeItemModal.nama}</h2>
                <div className="flex gap-2 text-xs text-text-secondary mt-1">
                  <span>Kategori: {activeItemModal.kategori}</span>
                  <span>•</span>
                  <span>Wajib: {activeItemModal.isActive ? "Ya" : "Tidak"}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                   <button 
                     onClick={() => setItemModalView('MISSING')} 
                     className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium flex items-center gap-1.5 whitespace-nowrap ${itemModalView === 'MISSING' ? 'bg-white shadow text-danger font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     Belum Kumpul
                   </button>
                   <button 
                     onClick={() => setItemModalView('ARSIP')} 
                     className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium flex items-center gap-1.5 whitespace-nowrap ${itemModalView === 'ARSIP' ? 'bg-white shadow text-primary font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     <UploadCloud size={14}/> Arsip Dokumen
                   </button>
                </div>
                <button disabled={isLoading} onClick={() => setActiveItemModal(null)} className="text-text-secondary p-1 hover:text-danger rounded-lg transition-colors"><X size={24} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-50 shadow-sm z-10 text-xs">
                  <tr>
                    <th className="p-3 border-b border-primary-light/20">NIS / No. Urut</th>
                    <th className="p-3 border-b border-primary-light/20">Nama Santri</th>
                    <th className="p-3 border-b border-primary-light/20 text-center">Periode & Gelombang</th>
                    <th className="p-3 border-b border-primary-light/20 text-center">Status Lapor</th>
                    {itemModalView === 'ARSIP' && <th className="p-3 border-b border-primary-light/20 text-center">Aksi / File</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-light/10">
                  {santriList
                    .filter(santri => {
                      if (itemModalView === 'ARSIP') return true;
                      const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === activeItemModal.id);
                      return !record || !record.sudahDikumpulkan;
                    })
                    .map(santri => {
                      const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === activeItemModal.id);
                      const noUrut = santri.nomorUrut ? santri.nomorUrut : (santri.nis ? santri.nis.slice(-3) : '-');

                      return (
                        <tr key={santri.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-mono text-xs">{santri.nis || '-'}</div>
                            <div className="text-[10px] text-text-secondary mt-0.5">Urut: {noUrut}</div>
                          </td>
                          <td className="p-3 font-semibold text-text-primary text-xs">{santri.namaLengkap}</td>
                          <td className="p-3 text-center text-xs">
                             <div>{santri.gelombang?.periode?.nama || '-'}</div>
                             <div className="text-[10px] text-text-secondary">{santri.gelombang?.nama || '-'}</div>
                          </td>
                          <td className="p-3 text-center">
                            <label className={`inline-flex items-center gap-2 cursor-pointer ${isLoading ? 'opacity-50' : 'hover:bg-primary-light/10'} p-1.5 rounded transition-colors`}>
                              <input 
                                 type="checkbox" 
                                 checked={record?.sudahDikumpulkan || false}
                                 onChange={() => record && handleToggle(record.id, record.sudahDikumpulkan)}
                                 disabled={!record || isLoading}
                                 className="w-4 h-4 rounded border-gray-300 text-success focus:ring-success"
                              />
                              <span className="text-xs font-medium">{record?.sudahDikumpulkan ? 'Lengkap' : 'Kurang'}</span>
                            </label>
                          </td>
                          {itemModalView === 'ARSIP' && (
                            <td className="p-3 text-center">
                              {record ? (
                                <div className="flex flex-col items-center gap-2">
                                  {record.fileUrl ? (
                                    <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors">
                                      <span>Sudah Diupload</span> <CheckCircle2 size={12} />
                                    </a>
                                  ) : (
                                    <div className="text-[10px] text-text-secondary w-full">Belum Upload</div>
                                  )}
                                  
                                  <label className={`text-[10px] bg-primary text-white px-2 py-1 rounded cursor-pointer hover:bg-primary-dark transition-colors flex items-center justify-center gap-1 w-full max-w-[120px] ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <UploadCloud size={12} /> {record.fileUrl ? 'Ganti File' : 'Upload Dokumen'}
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => handleUploadFile(e, record.id, santri.namaLengkap, activeItemModal.nama)}
                                      disabled={isLoading}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-[10px] italic">No record</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {santriList.filter(santri => {
                      if (itemModalView === 'ARSIP') return true;
                      const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === activeItemModal.id);
                      return !record || !record.sudahDikumpulkan;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center bg-gray-50/50">
                          <CheckCircle2 size={32} className="mx-auto text-success/50 mb-2" />
                          <div className="text-success font-bold text-sm">Semua Santri Sudah Lengkap!</div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
              <th className="p-2 border-r border-primary-light/10 bg-[#f4f2eb] min-w-[70px]">No. Urut</th>
              <th className="p-2 border-r border-primary-light/10 bg-[#f4f2eb] min-w-[100px]">NIS</th>
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
                  <td className="p-2 border-r border-primary-light/10 bg-white group-hover:bg-[#faf9f5] font-mono font-bold text-text-secondary text-center">
                    {santri.nomorUrut || (santri.nis ? santri.nis.slice(-3) : '-')}
                  </td>
                  <td className="p-2 border-r border-primary-light/10 bg-white group-hover:bg-[#faf9f5] font-mono font-medium text-primary text-[11px] whitespace-nowrap">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/30 sticky left-0 z-10 bg-white group-hover:bg-[#faf9f5] font-semibold truncate min-w-[150px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]" title={santri.namaLengkap}>{santri.namaLengkap}</td>
                  
                  {visibleItems.map(item => {
                    const record = santri.pemberkasan.find((p: any) => p.itemPemberkasanId === item.id);
                    
                    if (record && record.sudahDikumpulkan) {
                      totalSelesai++;
                    } else if (item.isActive && !record?.sudahDikumpulkan) {
                      requiredItemsLeft++;
                    }

                    return (
                      <td key={item.id} className={`border-r border-primary-light/10 text-center transition-colors ${record?.sudahDikumpulkan ? 'bg-success/5 hover:bg-success/10' : 'bg-white hover:bg-gray-50'}`}>
                        {record ? (
                          <div className="flex flex-col items-center justify-between h-full p-2 gap-2">
                            <input 
                               type="checkbox" 
                               checked={record.sudahDikumpulkan}
                               onChange={() => !isLoading && handleToggle(record.id, record.sudahDikumpulkan)}
                               className="w-4 h-4 rounded border-gray-300 text-success focus:ring-success cursor-pointer disabled:opacity-50"
                               disabled={isLoading}
                            />
                            
                            <div className="w-full">
                              {!record.fileUrl ? (
                                <label className={`text-[9px] font-bold text-white bg-primary px-1.5 py-0.5 rounded cursor-pointer opacity-70 hover:opacity-100 flex items-center justify-center gap-1 w-full whitespace-nowrap ${isLoading ? 'pointer-events-none' : ''}`}>
                                   <UploadCloud size={10} /> Upload
                                   <input 
                                     type="file" 
                                     className="hidden" 
                                     accept=".pdf,.jpg,.jpeg,.png"
                                     onChange={(e) => handleUploadFile(e, record.id, santri.namaLengkap, item.nama)}
                                     disabled={isLoading}
                                   />
                                </label>
                              ) : (
                                <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded-full hover:bg-blue-100 whitespace-nowrap" title="Buka Dokumen">
                                  <span>Diupload ✓</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full p-2">
                            <span className="text-gray-300 text-[10px] italic">No record</span>
                          </div>
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
                <td colSpan={visibleItems.length + 4} className="p-8 text-center italic text-text-secondary bg-white">
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
