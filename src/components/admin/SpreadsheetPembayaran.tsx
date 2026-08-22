"use client";

import { useState } from "react";
import { upsertCicilanPembayaran, changePaketSantri } from "@/app/admin/(dashboard)/pembayaran/actions";
import { updatePembayaranDL } from "@/app/admin/(dashboard)/darul-lughoh/actions";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Utility formatting
const fmt = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

export default function SpreadsheetPembayaran({ 
  santriList, 
  targetPakets,
  allPakets,
  gelombangs, 
  periodes,
  query, 
  selectedGelombangId,
  selectedPaketId,
  selectedPeriodeId
}: { 
  santriList: any[], 
  targetPakets: any[],
  allPakets: any[],
  gelombangs: any[],
  periodes: any[],
  query: string,
  selectedGelombangId: string,
  selectedPaketId: string,
  selectedPeriodeId: string
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [localCicilan, setLocalCicilan] = useState<{ [key: string]: number }>({});

  if (!targetPakets || targetPakets.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-primary-light/20 text-center italic text-text-secondary">
        Belum ada Paket Pembayaran default. Silakan atur di Master Paket.
      </div>
    );
  }



  // Levels for DL
  const dlLevels = [1, 2, 3, 4, 5, 6];

  const handleCicilanChange = (k: string, value: string) => {
    // Only accept numbers
    const raw = value.replace(/\D/g, '');
    const val = raw ? parseInt(raw, 10) : 0;
    setLocalCicilan(prev => ({ ...prev, [k]: val }));
  };

  const handleBlur = async (santriId: string, poinTahapId: string, currentVal: number, originalVal: number, nominalHarus: number) => {
    if (currentVal === originalVal) return;
    setIsLoading(true);
    await upsertCicilanPembayaran(santriId, poinTahapId, currentVal, nominalHarus);
    setIsLoading(false);
    // Remove local override so it syncs with server state on revalidate
    setLocalCicilan(prev => {
      const next = { ...prev };
      delete next[`${santriId}-${poinTahapId}`];
      return next;
    });
  };

  const handleBlurDL = async (dlId: string, currentVal: number, originalVal: number) => {
    if (currentVal === originalVal) return;
    setIsLoading(true);
    await updatePembayaranDL(dlId, currentVal);
    setIsLoading(false);
    setLocalCicilan(prev => {
      const next = { ...prev };
      delete next[`dl-${dlId}`];
      return next;
    });
  };

  const getDLRecords = (santri: any, level: number) => {
    // get all percobaan for this level, sorted by percobaan ascending
    const records = santri.darulLughoh?.filter((d: any) => d.level === level) || [];
    if (records.length === 0) return null;
    
    records.sort((a: any, b: any) => a.percobaan - b.percobaan);
    return records;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary-light/20 flex flex-col h-[calc(100vh-140px)] w-full max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">
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
              
              // When changing periode, clear gelombang and paket selections
              params.delete('gelombangId');
              params.delete('paketId');
              router.push(`/admin/pembayaran?${params.toString()}`);
            }}
          >
            <option value="" disabled>Pilih Periode</option>
            {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>

          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 text-sm outline-none bg-white font-medium text-text-secondary focus:border-primary"
            value={selectedGelombangId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value !== "all") params.set('gelombangId', e.target.value);
              else params.delete('gelombangId');
              router.push(`/admin/pembayaran?${params.toString()}`);
            }}
          >
            <option value="all">Semua Gelombang</option>
            {gelombangs.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>

          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 text-sm outline-none bg-white font-medium text-text-secondary focus:border-primary"
            value={selectedPaketId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set('paketId', e.target.value);
              else params.delete('paketId');
              router.push(`/admin/pembayaran?${params.toString()}`);
            }}
          >
            <option value="all">Semua Paket</option>
            {allPakets.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>

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

      {/* Spreadsheet Container */}
      <div className="flex-1 w-full relative bg-gray-50/30 rounded-b-xl overflow-auto custom-scrollbar">
        <div className="pt-4 pb-8 space-y-12">
          {targetPakets.map((pkt) => {
          const tahaps = pkt.tahapPaket || [];
          const tahap1 = tahaps.length > 0 ? tahaps[0] : null;
          const remainingTahaps = tahaps.slice(1);
          const pktSantris = santriList.filter(s => s.paketPembayaranId === pkt.id);

          return (
            <div key={pkt.id} className="mb-12 last:mb-0">
              <h2 className="text-lg font-bold text-primary mb-3 mx-2 px-3 border-l-4 border-primary bg-white py-1 inline-block shadow-sm rounded-r">
                Paket: {pkt.nama}
              </h2>
              
              {pktSantris.length === 0 ? (
                <div className="p-6 bg-white rounded-lg border border-primary-light/20 text-center text-text-secondary italic text-sm shadow-sm inline-block min-w-full">
                  Belum ada data santri di paket ini untuk gelombang yang dipilih.
                </div>
              ) : (
                <div className="relative border border-primary-light/20 rounded-lg bg-white shadow-sm inline-block min-w-full">
                  <table className="text-left border-collapse w-max">
                    <thead className="sticky top-0 z-20 shadow-sm bg-[#faf9f5]">
                      {/* Header Row 1: Groups */}
                      <tr className="text-text-primary text-xs border-b border-primary-light/20">
                        <th colSpan={2} className="p-2 border-r border-primary-light/20 bg-[#f4f2eb] text-center font-bold">Data Santri</th>

                        {tahap1 && tahap1.poinTahap.length > 0 && (
                          <th colSpan={tahap1.poinTahap.length} className="p-2 border-r border-primary-light/20 text-center font-bold">{tahap1.nama}</th>
                        )}

                        <th colSpan={6} className="p-2 border-r border-primary-light/20 text-center font-bold bg-amber-50 text-amber-700">Darul Lughoh (DL)</th>

                        {remainingTahaps.map((t: any) => t.poinTahap.length > 0 && (
                          <th key={t.id} colSpan={t.poinTahap.length} className="p-2 border-r border-primary-light/20 text-center font-bold">{t.nama}</th>
                        ))}

                        <th className="p-2 text-center font-bold bg-[#f4f2eb] border-l border-primary-light/20">Summary</th>
                      </tr>

                      {/* Header Row 2: Sub-columns */}
                      <tr className="text-text-secondary text-[11px] border-b border-primary-light/20">
                        <th className="p-2 border-r border-primary-light/10 bg-white min-w-[80px]">NIS</th>
                        <th className="p-2 border-r border-primary-light/20 bg-white min-w-[150px]">Nama</th>

                        {tahap1 && tahap1.poinTahap.map((poin: any) => (
                           <th key={poin.id} className="p-2 border-r border-primary-light/10 min-w-[140px]" title={poin.nama}>
                             <div className="truncate w-full font-medium flex items-center justify-between">
                               {poin.nama}
                               {tahap1.isIjazahBased && <span className="bg-warning text-white text-[8px] px-1 rounded">Ijazah</span>}
                             </div>
                             <div className="text-[9px] text-text-secondary font-normal mt-0.5">
                               {tahap1.isIjazahBased && poin.nominalIjazah ? `${fmt(poin.nominal)} / ${fmt(poin.nominalIjazah)}` : fmt(poin.nominal)}
                             </div>
                           </th>
                        ))}

                        {dlLevels.map((lvl) => (
                          <th key={lvl} className="p-2 border-r border-primary-light/10 min-w-[120px] bg-amber-50 text-amber-600 text-center font-bold">
                            Level {lvl}
                          </th>
                        ))}

                        {remainingTahaps.map((t: any) => 
                          t.poinTahap.map((poin: any) => (
                            <th key={poin.id} className="p-2 border-r border-primary-light/10 min-w-[140px]" title={poin.nama}>
                              <div className="truncate w-full font-medium flex items-center justify-between">
                                {poin.nama}
                                {t.isIjazahBased && <span className="bg-warning text-white text-[8px] px-1 rounded">Ijazah</span>}
                              </div>
                              <div className="text-[9px] text-text-secondary font-normal mt-0.5">
                                {t.isIjazahBased && poin.nominalIjazah ? `${fmt(poin.nominal)} / ${fmt(poin.nominalIjazah)}` : fmt(poin.nominal)}
                              </div>
                            </th>
                          ))
                        )}
                        <th className="p-2 bg-white border-l border-primary-light/20 min-w-[100px] text-center">Status</th>
                      </tr>
                    </thead>
                    
                    <tbody>
                      {pktSantris.map(santri => {
                        let globalKekurangan = 0;

                        const calcHarusList: { [poinId: string]: number } = {};
                        tahaps.forEach((t: any) => {
                          t.poinTahap.forEach((pt: any) => {
                            let h = pt.nominal;
                            if (t.isIjazahBased && pt.nominalIjazah) {
                              if (santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN') {
                                h = pt.nominalIjazah;
                              }
                            }
                            calcHarusList[pt.id] = h;

                            const ps = santri.pembayaranSantri.find((s: any) => s.poinTahapId === pt.id);
                            const dibayar = ps?.nominalDibayar || 0;
                            globalKekurangan += Math.max(0, h - dibayar);
                          });
                        });

                        dlLevels.forEach(lvl => {
                          const dlArray = getDLRecords(santri, lvl);
                          if (dlArray) {
                            dlArray.forEach((dl: any) => {
                                globalKekurangan += Math.max(0, dl.nominalHarus - dl.nominalDibayar);
                            });
                          }
                        });

                        return (
                          <tr key={santri.id} className="border-b border-primary-light/10 hover:bg-[#faf9f5] transition-colors group">
                            {/* Fixed Left Info */}
                            <td className="p-2 border-r border-primary-light/10 bg-white group-hover:bg-[#faf9f5] font-mono text-[11px] text-primary align-top whitespace-nowrap">{santri.nis}</td>
                            <td className="p-2 border-r border-primary-light/20 sticky left-0 z-10 bg-white group-hover:bg-[#faf9f5] min-w-[150px] max-w-[180px] align-top shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                              <div className="font-bold text-text-primary text-xs truncate" title={santri.namaLengkap}>{santri.namaLengkap}</div>
                              <select 
                                className="text-[9px] mt-1 w-full border border-primary-light/30 rounded px-1 py-0.5 bg-gray-50 outline-none text-text-secondary cursor-pointer hover:border-primary/50"
                                value={santri.paketPembayaranId || ""}
                                onChange={(e) => changePaketSantri(santri.id, e.target.value)}
                              >
                                <option value="">Pilih Paket...</option>
                                {allPakets.map(p => (
                                  <option key={p.id} value={p.id}>{p.nama}</option>
                                ))}
                              </select>
                            </td>

                            {/* TAHAP 1 CELLS */}
                            {tahap1 && tahap1.poinTahap.map((poin: any) => {
                              const ps = santri.pembayaranSantri.find((s: any) => s.poinTahapId === poin.id);
                              const harus = calcHarusList[poin.id];
                              const dibayar = ps?.nominalDibayar || 0;
                              const k = `${santri.id}-${poin.id}`;
                              const displayVal = localCicilan[k] !== undefined ? localCicilan[k] : dibayar;
                              const isInputLunas = displayVal >= harus;
                              const displayStr = displayVal === 0 ? '' : displayVal.toLocaleString('id-ID');
                              
                              if (harus === 0) return <td key={poin.id} className="p-2 border-r border-primary-light/10 text-center text-text-secondary/30 align-top">-</td>

                              return (
                                <td key={poin.id} className={`p-1.5 border-r border-primary-light/10 align-top ${isInputLunas ? 'bg-success/5' : 'bg-warning/5'}`}>
                                  <div className="flex flex-col gap-1 relative group/cell">
                                    <input
                                      title={poin.nama}
                                      type="text"
                                      value={displayStr}
                                      placeholder="0"
                                      onChange={(e) => handleCicilanChange(k, e.target.value)}
                                      onBlur={() => handleBlur(santri.id, poin.id, displayVal, dibayar, harus)}
                                      disabled={isLoading}
                                      className={`w-full px-2 py-1 text-xs outline-none border rounded bg-white font-medium ${isInputLunas ? 'border-success/30 focus:border-success text-success' : 'border-warning/30 focus:border-warning text-danger'}`}
                                    />
                                    <div className="flex justify-between items-center px-1">
                                      {!isInputLunas ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleCicilanChange(k, String(harus));
                                              handleBlur(santri.id, poin.id, harus, dibayar, harus);
                                            }}
                                            className="text-[8px] bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                          >
                                            SET LUNAS
                                          </button>
                                      ) : <div />}
                                      <div className="text-[9px] text-text-secondary text-right font-medium">
                                        / {fmt(harus)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}

                            {/* DL CELLS */}
                            {dlLevels.map(lvl => {
                              const maxAssignedLevel = (santri.darulLughoh?.length > 0) ? Math.max(...santri.darulLughoh.map((d: any) => d.level)) : 0;
                              const attempts = getDLRecords(santri, lvl);

                              if (!attempts) {
                                if (lvl < maxAssignedLevel) {
                                  return (
                                    <td key={lvl} className="p-2 border-r border-primary-light/10 text-center bg-gray-50/50 text-text-secondary align-top">
                                      <div className="text-[10px] font-bold text-success flex items-center justify-center gap-1"><CheckCircle2 size={12} /> LULUS</div>
                                      <div className="text-[8px] opacity-70 mt-0.5">TERLEWATI</div>
                                    </td>
                                  );
                                }
                                return <td key={lvl} className="p-2 border-r border-primary-light/10 text-center text-text-secondary/30 align-top">-</td>;
                              }

                              return (
                                <td key={lvl} className="border-r border-primary-light/10 p-0 align-top max-w-[150px]">
                                  <div className="flex flex-col h-full">
                                    {attempts.map((dl: any, idx: number) => {
                                      const isFree = dl.nominalHarus === 0;

                                      if (isFree && dl.statusUjian === 'LULUS') {
                                        return (
                                          <div key={dl.id} className={`p-2 text-center bg-gray-50/50 text-text-secondary ${idx > 0 ? 'border-t border-primary-light/10' : ''}`}>
                                            <div className="text-[10px] font-bold text-success flex items-center justify-center gap-1"><CheckCircle2 size={12} /> LULUS</div>
                                            <div className="text-[8px] opacity-70 mt-0.5">TERLEWATI</div>
                                          </div>
                                        );
                                      }

                                      if ((dl.statusUjian === 'LULUS' || dl.statusUjian === 'REMIDI') && dl.nominalDibayar >= dl.nominalHarus) {
                                        return (
                                          <div key={dl.id} className={`p-1.5 text-center bg-success/5 ${idx > 0 ? 'border-t border-primary-light/10' : ''}`}>
                                            <div className="flex justify-between items-center text-[9px] font-bold px-1 mb-1">
                                              <span className="text-text-secondary text-[8px]">Tes Ke- {dl.percobaan}</span>
                                              <span>{dl.statusUjian === 'LULUS' ? '✅' : '🔄'}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-success flex items-center justify-center gap-1">LUNAS</div>
                                          </div>
                                        );
                                      }

                                      const k = `dl-${dl.id}`;
                                      const displayVal = localCicilan[k] !== undefined ? localCicilan[k] : dl.nominalDibayar;
                                      const isInputLunas = displayVal >= dl.nominalHarus;
                                      const displayStr = displayVal === 0 ? '' : displayVal.toLocaleString('id-ID');

                                      return (
                                        <div key={dl.id} className={`p-1.5 ${idx > 0 ? 'border-t border-primary-light/10' : ''} ${isInputLunas ? 'bg-success/5' : 'bg-warning/5'}`}>
                                          <div className="flex flex-col gap-1 relative group/cell">
                                            <div className="flex justify-between items-center px-1 text-[9px] font-bold">
                                              <span className="text-text-secondary text-[8px] whitespace-nowrap">Tes Ke- {dl.percobaan}</span>
                                              {dl.statusUjian === 'LULUS' ? '✅' : dl.statusUjian === 'REMIDI' ? '🔄' : '⏳'}
                                            </div>
                                            <input
                                              title="Cicilan Pembayaran"
                                              type="text"
                                              value={displayStr}
                                              placeholder="0"
                                              onChange={(e) => handleCicilanChange(k, e.target.value)}
                                              onBlur={() => handleBlurDL(dl.id, displayVal, dl.nominalDibayar)}
                                              disabled={isLoading}
                                              className={`w-full px-2 py-1 text-xs outline-none border rounded bg-white font-medium ${isInputLunas ? 'border-success/30 focus:border-success text-success' : 'border-warning/30 focus:border-warning text-danger'}`}
                                            />
                                            <div className="flex justify-between items-center px-1">
                                              {!isInputLunas ? (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleCicilanChange(k, String(dl.nominalHarus));
                                                    handleBlurDL(dl.id, dl.nominalHarus, dl.nominalDibayar);
                                                  }}
                                                  className="text-[8px] bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                                >
                                                  SET LUNAS
                                                </button>
                                              ) : <div />}
                                              <div className="text-[9px] text-text-secondary text-right font-medium">
                                                / {fmt(dl.nominalHarus)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}

                            {/* TAHAP LANJUTAN CELLS */}
                            {remainingTahaps.map((t: any) => 
                              t.poinTahap.map((poin: any) => {
                                const ps = santri.pembayaranSantri.find((s: any) => s.poinTahapId === poin.id);
                                const harus = calcHarusList[poin.id];
                                const dibayar = ps?.nominalDibayar || 0;
                                const k = `${santri.id}-${poin.id}`;
                                const displayVal = localCicilan[k] !== undefined ? localCicilan[k] : dibayar;
                                const isInputLunas = displayVal >= harus;
                                const displayStr = displayVal === 0 ? '' : displayVal.toLocaleString('id-ID');
                                
                                if (harus === 0) return <td key={poin.id} className="p-2 border-r border-primary-light/10 text-center text-text-secondary/30 align-top">-</td>

                                return (
                                  <td key={poin.id} className={`p-1.5 border-r border-primary-light/10 align-top ${isInputLunas ? 'bg-success/5' : 'bg-warning/5'}`}>
                                    <div className="flex flex-col gap-1 relative group/cell">
                                      <input
                                        type="text"
                                        value={displayStr}
                                        placeholder="0"
                                        onChange={(e) => handleCicilanChange(k, e.target.value)}
                                        onBlur={() => handleBlur(santri.id, poin.id, displayVal, dibayar, harus)}
                                        disabled={isLoading}
                                        className={`w-full px-2 py-1 text-xs outline-none border rounded bg-white font-medium ${isInputLunas ? 'border-success/30 focus:border-success text-success' : 'border-warning/30 focus:border-warning text-danger'}`}
                                      />
                                      <div className="flex justify-between items-center px-1">
                                          {!isInputLunas ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleCicilanChange(k, String(harus));
                                                handleBlur(santri.id, poin.id, harus, dibayar, harus);
                                              }}
                                              className="text-[8px] bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                            >
                                              SET LUNAS
                                            </button>
                                          ) : <div />}
                                        <div className="text-[9px] text-text-secondary text-right font-medium">
                                          / {fmt(harus)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })
                            )}

                            <td className="p-2 bg-white group-hover:bg-[#faf9f5] border-l border-primary-light/20 text-center align-top">
                              {globalKekurangan === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded">
                                  <CheckCircle2 size={12} /> LUNAS
                                </span>
                              ) : (
                                <div className="text-[10px] font-bold text-danger text-center w-full whitespace-nowrap flex flex-col justify-center gap-0.5">
                                  <span>KURANG</span>
                                  <span>Rp {globalKekurangan.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
