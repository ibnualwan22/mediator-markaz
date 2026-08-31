"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignLevelDL, updatePembayaranDL,
  updateStatusUjianDL, updateSettingDL,
  generateNextLevelDL, resetAllLevelDL,
  bulkUpdateStatusLulusDL, undoStatusUjianDL, deleteAttemptDL
} from "@/app/admin/(dashboard)/darul-lughoh/actions";
import { Settings, Save, AlertTriangle, CheckCircle2, Upload, Download, RotateCcw, Trash2 } from "lucide-react";
import ImportExcelModal from "./ImportExcelModal";
import Swal from "sweetalert2";

export default function SpreadsheetDarulLughoh({
  santriList,
  gelombangs,
  periodes,
  query,
  selectedGelombangId,
  selectedPeriodeId,
  setting
}: {
  santriList: any[],
  gelombangs: any[],
  periodes: any[],
  query: string,
  selectedGelombangId: string,
  selectedPeriodeId: string,
  setting: any
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [nominalSetting, setNominalSetting] = useState(setting.nominalPerLevel);

  // Local state for cicilan inputs
  const [localCicilan, setLocalCicilan] = useState<Record<string, number>>({});

  const levels = [1, 2, 3, 4, 5, 6];

  const handleSaveSettings = async () => {
    setIsLoading(true);
    await updateSettingDL(nominalSetting);
    setShowSettings(false);
    setIsLoading(false);
    Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleAssignLevel = async (santriId: string, level: number) => {
    setIsLoading(true);
    await assignLevelDL(santriId, level);
    setIsLoading(false);
    Swal.fire({ title: 'Level Di-assign!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleStatusChange = async (dlId: string, status: "LULUS" | "REMIDI") => {
    const confirmRes = await Swal.fire({
      title: 'Konfirmasi',
      text: `Set status menjadi ${status}? ${status === 'REMIDI' ? 'Ini akan membuat tagihan percobaan baru di level yang sama.' : ''}`,
      icon: 'question',
      showCancelButton: true
    });
    if (!confirmRes.isConfirmed) return;
    
    setIsLoading(true);
    await updateStatusUjianDL(dlId, status);
    setIsLoading(false);
    Swal.fire({ title: `Status Menjadi ${status}!`, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleCicilanChange = (dlId: string, value: string) => {
    const val = value ? parseInt(value) : 0;
    setLocalCicilan(prev => ({ ...prev, [dlId]: val }));
  };

  const handleBlurCicilan = async (dlId: string, currentVal: number, originalVal: number) => {
    if (currentVal === originalVal) return;
    setIsLoading(true);
    await updatePembayaranDL(dlId, currentVal);
    setIsLoading(false);
    setLocalCicilan(prev => {
      const next = { ...prev };
      delete next[dlId];
      return next;
    });
  };

  const handleResetDL = async (santriId: string, nama: string) => {
    const confirmRes = await Swal.fire({
      title: 'Reset Histori?',
      text: `Yakin ingin mereset dan menghapus seluruh histori level Darul Lughoh untuk santri ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Reset!'
    });
    if (!confirmRes.isConfirmed) return;
    
    setIsLoading(true);
    await resetAllLevelDL(santriId);
    setIsLoading(false);
    Swal.fire({ title: 'Telah Direset!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleBulkLulus = async (lvl: number) => {
    const idsToLulus: string[] = [];
    santriList.forEach(santri => {
      const attempts = santri.darulLughoh
        .filter((d: any) => d.level === lvl)
        .sort((a: any, b: any) => b.percobaan - a.percobaan);
      if (attempts.length > 0) {
        const latestAttempt = attempts[0];
        if (latestAttempt.statusUjian === 'BELUM_UJIAN') {
          idsToLulus.push(latestAttempt.id);
        }
      }
    });

    if (idsToLulus.length === 0) {
      Swal.fire({ title: 'Tidak ada santri!', text: `Tidak ada santri yang berstatus BELUM_UJIAN di level ${lvl}.`, icon: 'info' });
      return;
    }

    const confirmRes = await Swal.fire({
      title: 'Luluskan Semua?',
      text: `Ada ${idsToLulus.length} santri yang akan diluluskan pada level ${lvl}. Yakin?`,
      icon: 'question',
      showCancelButton: true
    });
    if (!confirmRes.isConfirmed) return;

    setIsLoading(true);
    await bulkUpdateStatusLulusDL(idsToLulus);
    setIsLoading(false);
    Swal.fire({ title: 'Berhasil!', text: `${idsToLulus.length} santri berhasil diluluskan.`, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleUndoStatus = async (attempt: any) => {
    const confirmRes = await Swal.fire({
      title: 'Undo Status?',
      text: `Yakin membatalkan status Lulus/Remidi pada level ini? Aksi ini juga akan menghapus level di atasnya yang sudah otomatis terbuat sebelumnya.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33'
    });
    if (!confirmRes.isConfirmed) return;

    setIsLoading(true);
    await undoStatusUjianDL(attempt.id);
    setIsLoading(false);
    Swal.fire({ title: 'Status Dibatalkan!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleDeleteAttempt = async (attempt: any) => {
    const confirmRes = await Swal.fire({
      title: 'Hapus Riwayat?',
      text: `Yakin ingin menghapus riwayat tes ke-${attempt.percobaan} (Level ${attempt.level}) yang belum dilaksanakan ini?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Hapus'
    });
    if (!confirmRes.isConfirmed) return;

    setIsLoading(true);
    await deleteAttemptDL(attempt.id);
    setIsLoading(false);
    Swal.fire({ title: 'Terhapus!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 flex flex-col h-[calc(100vh-12rem)] w-full max-w-full lg:max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">

      {/* Top Bar (Filter + Settings) */}
      <div className="p-4 border-b border-primary-light/20 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center bg-bg-cream dark:bg-gray-800/30">
        <div className="flex gap-2 flex-1">
          {/* PERIODE FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary max-w-[200px]"
            value={selectedPeriodeId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set('periodeId', e.target.value);
              else params.delete('periodeId');
              
              params.delete('gelombangId'); // reset gelombang when changing periode
              router.push(`/admin/darul-lughoh?${params.toString()}`);
            }}
          >
            <option value="" disabled>Pilih Periode</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>

          {/* GELOMBANG FILTER */}
          <select
            className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm font-medium text-text-secondary dark:text-gray-400"
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

          <form className="relative flex-1 max-w-sm">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari NIS atau Nama..."
              className="w-full px-4 py-1.5 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
            />
            <input type="hidden" name="gelombangId" value={selectedGelombangId} />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/darul-lughoh/template"
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-colors"
          >
            <Download size={16} /> Download Template
          </a>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/80 transition-colors"
          >
            <Upload size={16} /> Import Excel
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors"
          >
            <Settings size={16} /> Pengaturan DL
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex gap-4 items-end">
          <div>
            <label className="text-xs text-amber-800 font-bold mb-1 block">Nominal Biaya per Level (Default Baru)</label>
            <input
              type="number"
              value={nominalSetting}
              onChange={e => setNominalSetting(parseInt(e.target.value))}
              className="px-3 py-2 rounded border border-amber-300 w-64 outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <button
            disabled={isLoading}
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Save size={16} /> Simpan
          </button>
          <p className="text-xs text-amber-700 italic max-w-sm ml-4 mb-2"><AlertTriangle size={14} className="inline mr-1" /> Perubahan nominal hanya berlaku untuk resep tagihan baru (santri yg baru assign level atau baru remidi). Tagihan lama tetap memakai nominal yang telah dibuat.</p>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm text-sm text-text-primary dark:text-gray-100 font-bold">
            <tr className="border-b border-primary-light/20 dark:border-gray-700">
              <th className="p-3 border-r border-primary-light/10 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[80px] sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">NIS</th>
              <th className="p-3 border-r border-primary-light/20 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[170px] sticky left-[80px] z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Nama</th>
              <th className="p-3 border-r border-primary-light/30 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 w-24 text-center">Set Level</th>

              {levels.map(lvl => (
                <th key={lvl} className="p-3 text-center border-r border-primary-light/20 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 min-w-[180px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>DL Level {lvl}</span>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleBulkLulus(lvl)}
                      className="px-2 py-0.5 mt-1 bg-success/10 text-success hover:bg-success hover:text-white rounded text-[10px] font-bold transition-colors shadow-sm w-max"
                    >
                      Luluskan Semua
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs">
            {santriList.map((santri: any) => {
              // Extract highest level logic
              const maxLvl = santri.darulLughoh.reduce((max: number, d: any) => Math.max(max, d.level), 0);

              return (
                <tr key={santri.id} className="border-b border-primary-light/10 dark:border-gray-700 hover:bg-[#faf9f5] dark:bg-gray-800 transition-colors group">
                  <td className="p-2 border-r border-primary-light/10 dark:border-gray-700 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 font-mono font-bold text-primary whitespace-nowrap px-3 sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/20 dark:border-gray-700 sticky left-[80px] z-10 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 min-w-[170px] max-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                    <div className="flex justify-between items-center gap-2 group/name w-full">
                      <div className="font-bold text-text-primary dark:text-gray-100 text-sm font-bold truncate" title={santri.namaLengkap}>{santri.namaLengkap}</div>
                      {santri.darulLughoh && santri.darulLughoh.length > 0 && (
                        <button
                          onClick={() => handleResetDL(santri.id, santri.namaLengkap)}
                          disabled={isLoading}
                          title="Reset Seluruh Level DL"
                          className="text-gray-300 hover:text-danger opacity-0 group-hover/name:opacity-100 transition-all p-1 rounded hover:bg-danger/10 flex-shrink-0 outline-none"
                        >
                          <RotateCcw size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-2 border-r border-primary-light/30 dark:border-gray-700 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 text-center">
                    <select
                      className="p-1 border rounded bg-white dark:bg-gray-900 text-xs w-full cursor-pointer outline-none focus:border-primary"
                      onChange={(e) => handleAssignLevel(santri.id, parseInt(e.target.value))}
                      value=""
                      disabled={isLoading}
                    >
                      <option value="" disabled>Pilih Level</option>
                      {levels.map(l => (
                        <option key={l} value={l} disabled={l <= maxLvl}>Mulai Level {l}</option>
                      ))}
                    </select>
                  </td>

                  {/* Level Columns */}
                  {levels.map(lvl => {
                    const attempts = santri.darulLughoh.filter((d: any) => d.level === lvl).sort((a: any, b: any) => b.percobaan - a.percobaan);
                    
                    if (attempts.length === 0) {
                      const prevLvl = santri.darulLughoh.filter((d: any) => d.level === lvl - 1).sort((a: any, b: any) => b.percobaan - a.percobaan)[0];
                      if (prevLvl && prevLvl.statusUjian === "LULUS") {
                        return (
                          <td key={lvl} className="border-r border-primary-light/10 dark:border-gray-700 p-2 text-center align-middle">
                            <button 
                              onClick={async () => {
                                setIsLoading(true);
                                await generateNextLevelDL(santri.id, lvl);
                                setIsLoading(false);
                                Swal.fire({ title: `Level ${lvl} Aktif!`, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                              }}
                              className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs rounded transition-colors font-bold whitespace-nowrap shadow-sm"
                              disabled={isLoading}
                            >
                              Buat Level {lvl}
                            </button>
                          </td>
                        );
                      }
                      return <td key={lvl} className="border-r border-primary-light/10 dark:border-gray-700 p-2"></td>;
                    }

                    return (
                      <td key={lvl} className="border-r border-primary-light/10 dark:border-gray-700 p-0 align-top min-w-[170px] max-w-[200px]">
                        <div className="flex flex-col h-full">
                          {attempts.map((attempt: any, idx: number) => {
                            const isCellLunas = attempt.nominalDibayar >= attempt.nominalHarus;
                            const isFree = attempt.nominalHarus === 0;

                            return (
                              <div key={attempt.id} className={`p-2 flex flex-col gap-1.5 ${idx > 0 ? 'border-t border-primary-light/10 dark:border-gray-700' : ''} ${isCellLunas ? 'bg-success/5' : 'bg-warning/5'}`}>
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="text-text-secondary dark:text-gray-400">Tes Ke- {attempt.percobaan}</span>
                                  {attempt.statusUjian === "LULUS" ? (
                                    <div className="flex items-center gap-1 group/undo">
                                      <span className="text-success flex items-center gap-0.5"><CheckCircle2 size={12} /> LULUS</span>
                                      <button onClick={() => handleUndoStatus(attempt)} disabled={isLoading} className="text-gray-300 hover:text-danger opacity-0 group-hover/undo:opacity-100 transition-opacity outline-none" title="Batalkan Lulus">
                                        <RotateCcw size={10} strokeWidth={3} />
                                      </button>
                                    </div>
                                  ) : attempt.statusUjian === "REMIDI" ? (
                                    <div className="flex items-center gap-1 group/undo">
                                      <span className="text-danger flex items-center gap-0.5"><AlertTriangle size={12} /> REMIDI</span>
                                      <button onClick={() => handleUndoStatus(attempt)} disabled={isLoading} className="text-gray-300 hover:text-danger opacity-0 group-hover/undo:opacity-100 transition-opacity outline-none" title="Batalkan Remidi">
                                        <RotateCcw size={10} strokeWidth={3} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 group/undo">
                                      <span className="text-warning">Ujian Tertunda</span>
                                      <button onClick={() => handleDeleteAttempt(attempt)} disabled={isLoading} className="text-gray-300 hover:text-danger opacity-0 group-hover/undo:opacity-100 transition-opacity outline-none" title="Hapus Riwayat Tertunda">
                                        <Trash2 size={10} strokeWidth={3} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold">
                                  {isCellLunas ? (
                                    <span className="text-success">{isFree ? 'BEBAS BIAYA' : 'LUNAS'}</span>
                                  ) : (
                                    <span className="text-danger">Kurang: {(attempt.nominalHarus - attempt.nominalDibayar) / 1000}k / {attempt.nominalHarus / 1000}k</span>
                                  )}
                                </div>

                                {/* Only show grading buttons for active (latest un-graded) attempt */}
                                {idx === 0 && attempt.statusUjian === 'BELUM_UJIAN' && (
                                  <div className="flex gap-1 mt-1">
                                    <button disabled={isLoading} onClick={() => handleStatusChange(attempt.id, "LULUS")} className="flex-1 py-1 bg-success text-white text-xs font-bold rounded hover:bg-success/80">LULUS</button>
                                    <button disabled={isLoading} onClick={() => handleStatusChange(attempt.id, "REMIDI")} className="flex-1 py-1 bg-danger text-white text-xs font-bold rounded hover:bg-danger/80">REMIDI</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )
            })}

            {santriList.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center italic text-text-secondary dark:text-gray-400 bg-white dark:bg-gray-900">
                  Belum ada data santri pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ImportExcelModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        gelombangList={gelombangs}
        onSuccess={() => {
          setShowImport(false);
          router.refresh();
        }}
        uploadUrl="/api/admin/darul-lughoh/import"
        templateUrl="/api/admin/darul-lughoh/template"
        showGelombang={false}
      />
    </div>
  );
}
