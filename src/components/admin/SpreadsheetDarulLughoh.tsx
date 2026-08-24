"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignLevelDL, updatePembayaranDL,
  updateStatusUjianDL, updateSettingDL,
  generateNextLevelDL
} from "@/app/admin/(dashboard)/darul-lughoh/actions";
import { Settings, Save, AlertTriangle, CheckCircle2, Upload, Download } from "lucide-react";
import ImportExcelModal from "./ImportExcelModal";

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
  };

  const handleAssignLevel = async (santriId: string, level: number) => {
    setIsLoading(true);
    await assignLevelDL(santriId, level);
    setIsLoading(false);
  };

  const handleStatusChange = async (dlId: string, status: "LULUS" | "REMIDI") => {
    if (!confirm(`Konfirmasi set status menjadi ${status}? ${status === 'REMIDI' ? 'Ini akan membuat tagihan percobaan baru di level yang sama.' : ''}`)) return;
    setIsLoading(true);
    await updateStatusUjianDL(dlId, status);
    setIsLoading(false);
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 flex flex-col h-[calc(100vh-12rem)] w-full max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">

      {/* Top Bar (Filter + Settings) */}
      <div className="p-4 border-b border-primary-light/20 flex flex-wrap gap-4 justify-between items-center bg-bg-cream/30">
        <div className="flex gap-2 flex-1">
          {/* PERIODE FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 text-sm outline-none bg-white font-medium text-text-secondary focus:border-primary max-w-[200px]"
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
            className="px-3 py-1.5 bg-white border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm font-medium text-text-secondary"
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
              className="w-full px-4 py-1.5 bg-white border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm"
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
            className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
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
          <thead className="sticky top-0 z-20 shadow-sm text-xs text-text-primary font-bold">
            <tr className="border-b border-primary-light/20">
              <th className="p-3 border-r border-primary-light/10 bg-[#f4f2eb] min-w-[80px]">NIS</th>
              <th className="p-3 border-r border-primary-light/20 bg-[#f4f2eb] min-w-[150px] sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Nama</th>
              <th className="p-3 border-r border-primary-light/30 bg-[#f4f2eb] w-24 text-center">Set Level</th>

              {levels.map(lvl => (
                <th key={lvl} className="p-3 text-center border-r border-primary-light/20 bg-[#f4f2eb] min-w-[180px]">DL Level {lvl}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs">
            {santriList.map((santri: any) => {
              // Extract highest level logic
              const maxLvl = santri.darulLughoh.reduce((max: number, d: any) => Math.max(max, d.level), 0);

              return (
                <tr key={santri.id} className="border-b border-primary-light/10 hover:bg-[#faf9f5] transition-colors group">
                  <td className="p-2 border-r border-primary-light/10 bg-white group-hover:bg-[#faf9f5] font-mono font-medium text-primary">{santri.nis}</td>
                  <td className="p-2 border-r border-primary-light/20 sticky left-0 z-10 bg-white group-hover:bg-[#faf9f5] font-semibold truncate max-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.06)] min-w-[150px]">
                    <div className="font-bold text-text-primary text-xs truncate" title={santri.namaLengkap}>{santri.namaLengkap}</div>
                  </td>
                  <td className="p-2 border-r border-primary-light/30 bg-white group-hover:bg-[#faf9f5] text-center">
                    <select
                      className="p-1 border rounded bg-white text-[10px] w-full cursor-pointer outline-none focus:border-primary"
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
                          <td key={lvl} className="border-r border-primary-light/10 p-2 text-center align-middle">
                            <button 
                              onClick={async () => {
                                setIsLoading(true);
                                await generateNextLevelDL(santri.id, lvl);
                                setIsLoading(false);
                              }}
                              className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] rounded transition-colors font-bold whitespace-nowrap shadow-sm"
                              disabled={isLoading}
                            >
                              Buat Level {lvl}
                            </button>
                          </td>
                        );
                      }
                      return <td key={lvl} className="border-r border-primary-light/10 p-2"></td>;
                    }

                    return (
                      <td key={lvl} className="border-r border-primary-light/10 p-0 align-top max-w-[180px]">
                        <div className="flex flex-col h-full">
                          {attempts.map((attempt: any, idx: number) => {
                            const isCellLunas = attempt.nominalDibayar >= attempt.nominalHarus;
                            const isFree = attempt.nominalHarus === 0;

                            return (
                              <div key={attempt.id} className={`p-2 flex flex-col gap-1.5 ${idx > 0 ? 'border-t border-primary-light/10' : ''} ${isCellLunas ? 'bg-success/5' : 'bg-warning/5'}`}>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-text-secondary">Tes Ke- {attempt.percobaan}</span>
                                  {attempt.statusUjian === "LULUS" ? (
                                    <span className="text-success flex items-center gap-0.5"><CheckCircle2 size={12} /> LULUS</span>
                                  ) : attempt.statusUjian === "REMIDI" ? (
                                    <span className="text-danger flex items-center gap-0.5"><AlertTriangle size={12} /> REMIDI</span>
                                  ) : (
                                    <span className="text-warning">Ujian Tertunda</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-bold">
                                  {isCellLunas ? (
                                    <span className="text-success">{isFree ? 'BEBAS BIAYA' : 'LUNAS'}</span>
                                  ) : (
                                    <span className="text-danger">Kurang: {(attempt.nominalHarus - attempt.nominalDibayar) / 1000}k / {attempt.nominalHarus / 1000}k</span>
                                  )}
                                </div>

                                {/* Only show grading buttons for active (latest un-graded) attempt */}
                                {idx === 0 && attempt.statusUjian === 'BELUM_UJIAN' && (
                                  <div className="flex gap-1 mt-1">
                                    <button disabled={isLoading} onClick={() => handleStatusChange(attempt.id, "LULUS")} className="flex-1 py-1 bg-success text-white text-[9px] font-bold rounded hover:bg-success/80">LULUS</button>
                                    <button disabled={isLoading} onClick={() => handleStatusChange(attempt.id, "REMIDI")} className="flex-1 py-1 bg-danger text-white text-[9px] font-bold rounded hover:bg-danger/80">REMIDI</button>
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
                <td colSpan={10} className="p-8 text-center italic text-text-secondary bg-white">
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
