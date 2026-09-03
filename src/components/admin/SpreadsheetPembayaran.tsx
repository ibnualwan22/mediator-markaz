"use client";

import { useState } from "react";
import { upsertCicilanPembayaran, changePaketSantri, bulkUpsertCicilanPembayaran, updatePembayaranSantriMeta } from "@/app/admin/(dashboard)/pembayaran/actions";
import { updatePembayaranDL, bulkUpdatePembayaranDL, updateDarulLughohMeta } from "@/app/admin/(dashboard)/darul-lughoh/actions";
import { CheckCircle2, AlertCircle, CalendarRange, X, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import ImportExcelModal from "@/components/admin/ImportExcelModal";

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [localCicilan, setLocalCicilan] = useState<{ [key: string]: number }>({});

  // Meta Modal State
  const [metaModal, setMetaModal] = useState<{
    isOpen: boolean; type: 'TAHAP' | 'DL'; recordId: string; santriId?: string; poinTahapId?: string; nama: string; tanggal: string; catatan: string;
  } | null>(null);

  const [overdueAlertClosed, setOverdueAlertClosed] = useState(false);

  // Overdue calculation
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdueItems: { santriNama: string, poinNama: string, tanggal: Date }[] = [];

  if (targetPakets) {
    targetPakets.forEach(pkt => {
      santriList.forEach(santri => {
        if (santri.paketPembayaranId !== pkt.id) return;
        (pkt.tahapPaket || []).forEach((t: any) => {
          t.poinTahap.forEach((pt: any) => {
            const ps = santri.pembayaranSantri.find((s: any) => s.poinTahapId === pt.id);
            if (ps && ps.tanggalJatuhTempo && new Date(ps.tanggalJatuhTempo) < now && !ps.isLunas) {
              overdueItems.push({ santriNama: santri.namaLengkap, poinNama: pt.nama, tanggal: new Date(ps.tanggalJatuhTempo) });
            }
          });
        });
        (santri.darulLughoh || []).forEach((dl: any) => {
          if (dl.tanggalJatuhTempo && new Date(dl.tanggalJatuhTempo) < now && !dl.isLunas) {
            overdueItems.push({ santriNama: santri.namaLengkap, poinNama: `DL Level ${dl.level} (Tes ${dl.percobaan})`, tanggal: new Date(dl.tanggalJatuhTempo) });
          }
        });
      });
    });
  }

  if (!targetPakets || targetPakets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-primary-light/20 dark:border-gray-700 text-center italic text-text-secondary dark:text-gray-400">
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
    const res = await upsertCicilanPembayaran(santriId, poinTahapId, currentVal, nominalHarus);
    setIsLoading(false);

    // Remove local override so it syncs with server state on revalidate
    setLocalCicilan(prev => {
      const next = { ...prev };
      delete next[`${santriId}-${poinTahapId}`];
      return next;
    });

    // Refresh FIRST, then show non-blocking toast
    router.refresh();

    if (res?.success && currentVal > nominalHarus) {
      const Swal = (await import('sweetalert2')).default;
      if (res.remainingSurplus && res.remainingSurplus > 0) {
        Swal.fire({ title: 'Perhatian', text: `Sisa uang Rp ${res.remainingSurplus.toLocaleString('id-ID')} tidak bisa dibagikan karena tidak ada tagihan kolom berikutnya.`, icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ title: 'Didistribusikan!', text: 'Kelebihan nominal berhasil otomatis didistribusikan ke tagihan berikutnya.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      }
    }
  };

  const handleBlurDL = async (dlId: string, currentVal: number, originalVal: number, nominalHarus: number) => {
    if (currentVal === originalVal) return;
    setIsLoading(true);
    const res = await updatePembayaranDL(dlId, currentVal);
    setIsLoading(false);
    
    setLocalCicilan(prev => {
      const next = { ...prev };
      delete next[`dl-${dlId}`];
      return next;
    });

    router.refresh();

    if (res?.success && currentVal > nominalHarus) {
      const Swal = (await import('sweetalert2')).default;
      if (res.remainingSurplus && res.remainingSurplus > 0) {
        Swal.fire({ title: 'Perhatian', text: `Sisa uang Rp ${res.remainingSurplus.toLocaleString('id-ID')} tidak bisa dibagikan karena tidak ada tagihan DL berikutnya.`, icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
      } else {
        Swal.fire({ title: 'Didistribusikan!', text: 'Kelebihan nominal berhasil otomatis didistribusikan ke level DL berikutnya.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      }
    }
  };

  const getDLRecords = (santri: any, level: number) => {
    // get all percobaan for this level, sorted by percobaan ascending
    const records = santri.darulLughoh?.filter((d: any) => d.level === level) || [];
    if (records.length === 0) return null;

    records.sort((a: any, b: any) => a.percobaan - b.percobaan);
    return records;
  };

  const handleSetLunasAllTahap = async (poin: any, isIjazahBased: boolean, santris: any[]) => {
    const updates: any[] = [];
    santris.forEach(santri => {
      let harus = poin.nominal;
      if (isIjazahBased && poin.nominalIjazah) {
        if (santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN') {
          harus = poin.nominalIjazah;
        }
      }
      const ps = santri.pembayaranSantri.find((s: any) => s.poinTahapId === poin.id);
      const dibayar = ps?.nominalDibayar || 0;
      if (dibayar < harus) { // Only if not lunas
        updates.push({
          santriId: santri.id,
          poinTahapId: poin.id,
          nominalHarus: harus
        });
      }
    });

    if (updates.length > 0) {
      setIsLoading(true);
      await bulkUpsertCicilanPembayaran(updates);
      setIsLoading(false);
    }
  };

  const handleSetLunasAllDL = async (level: number, santris: any[]) => {
    const updates: any[] = [];
    santris.forEach(santri => {
      const attempts = getDLRecords(santri, level);
      if (attempts) {
        attempts.forEach((dl: any) => {
          if (dl.nominalHarus > 0 && dl.nominalDibayar < dl.nominalHarus) {
            updates.push({ id: dl.id, nominalDibayar: dl.nominalHarus });
          }
        });
      }
    });

    if (updates.length > 0) {
      setIsLoading(true);
      await bulkUpdatePembayaranDL(updates);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-primary-light/20 dark:border-gray-700 flex flex-col h-[calc(100vh-140px)] w-full max-w-full lg:max-w-[calc(100vw-275px)] min-w-0 overflow-hidden">
      {/* Overdue Alert */}
      {overdueItems.length > 0 && !overdueAlertClosed && (
        <div className="bg-danger/10 border-l-4 border-danger p-3 m-4 mb-0 rounded-r shadow-sm flex items-start justify-between flex-shrink-0 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-2">
            <AlertCircle className="text-danger flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-danger font-bold text-sm">Peringatan: Ada {overdueItems.length} tagihan yang melewati jatuh tempo!</h3>
              <p className="text-danger/80 text-xs mt-1">
                Atas Nama: {overdueItems.slice(0, 3).map(o => `${o.santriNama} (${o.poinNama})`).join(', ')}{overdueItems.length > 3 ? ', dll.' : '.'}
              </p>
            </div>
          </div>
          <button onClick={() => setOverdueAlertClosed(true)} className="text-danger/60 hover:text-danger p-1"><X size={16} /></button>
        </div>
      )}

      {/* Meta Modal */}
      {metaModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 border-b border-primary-light/20 dark:border-gray-700 flex justify-between items-center bg-bg-cream dark:bg-gray-800/30">
              <h2 className="font-bold text-primary">Target & Catatan Global</h2>
              <button disabled={isLoading} onClick={() => setMetaModal(null)} className="text-text-secondary dark:text-gray-400 hover:text-danger"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-text-secondary dark:text-gray-400">Poin Tagihan: <span className="font-bold text-text-primary dark:text-gray-100">{metaModal.nama}</span></p>
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-gray-100 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={metaModal.tanggal}
                  onChange={e => setMetaModal({ ...metaModal, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-light/30 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-gray-100 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={3}
                  value={metaModal.catatan}
                  onChange={e => setMetaModal({ ...metaModal, catatan: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-light/30 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 outline-none focus:border-primary resize-none"
                  placeholder="Keterangan opsional yang berlaku untuk poin tagihan ini..."
                />
              </div>
              <button
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  if (metaModal.type === 'TAHAP' && metaModal.santriId && metaModal.poinTahapId) {
                    await updatePembayaranSantriMeta(metaModal.santriId, metaModal.poinTahapId, metaModal.tanggal ? new Date(metaModal.tanggal) : null, metaModal.catatan || null);
                  } else if (metaModal.type === 'DL') {
                    await updateDarulLughohMeta(metaModal.recordId, metaModal.tanggal ? new Date(metaModal.tanggal) : null, metaModal.catatan || null);
                  }
                  setIsLoading(false);
                  setMetaModal(null);
                }}
                className="w-full flex justify-center items-center gap-2 bg-primary text-white py-2 rounded-lg font-bold hover:bg-primary-dark transition break-words text-sm disabled:opacity-50"
              >
                {isLoading ? 'Menyimpan...' : <><Save size={16} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-primary-light/20 dark:border-gray-700 flex flex-shrink-0 flex-wrap gap-4 items-center bg-bg-cream dark:bg-gray-800/30">
        <div className="flex gap-2">
          {/* PERIODE FILTER */}
          <select
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary max-w-[200px]"
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
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary"
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
            className="px-3 py-1.5 rounded-lg border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-medium text-text-secondary dark:text-gray-400 focus:border-primary"
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
            placeholder="Cari NIC atau Nama..."
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm"
          />
          <input type="hidden" name="gelombangId" value={selectedGelombangId} />
        </form>

        <button 
          onClick={async () => {
            if (selectedPaketId === "all" || !selectedPaketId) {
              const Swal = (await import('sweetalert2')).default;
              Swal.fire({ icon: 'info', title: 'Pilih Paket Dulu', text: 'Silakan pilih/filter ke sebuah spesifik Paket Pembayaran terlebih dahulu sebelum mengimpor.' });
              return;
            }
            setIsImportModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg text-sm font-medium transition-colors shadow-sm ml-auto"
        >
          <Upload size={16} /> Import Excel
        </button>
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
                <h2 className="text-lg font-bold text-primary mb-3 mx-2 px-3 border-l-4 border-primary bg-white dark:bg-gray-900 py-1 inline-block shadow-sm rounded-r">
                  Paket: {pkt.nama}
                </h2>

                {pktSantris.length === 0 ? (
                  <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-primary-light/20 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400 italic text-sm shadow-sm inline-block min-w-full">
                    Belum ada data camaba di paket ini untuk gelombang yang dipilih.
                  </div>
                ) : (
                  <div className="relative border border-primary-light/20 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm inline-block min-w-full">
                    <table className="text-left border-collapse w-max">
                      <thead className="sticky top-0 z-20 shadow-sm bg-[#faf9f5] dark:bg-gray-800">
                        {/* Header Row 1: Groups */}
                        <tr className="text-text-primary dark:text-gray-100 text-sm border-b border-primary-light/20 dark:border-gray-700">
                          <th colSpan={2} className="p-2 border-r border-primary-light/20 dark:border-gray-700 bg-[#f4f2eb] dark:bg-gray-800 text-center font-bold sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Data Camaba</th>

                          {tahap1 && tahap1.poinTahap.length > 0 && (
                            <th colSpan={tahap1.poinTahap.length} className="p-2 border-r border-primary-light/20 dark:border-gray-700 text-center font-bold">{tahap1.nama}</th>
                          )}

                          <th colSpan={6} className="p-2 border-r border-primary-light/20 dark:border-gray-700 text-center font-bold bg-amber-50 text-amber-700">Dauroh Lughoh & Ta'hili (DL)</th>

                          {remainingTahaps.map((t: any) => t.poinTahap.length > 0 && (
                            <th key={t.id} colSpan={t.poinTahap.length} className="p-2 border-r border-primary-light/20 dark:border-gray-700 text-center font-bold">{t.nama}</th>
                          ))}

                          <th className="p-2 text-center font-bold bg-[#f4f2eb] dark:bg-gray-800 border-l border-primary-light/20 dark:border-gray-700">Summary</th>
                        </tr>

                        {/* Header Row 2: Sub-columns */}
                        <tr className="text-text-secondary dark:text-gray-400 text-xs border-b border-primary-light/20 dark:border-gray-700">
                          <th className="p-2 border-r border-primary-light/10 dark:border-gray-700 bg-white dark:bg-gray-900 min-w-[90px] sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">NIC</th>
                          <th className="p-2 border-r border-primary-light/20 dark:border-gray-700 bg-white dark:bg-gray-900 min-w-[170px] sticky left-[90px] z-30 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Nama</th>

                          {tahap1 && tahap1.poinTahap.map((poin: any) => (
                            <th key={poin.id} className="p-2 border-r border-primary-light/10 dark:border-gray-700 min-w-[160px] group" title={poin.nama}>
                              <div className="truncate w-full font-medium flex items-center justify-between">
                                <div className="flex justify-between w-full">
                                  <span className="truncate">{poin.nama}</span>
                                </div>
                                {tahap1.isIjazahBased && <span className="bg-warning text-white text-xs px-1.5 py-0.5 rounded shrink-0">Ijazah</span>}
                              </div>
                              <div className="text-xs text-text-secondary dark:text-gray-400 font-normal mt-0.5">
                                {tahap1.isIjazahBased && poin.nominalIjazah ? `${fmt(poin.nominal)} / ${fmt(poin.nominalIjazah)}` : fmt(poin.nominal)}
                              </div>
                              <button
                                onClick={() => handleSetLunasAllTahap(poin, tahap1.isIjazahBased, pktSantris)}
                                disabled={isLoading || pktSantris.length === 0}
                                className="mt-1.5 w-full text-xs bg-success/10 text-success hover:bg-success/20 border border-success/20 px-1 py-1 rounded transition-colors font-bold whitespace-nowrap outline-none disabled:opacity-50"
                              >
                                SET LUNAS ALL
                              </button>
                            </th>
                          ))}

                          {dlLevels.map((lvl) => (
                            <th key={lvl} className="p-2 border-r border-primary-light/10 dark:border-gray-700 min-w-[140px] bg-amber-50 text-amber-600 font-bold group">
                              <div className="text-center w-full">Level {lvl}</div>
                              <button
                                onClick={() => handleSetLunasAllDL(lvl, pktSantris)}
                                disabled={isLoading || pktSantris.length === 0}
                                className="mt-1.5 w-full text-xs bg-success/10 text-success hover:bg-success/20 border border-success/20 px-1 py-1 rounded transition-colors font-bold whitespace-nowrap outline-none disabled:opacity-50"
                              >
                                SET LUNAS ALL
                              </button>
                            </th>
                          ))}

                          {remainingTahaps.map((t: any) =>
                            t.poinTahap.map((poin: any) => (
                              <th key={poin.id} className="p-2 border-r border-primary-light/10 dark:border-gray-700 min-w-[160px] group" title={poin.nama}>
                                <div className="truncate w-full font-medium flex items-center justify-between">
                                  <div className="flex justify-between w-full">
                                    <span className="truncate">{poin.nama}</span>
                                  </div>
                                  {t.isIjazahBased && <span className="bg-warning text-white text-xs px-1.5 py-0.5 rounded shrink-0">Ijazah</span>}
                                </div>
                                <div className="text-xs text-text-secondary dark:text-gray-400 font-normal mt-0.5">
                                  {t.isIjazahBased && poin.nominalIjazah ? `${fmt(poin.nominal)} / ${fmt(poin.nominalIjazah)}` : fmt(poin.nominal)}
                                </div>
                                <button
                                  onClick={() => handleSetLunasAllTahap(poin, t.isIjazahBased, pktSantris)}
                                  disabled={isLoading || pktSantris.length === 0}
                                  className="mt-1.5 w-full text-xs bg-success/10 text-success hover:bg-success/20 border border-success/20 px-1 py-1 rounded transition-colors font-bold whitespace-nowrap outline-none disabled:opacity-50"
                                >
                                  SET LUNAS ALL
                                </button>
                              </th>
                            ))
                          )}
                          <th className="p-2 bg-white dark:bg-gray-900 border-l border-primary-light/20 dark:border-gray-700 min-w-[100px] text-center">Status</th>
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
                            <tr key={santri.id} className="border-b border-primary-light/10 dark:border-gray-700 hover:bg-[#faf9f5] dark:bg-gray-800 transition-colors group">
                              {/* Fixed Left Info */}
                              <td className="p-2 border-r border-primary-light/10 dark:border-gray-700 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 font-mono text-xs text-primary align-top whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">{santri.nis}</td>
                              <td className="p-2 border-r border-primary-light/20 dark:border-gray-700 sticky left-[90px] z-10 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 min-w-[170px] max-w-[180px] align-top shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                                <div className="font-bold text-text-primary dark:text-gray-100 text-sm truncate" title={santri.namaLengkap}>{santri.namaLengkap}</div>
                                <select
                                  className="text-sm mt-1 w-full border border-primary-light/30 dark:border-gray-700 rounded px-1 py-0.5 bg-gray-50 dark:bg-gray-800 outline-none text-text-secondary dark:text-gray-400 cursor-pointer hover:border-primary/50"
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

                                const isOverdue = !isInputLunas && ps?.tanggalJatuhTempo && new Date(ps.tanggalJatuhTempo) < now;
                                const borderClass = isInputLunas ? 'border-success/30 focus:border-success text-success' : isOverdue ? 'border-danger focus:border-danger text-danger bg-danger/5 ring-1 ring-danger/30' : 'border-warning/30 focus:border-warning text-warning-dark';

                                if (harus === 0) return <td key={poin.id} className="p-2 border-r border-primary-light/10 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400/30 align-top">-</td>

                                return (
                                  <td key={poin.id} className={`p-1.5 border-r border-primary-light/10 dark:border-gray-700 align-top ${isInputLunas ? 'bg-success/5' : isOverdue ? 'bg-danger/10' : 'bg-warning/5'}`}>
                                    <div className="flex flex-col gap-1 relative group/cell">
                                      <input
                                        title={poin.nama}
                                        type="text"
                                        value={displayStr}
                                        placeholder="0"
                                        onChange={(e) => handleCicilanChange(k, e.target.value)}
                                        onBlur={() => handleBlur(santri.id, poin.id, displayVal, dibayar, harus)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                        disabled={isLoading}
                                        className={`w-full px-2.5 py-1.5 text-sm outline-none border rounded bg-white dark:bg-gray-900 font-medium ${borderClass}`}
                                      />
                                      <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-1">
                                          {!isInputLunas ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleCicilanChange(k, String(harus));
                                                handleBlur(santri.id, poin.id, harus, dibayar, harus);
                                              }}
                                              className="text-xs bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                            >
                                              SET LUNAS
                                            </button>
                                          ) : <div />}
                                          <button
                                            type="button"
                                            title="Target & Catatan Cicilan"
                                            onClick={() => setMetaModal({ isOpen: true, type: 'TAHAP', recordId: ps?.id || '', santriId: santri.id, poinTahapId: poin.id, nama: poin.nama, tanggal: ps?.tanggalJatuhTempo ? new Date(ps.tanggalJatuhTempo).toISOString().split('T')[0] : '', catatan: ps?.catatan || '' })}
                                            className="text-primary/50 hover:text-primary outline-none"
                                          ><CalendarRange size={10} /></button>
                                        </div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400 text-right font-medium">
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
                                      <td key={lvl} className="p-2 border-r border-primary-light/10 dark:border-gray-700 text-center bg-gray-50/50 text-text-secondary dark:text-gray-400 align-top">
                                        <div className="text-xs font-bold text-success flex items-center justify-center gap-1"><CheckCircle2 size={12} /> LULUS</div>
                                        <div className="text-xs opacity-70 mt-0.5">TERLEWATI</div>
                                      </td>
                                    );
                                  }
                                  return <td key={lvl} className="p-2 border-r border-primary-light/10 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400/30 align-top">-</td>;
                                }

                                return (
                                  <td key={lvl} className="border-r border-primary-light/10 dark:border-gray-700 p-0 align-top max-w-[150px]">
                                    <div className="flex flex-col h-full">
                                      {attempts.map((dl: any, idx: number) => {
                                        const isFree = dl.nominalHarus === 0;

                                        if (isFree && dl.statusUjian === 'LULUS') {
                                          return (
                                            <div key={dl.id} className={`p-2 text-center bg-gray-50/50 text-text-secondary dark:text-gray-400 ${idx > 0 ? 'border-t border-primary-light/10 dark:border-gray-700' : ''}`}>
                                              <div className="text-xs font-bold text-success flex items-center justify-center gap-1"><CheckCircle2 size={12} /> LULUS</div>
                                              <div className="text-xs opacity-70 mt-0.5">TERLEWATI</div>
                                            </div>
                                          );
                                        }

                                        if ((dl.statusUjian === 'LULUS' || dl.statusUjian === 'REMIDI') && dl.nominalDibayar >= dl.nominalHarus) {
                                          return (
                                            <div key={dl.id} className={`p-1.5 text-center bg-success/5 ${idx > 0 ? 'border-t border-primary-light/10 dark:border-gray-700' : ''}`}>
                                              <div className="flex justify-between items-center text-xs font-bold px-1 mb-1">
                                                <span className="text-text-secondary dark:text-gray-400 text-xs">Tes Ke- {dl.percobaan}</span>
                                                <span>{dl.statusUjian === 'LULUS' ? '✅' : '🔄'}</span>
                                              </div>
                                              <div className="flex items-center justify-between px-1">
                                                <div className="text-xs font-bold text-success flex items-center gap-1">LUNAS</div>
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    const Swal = (await import('sweetalert2')).default;
                                                    const result = await Swal.fire({
                                                      title: 'Batalkan Pembayaran?',
                                                      text: `Yakin ingin mengulang nominal pembayaran menjadi 0 untuk DL Tes Ke- ${dl.percobaan}?`,
                                                      icon: 'warning',
                                                      showCancelButton: true,
                                                      confirmButtonText: 'Ya, Batalkan',
                                                      cancelButtonText: 'Tidak',
                                                      confirmButtonColor: '#e11d48'
                                                    });
                                                    if (result.isConfirmed) {
                                                      handleBlurDL(dl.id, 0, dl.nominalDibayar, dl.nominalHarus);
                                                    }
                                                  }}
                                                  disabled={isLoading}
                                                  className="text-xs text-danger/70 hover:text-danger underline outline-none disabled:opacity-50"
                                                  title="Batalkan pembayaran"
                                                >
                                                  Batal
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }

                                        const k = `dl-${dl.id}`;
                                        const displayVal = localCicilan[k] !== undefined ? localCicilan[k] : dl.nominalDibayar;
                                        const isInputLunas = displayVal >= dl.nominalHarus;
                                        const displayStr = displayVal === 0 ? '' : displayVal.toLocaleString('id-ID');
                                        const isOverdueDL = !isInputLunas && dl.tanggalJatuhTempo && new Date(dl.tanggalJatuhTempo) < now;
                                        const borderClassDL = isInputLunas ? 'border-success/30 focus:border-success text-success' : isOverdueDL ? 'border-danger focus:border-danger text-danger bg-danger/5 ring-1 ring-danger/30' : 'border-warning/30 focus:border-warning text-danger';

                                        return (
                                          <div key={dl.id} className={`p-1.5 ${idx > 0 ? 'border-t border-primary-light/10 dark:border-gray-700' : ''} ${isInputLunas ? 'bg-success/5' : isOverdueDL ? 'bg-danger/10' : 'bg-warning/5'}`}>
                                            <div className="flex flex-col gap-1 relative group/cell">
                                              <div className="flex justify-between items-center px-1 text-xs font-bold">
                                                <span className="text-text-secondary dark:text-gray-400 text-xs whitespace-nowrap">Tes Ke- {dl.percobaan}</span>
                                                {dl.statusUjian === 'LULUS' ? '✅' : dl.statusUjian === 'REMIDI' ? '🔄' : '⏳'}
                                              </div>
                                              <input
                                                title="Cicilan Pembayaran"
                                                type="text"
                                                value={displayStr}
                                                placeholder="0"
                                                onChange={(e) => handleCicilanChange(k, e.target.value)}
                                                onBlur={() => handleBlurDL(dl.id, displayVal, dl.nominalDibayar, dl.nominalHarus)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') e.currentTarget.blur();
                                                }}
                                                disabled={isLoading}
                                                className={`w-full px-2.5 py-1.5 text-sm outline-none border rounded bg-white dark:bg-gray-900 font-medium ${isInputLunas ? 'border-success/30 focus:border-success text-success' : 'border-warning/30 focus:border-warning text-danger'}`}
                                              />
                                              <div className="flex justify-between items-center px-1">
                                                <div className="flex items-center gap-1">
                                                  {!isInputLunas ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleCicilanChange(k, String(dl.nominalHarus));
                                                        handleBlurDL(dl.id, dl.nominalHarus, dl.nominalDibayar, dl.nominalHarus);
                                                      }}
                                                      className="text-xs bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                                    >
                                                      SET LUNAS
                                                    </button>
                                                  ) : <div />}
                                                  <button
                                                    type="button"
                                                    title="Target & Catatan Cicilan"
                                                    onClick={() => setMetaModal({ isOpen: true, type: 'DL', recordId: dl.id, nama: `DL Level ${dl.level}`, tanggal: dl.tanggalJatuhTempo ? new Date(dl.tanggalJatuhTempo).toISOString().split('T')[0] : '', catatan: dl.catatan || '' })}
                                                    className="text-primary/50 hover:text-primary outline-none"
                                                  ><CalendarRange size={10} /></button>
                                                </div>
                                                <div className="text-xs text-text-secondary dark:text-gray-400 text-right font-medium">
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

                                  const isOverdue = !isInputLunas && ps?.tanggalJatuhTempo && new Date(ps.tanggalJatuhTempo) < now;
                                  const borderClass = isInputLunas ? 'border-success/30 focus:border-success text-success' : isOverdue ? 'border-danger focus:border-danger text-danger bg-danger/5 ring-1 ring-danger/30' : 'border-warning/30 focus:border-warning text-warning-dark';

                                  if (harus === 0) return <td key={poin.id} className="p-2 border-r border-primary-light/10 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400/30 align-top">-</td>

                                  return (
                                    <td key={poin.id} className={`p-1.5 border-r border-primary-light/10 dark:border-gray-700 align-top ${isInputLunas ? 'bg-success/5' : isOverdue ? 'bg-danger/10' : 'bg-warning/5'}`}>
                                      <div className="flex flex-col gap-1 relative group/cell">
                                        <input
                                          type="text"
                                          value={displayStr}
                                          placeholder="0"
                                          onChange={(e) => handleCicilanChange(k, e.target.value)}
                                          onBlur={() => handleBlur(santri.id, poin.id, displayVal, dibayar, harus)}
                                          disabled={isLoading}
                                          className={`w-full px-2.5 py-1.5 text-sm outline-none border rounded bg-white dark:bg-gray-900 font-medium ${borderClass}`}
                                        />
                                        <div className="flex justify-between items-center px-1">
                                          <div className="flex items-center gap-1">
                                            {!isInputLunas ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleCicilanChange(k, String(harus));
                                                  handleBlur(santri.id, poin.id, harus, dibayar, harus);
                                                }}
                                                className="text-xs bg-success/20 text-success hover:bg-success/30 px-1 py-0.5 rounded transition-colors font-bold"
                                              >
                                                SET LUNAS
                                              </button>
                                            ) : <div />}
                                            <button
                                              type="button"
                                              title="Target & Catatan Cicilan"
                                              onClick={() => setMetaModal({ isOpen: true, type: 'TAHAP', recordId: ps?.id || '', santriId: santri.id, poinTahapId: poin.id, nama: poin.nama, tanggal: ps?.tanggalJatuhTempo ? new Date(ps.tanggalJatuhTempo).toISOString().split('T')[0] : '', catatan: ps?.catatan || '' })}
                                              className="text-primary/50 hover:text-primary outline-none"
                                            ><CalendarRange size={10} /></button>
                                          </div>
                                          <div className="text-xs text-text-secondary dark:text-gray-400 text-right font-medium">
                                            / {fmt(harus)}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })
                              )}

                              <td className="p-2 bg-white dark:bg-gray-900 group-hover:bg-[#faf9f5] dark:bg-gray-800 border-l border-primary-light/20 dark:border-gray-700 text-center align-top">
                                {globalKekurangan === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs font-bold rounded">
                                    <CheckCircle2 size={12} /> LUNAS
                                  </span>
                                ) : (
                                  <div className="text-xs font-bold text-danger text-center w-full whitespace-nowrap flex flex-col justify-center gap-0.5">
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

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        gelombangList={gelombangs}
        showGelombang={false}
        uploadUrl={`/api/admin/pembayaran/import`}
        templateUrl={`/api/admin/pembayaran/template?paketId=${selectedPaketId}`}
        onSuccess={() => {
          setIsImportModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
