"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { UploadCloud, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { toggleCheckboxProgres, updateProgresFileUrl } from "@/app/admin/(dashboard)/progres/actions";
import { useRouter } from "next/navigation";
import SearchAutocomplete from "@/components/admin/SearchAutocomplete";

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
  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set());
  const [optimisticData, setOptimisticData] = useState<Record<string, { selesai?: boolean; fileUrl?: string | null }>>({}); 
  const [isPending, startTransition] = useTransition();
  const [modalTahap, setModalTahap] = useState<any | null>(null);

  const tahapStats = useMemo(() => {
    const stats: Record<string, { selesai: any[], belum: any[] }> = {};
    tahaps.forEach(tahap => {
      stats[tahap.id] = { selesai: [], belum: [] };
    });
    
    santriList.forEach(santri => {
      tahaps.forEach(tahap => {
        const record = santri.progresSantri.find((p: any) => p.tahapProgresId === tahap.id);
        const opt = record ? optimisticData[record.id] : undefined;
        const isSelesai = opt?.selesai ?? record?.selesai ?? false;

        if (isSelesai) {
          stats[tahap.id].selesai.push(santri);
        } else {
          stats[tahap.id].belum.push(santri);
        }
      });
    });
    return stats;
  }, [santriList, tahaps, optimisticData]);

  const activeTahaps = tahaps.filter(t => t.isActive);
  const inactiveTahapsCount = tahaps.length - activeTahaps.length;

  const addLoading = (id: string) => setLoadingCells(prev => new Set(prev).add(id));
  const removeLoading = (id: string) => setLoadingCells(prev => { const next = new Set(prev); next.delete(id); return next; });

  const handleToggle = useCallback(async (progresSantriId: string, currentStatus: boolean) => {
    addLoading(progresSantriId);
    // Optimistic update
    setOptimisticData(prev => ({ ...prev, [progresSantriId]: { ...prev[progresSantriId], selesai: !currentStatus } }));
    try {
      await toggleCheckboxProgres(progresSantriId, !currentStatus);
      startTransition(() => router.refresh());
    } catch {
      // Revert on error
      setOptimisticData(prev => ({ ...prev, [progresSantriId]: { ...prev[progresSantriId], selesai: currentStatus } }));
    }
    removeLoading(progresSantriId);
  }, [router]);

  const handleUploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, recordId: string, santriName: string, documentName: string, gelombangNama?: string, periodeNama?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';

    addLoading(recordId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("santriName", santriName);
      formData.append("documentName", documentName);
      if (gelombangNama) formData.append("gelombangNama", gelombangNama);
      if (periodeNama) formData.append("periodeNama", periodeNama);

      const res = await fetch("/api/upload-drive", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.success && data.secure_url) {
        // Optimistic update: show uploaded state immediately
        setOptimisticData(prev => ({ ...prev, [recordId]: { selesai: true, fileUrl: data.secure_url } }));
        // Fire server actions without blocking UI
        await Promise.all([
          updateProgresFileUrl(recordId, data.secure_url),
          toggleCheckboxProgres(recordId, true)
        ]);
        startTransition(() => router.refresh());
      } else {
        alert(data.error || "Gagal mengupload file");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
    removeLoading(recordId);
  }, [router]);

  const handleDeleteFile = useCallback(async (recordId: string) => {
    if (!confirm("Yakin ingin menghapus dokumen ini? File di Google Drive juga akan ikut terhapus.")) return;

    addLoading(recordId);
    try {
      setOptimisticData(prev => ({ ...prev, [recordId]: { ...prev[recordId], fileUrl: null } }));
      await updateProgresFileUrl(recordId, null);
      startTransition(() => router.refresh());
    } catch (err: any) {
      alert("Gagal menghapus dokumen: " + err.message);
      // Revert optimistic delete on error (if previous fileUrl was saved somewhere)
    }
    removeLoading(recordId);
  }, [router]);

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
              if (e.target.value) {
                params.set('periodeId', e.target.value);
                document.cookie = `admin_active_periode=${e.target.value}; path=/; max-age=31536000`;
              }
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
              if (e.target.value) params.set('gelombangId', e.target.value);
              router.push(`/admin/progres?${params.toString()}`);
            }}
          >
            <option value="all">Semua Gelombang</option>
            {gelombangs.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>
        
        <SearchAutocomplete 
          periodeId={selectedPeriodeId} 
          currentQuery={query}
        />
      </div>

      {/* Summary Cards */}
      {tahaps.length > 0 && santriList.length > 0 && (
        <div className="flex gap-4 overflow-x-auto p-4 border-b border-primary-light/10 dark:border-gray-800 custom-scrollbar bg-bg-cream/50 dark:bg-gray-800/20">
          {tahaps.map(tahap => {
            const stat = tahapStats[tahap.id];
            const total = stat.selesai.length + stat.belum.length;
            const progress = total === 0 ? 0 : Math.round((stat.selesai.length / total) * 100);
            
            return (
              <div 
                key={tahap.id} 
                onClick={() => setModalTahap(tahap)}
                className="flex-shrink-0 w-60 bg-white dark:bg-gray-900 border border-primary-light/20 dark:border-gray-700 rounded-xl p-3 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-sm text-text-primary dark:text-gray-100 truncate" title={tahap.nama}>{tahap.nama}</h3>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-success font-semibold">Selesai: {stat.selesai.length}</span>
                  <span className="text-danger font-semibold">Belum: {stat.belum.length}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-success h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                    const opt = record ? optimisticData[record.id] : undefined;
                    const isSelesai = opt?.selesai ?? record?.selesai ?? false;
                    const cellFileUrl = opt?.fileUrl ?? record?.fileUrl ?? null;
                    const cellLoading = record ? loadingCells.has(record.id) : false;
                    
                    if (isSelesai) {
                      totalSelesai++;
                    }
                    if (tahap.isActive) {
                      activeRequiredCount++;
                    }

                    return (
                      <td key={tahap.id} className={`p-2 border-r border-primary-light/10 dark:border-gray-700 text-center transition-colors ${isSelesai ? 'bg-success/5 hover:bg-success/10' : (!tahap.isActive ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:bg-gray-800')}`}>
                        {record ? (
                          <div className="flex flex-col items-center justify-between h-full p-1 gap-2">
                            {cellLoading ? (
                              <Loader2 size={16} className="animate-spin text-primary" />
                            ) : (
                              <input 
                                 type="checkbox" 
                                 checked={isSelesai}
                                 onChange={() => handleToggle(record.id, isSelesai)}
                                 className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-success focus:ring-success cursor-pointer"
                              />
                            )}
                            
                            <div className="w-full">
                              {!cellFileUrl ? (
                                <label className={`text-xs font-bold text-white bg-primary px-1.5 py-0.5 rounded cursor-pointer opacity-70 hover:opacity-100 flex items-center justify-center gap-1 w-full whitespace-nowrap ${cellLoading ? 'pointer-events-none opacity-50' : ''}`}>
                                   <UploadCloud size={10} /> Upload
                                   <input 
                                     type="file" 
                                     className="hidden" 
                                     accept=".pdf,.jpg,.jpeg,.png"
                                     onChange={(e) => handleUploadFile(e, record.id, santri.namaLengkap, tahap.nama, santri.gelombang?.nama, santri.gelombang?.periode?.nama)}
                                     disabled={cellLoading}
                                   />
                                </label>
                              ) : (
                                <div className="flex items-stretch justify-center h-full gap-0.5">
                                  <a href={cellFileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded-l-md hover:bg-blue-100 whitespace-nowrap min-w-0" title="Buka Dokumen">
                                    <span className="truncate">Diupload ✓</span>
                                  </a>
                                  <button 
                                    onClick={() => handleDeleteFile(record.id)}
                                    disabled={cellLoading}
                                    title="Hapus Dokumen"
                                    className="bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger-dark px-1.5 py-0.5 rounded-r-md transition-colors disabled:opacity-50 flex items-center justify-center"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
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

      {modalTahap && (
        <ProgresStatsModal
          tahap={modalTahap}
          stats={tahapStats[modalTahap.id]}
          onClose={() => setModalTahap(null)}
          optimisticData={optimisticData}
          loadingCells={loadingCells}
          handleToggle={handleToggle}
          handleUploadFile={handleUploadFile}
          handleDeleteFile={handleDeleteFile}
        />
      )}
    </div>
  );
}

function ProgresStatsModal({ 
  tahap, 
  stats, 
  onClose,
  optimisticData,
  loadingCells,
  handleToggle,
  handleUploadFile,
  handleDeleteFile
}: { 
  tahap: any, 
  stats: { selesai: any[], belum: any[] },
  onClose: () => void,
  optimisticData: Record<string, any>,
  loadingCells: Set<string>,
  handleToggle: (id: string, current: boolean) => void,
  handleUploadFile: (e: any, id: string, santriName: string, docName: string, gName?: string, pName?: string) => void,
  handleDeleteFile: (id: string) => void
}) {
  const [tab, setTab] = useState<'SELESAI' | 'BELUM'>('SELESAI');
  const list = tab === 'SELESAI' ? stats.selesai : stats.belum;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-heading font-bold text-gray-800 dark:text-gray-100 pr-4">{tahap.nama}</h2>
            <p className="text-xs text-text-secondary mt-0.5">Daftar santri pada progres ini</p>
          </div>
          <button onClick={onClose} className="p-2 shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700 text-sm">
          <button 
             onClick={() => setTab('SELESAI')}
             className={`flex-1 py-3 font-semibold text-center transition-colors ${tab === 'SELESAI' ? 'text-success border-b-2 border-success bg-success/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Selesai ({stats.selesai.length})
          </button>
          <button 
             onClick={() => setTab('BELUM')}
             className={`flex-1 py-3 font-semibold text-center transition-colors ${tab === 'BELUM' ? 'text-danger border-b-2 border-danger bg-danger/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Belum ({stats.belum.length})
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 h-full">
              <CheckCircle2 size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">Kosong</p>
              <p className="text-xs">Tidak ada santri dengan status ini pada filter tabel aktif.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((s: any, idx: number) => {
                const record = s.progresSantri.find((p: any) => p.tahapProgresId === tahap.id);
                const opt = record ? optimisticData[record.id] : undefined;
                const isSelesai = opt?.selesai ?? record?.selesai ?? false;
                const cellFileUrl = opt?.fileUrl ?? record?.fileUrl ?? null;
                const cellLoading = record ? loadingCells.has(record.id) : false;

                return (
                  <li key={s.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="font-mono text-xs font-bold text-gray-400 w-6 text-right mt-0.5">{idx + 1}.</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate w-full" title={s.namaLengkap}>{s.namaLengkap}</div>
                      <div className="text-xs text-primary font-mono font-medium mt-0.5">{s.nis || s.noPendaftaran}</div>
                    </div>
                    
                    {record && (
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <label className={`inline-flex items-center gap-2 cursor-pointer ${cellLoading ? 'opacity-50' : 'hover:bg-primary-light/10'} p-1.5 rounded transition-colors`}>
                          {cellLoading ? (
                            <Loader2 size={16} className="animate-spin text-primary" />
                          ) : (
                            <input 
                               type="checkbox" 
                               checked={isSelesai}
                               onChange={() => handleToggle(record.id, isSelesai)}
                               className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-success focus:ring-success"
                            />
                          )}
                        </label>
                        
                        <div className="flex items-center w-[120px] sm:w-[150px] justify-end">
                          {!cellFileUrl ? (
                            <label className={`text-xs font-bold text-white bg-primary px-2 py-1 rounded cursor-pointer opacity-80 hover:opacity-100 flex items-center justify-center gap-1 w-full max-w-[120px] whitespace-nowrap ${cellLoading ? 'pointer-events-none opacity-50' : ''}`}>
                               <UploadCloud size={12} className="shrink-0" /> <span className="hidden sm:inline">Upload</span>
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept=".pdf,.jpg,.jpeg,.png"
                                 onChange={(e) => handleUploadFile(e, record.id, s.namaLengkap, tahap.nama, s.gelombang?.nama, s.gelombang?.periode?.nama)}
                                 disabled={cellLoading}
                               />
                            </label>
                          ) : (
                            <div className="flex items-stretch justify-center h-full gap-0.5 w-full">
                              <a href={cellFileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-l-md hover:bg-blue-100 whitespace-nowrap min-w-0" title="Buka Dokumen">
                                <span className="truncate hidden sm:inline">Diupload</span> <CheckCircle2 size={12} className="shrink-0" />
                              </a>
                              <button 
                                onClick={() => handleDeleteFile(record.id)}
                                disabled={cellLoading}
                                title="Hapus Dokumen"
                                className="bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger-dark px-2 py-1.5 rounded-r-md transition-colors disabled:opacity-50 flex items-center justify-center border-l border-white shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
