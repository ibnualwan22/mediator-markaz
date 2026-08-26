"use client";

import { useState } from "react";
import { 
  createPaket, deletePaket, setPaketDefault, 
  createTahapPaket, deleteTahapPaket, 
  createPoinTahap, deletePoinTahap,
  duplicatePaketFromPeriode
} from "@/app/admin/(dashboard)/pembayaran/actions";
import { Plus, Trash2, ChevronDown, ChevronRight, CheckCircle2, Bookmark, Copy } from "lucide-react";
import Swal from "sweetalert2";

export default function MasterPaketManager({ pakets, periodes, currentPeriodeId }: { pakets: any[], periodes: any[], currentPeriodeId?: string }) {
  const [expandedPaket, setExpandedPaket] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [paketForm, setPaketForm] = useState({ nama: "", urutan: 1, isDefault: false });
  const [tahapForm, setTahapForm] = useState({ nama: "", urutan: 1, isIjazahBased: false });
  const [poinForm, setPoinForm] = useState({ nama: "", urutan: 1, nominal: 0, nominalIjazah: 0 });

  const [activeFormTarget, setActiveFormTarget] = useState<{type: 'tahap' | 'poin', id: string} | null>(null);

  const handleCreatePaket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await createPaket(paketForm);
    setPaketForm({ nama: "", urutan: pakets.length + 1, isDefault: false });
    setIsLoading(false);
  };

  const handleCreateTahap = async (paketId: string, e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await createTahapPaket({ paketPembayaranId: paketId, ...tahapForm });
    setTahapForm({ nama: "", urutan: 1, isIjazahBased: false });
    setActiveFormTarget(null);
    setIsLoading(false);
  };

  const handleCreatePoin = async (tahapId: string, isIjazahBased: boolean, e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await createPoinTahap({
      tahapPaketId: tahapId,
      nama: poinForm.nama,
      urutan: poinForm.urutan,
      nominal: poinForm.nominal,
      nominalIjazah: isIjazahBased ? poinForm.nominalIjazah : undefined
    });
    setPoinForm({ nama: "", urutan: 1, nominal: 0, nominalIjazah: 0 });
    setActiveFormTarget(null);
    setIsLoading(false);
  };

  const handleDuplicate = async () => {
    const periodesOptions = periodes
      .filter((p: any) => p.id !== currentPeriodeId)
      .reduce((acc: any, p: any) => {
         acc[p.id] = p.nama;
         return acc;
      }, {});

    if (Object.keys(periodesOptions).length === 0) {
      Swal.fire('Info', 'Tidak ada periode lain yang tersedia untuk diduplikasi.', 'info');
      return;
    }

    const { value: sourcePeriodeId } = await Swal.fire({
      title: 'Duplikat Master Paket',
      text: 'Pilih periode sumber untuk menyalin seluruh paket, tahapan, dan poin tagihannya.',
      input: 'select',
      inputOptions: periodesOptions,
      inputPlaceholder: 'Pilih Periode',
      showCancelButton: true,
      confirmButtonText: 'Duplikat Sekarang'
    });

    if (sourcePeriodeId && currentPeriodeId) {
      setIsLoading(true);
      const res = await duplicatePaketFromPeriode(sourcePeriodeId, currentPeriodeId);
      setIsLoading(false);
      if (res.success) {
        Swal.fire('Berhasil', 'Paket telah diduplikasi secara menyeluruh!', 'success');
      } else {
        Swal.fire('Gagal', res.error, 'error');
      }
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* KIRI - Form Tambah Paket */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20 sticky top-24">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Tambah Paket Baru
          </h3>
          <form onSubmit={handleCreatePaket} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Nama Paket</label>
              <input type="text" required value={paketForm.nama} onChange={e => setPaketForm(f => ({ ...f, nama: e.target.value }))} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm" placeholder="Contoh: Paket Reguler" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary">Urutan</label>
                <input type="number" required value={paketForm.urutan} onChange={e => setPaketForm(f => ({ ...f, urutan: parseInt(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm text-center" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={paketForm.isDefault} onChange={e => setPaketForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded text-primary focus:ring-primary h-4 w-4" />
                  Set Default?
                </label>
              </div>
            </div>
              <button type="submit" disabled={isLoading} className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 mt-2 shadow-sm">
              Buat Paket
            </button>
          </form>
        </div>
      </div>

      {/* KANAN - List Paket */}
      <div className="md:col-span-2 space-y-4">
        {pakets.length === 0 && (
           <div className="bg-white p-8 rounded-2xl border border-primary-light/20 text-center text-text-secondary flex flex-col items-center gap-4">
             <div className="italic">Belum ada paket pembayaran. Silakan buat di form, atau duplikat dari periode lalu agar lebih cepat.</div>
             <button 
                onClick={handleDuplicate}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-text-primary text-white hover:bg-black rounded-lg transition-colors font-medium shadow-sm"
             >
                <Copy size={16} /> Duplikat dari Periode Lain 
             </button>
           </div>
        )}

        {pakets.length > 0 && (
          <div className="flex justify-end mb-4">
             <button 
                onClick={handleDuplicate}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-light/40 text-primary hover:bg-primary-light/10 hover:border-primary rounded-lg transition-all text-sm font-semibold shadow-sm"
             >
                <Copy size={16} /> Salin Paket Periode Lain
             </button>
          </div>
        )}

        {pakets.map(paket => (
          <div key={paket.id} className="bg-white rounded-2xl shadow-sm border border-primary-light/20 overflow-hidden">
            {/* Header Paket */}
            <div 
              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedPaket === paket.id ? 'bg-primary/5 border-b border-primary-light/20' : 'hover:bg-bg-cream'}`}
              onClick={() => setExpandedPaket(p => p === paket.id ? null : paket.id)}
            >
              <div className="flex items-center gap-3">
                {expandedPaket === paket.id ? <ChevronDown size={20} className="text-primary" /> : <ChevronRight size={20} className="text-text-secondary" />}
                <div>
                  <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                    {paket.nama} 
                    {paket.isDefault && <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] uppercase font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={12}/> Default</span>}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {!paket.isDefault && (
                  <button onClick={() => setPaketDefault(paket.id)} className="p-2 text-text-secondary hover:text-success rounded-lg hover:bg-success/10 transition-colors" title="Set Default">
                    <Bookmark size={16} />
                  </button>
                )}
                <button onClick={() => deletePaket(paket.id)} className="p-2 text-text-secondary hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Konten Tahap */}
            {expandedPaket === paket.id && (
              <div className="p-4 bg-bg-cream/30 space-y-4">
                {/* List Tahap */}
                {paket.tahapPaket.map((tahap: any) => (
                  <div key={tahap.id} className="bg-white border text-sm border-primary-light/20 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-bg-cream/50 p-3 border-b border-primary-light/10 flex justify-between items-center">
                      <div className="font-semibold text-text-primary flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary/10 text-primary flex items-center justify-center rounded-full text-xs">{tahap.urutan}</span>
                        {tahap.nama}
                        {tahap.isIjazahBased && <span className="px-1.5 py-0.5 bg-warning/10 text-warning text-[10px] font-bold rounded">Ijazah Based</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setActiveFormTarget({type: 'poin', id: tahap.id})} className="text-xs px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded transition-colors font-medium">+ Poin</button>
                        <button onClick={() => deleteTahapPaket(tahap.id)} className="text-xs px-2 py-1 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    
                    {/* List Poin */}
                    <div className="p-3">
                      {tahap.poinTahap.length === 0 ? (
                        <p className="text-xs text-text-secondary italic">Belum ada poin pembayaran.</p>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-text-secondary">
                              <th className="pb-2 font-medium w-8">No</th>
                              <th className="pb-2 font-medium">Nama Poin</th>
                              <th className="pb-2 font-medium">Nominal</th>
                              {tahap.isIjazahBased && <th className="pb-2 font-medium">Nominal Khusus (MA/P)</th>}
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tahap.poinTahap.map((poin: any) => (
                              <tr key={poin.id} className="border-t border-primary-light/10">
                                <td className="py-2">{poin.urutan}</td>
                                <td className="py-2 font-medium text-text-primary">{poin.nama}</td>
                                <td className="py-2">Rp {poin.nominal.toLocaleString('id-ID')}</td>
                                {tahap.isIjazahBased && <td className="py-2 text-warning font-medium">Rp {poin.nominalIjazah?.toLocaleString('id-ID')}</td>}
                                <td className="py-2 text-right">
                                  <button onClick={() => deletePoinTahap(poin.id)} className="text-danger hover:bg-danger/10 p-1 rounded"><Trash2 size={14}/></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Form Tambah Poin (Inline) */}
                    {activeFormTarget?.type === 'poin' && activeFormTarget.id === tahap.id && (
                      <div className="bg-primary/5 p-4 border-t border-primary-light/20">
                        <form onSubmit={(e) => handleCreatePoin(tahap.id, tahap.isIjazahBased, e)} className="flex items-end gap-3">
                           <div className="flex-1">
                             <label className="text-[10px] text-text-secondary">Nama Poin</label>
                             <input type="text" required value={poinForm.nama} onChange={e => setPoinForm(f => ({ ...f, nama: e.target.value }))} className="w-full px-2 py-1.5 rounded border text-xs outline-none" />
                           </div>
                           <div className="w-16">
                             <label className="text-[10px] text-text-secondary">Urutan</label>
                             <input type="number" required value={poinForm.urutan} onChange={e => setPoinForm(f => ({ ...f, urutan: parseInt(e.target.value) }))} className="w-full px-2 py-1.5 rounded border text-xs text-center outline-none" />
                           </div>
                           <div className="w-32">
                             <label className="text-[10px] text-text-secondary">Nominal {tahap.isIjazahBased ? '(Umum)' : ''}</label>
                             <input type="number" required value={poinForm.nominal || ''} onChange={e => setPoinForm(f => ({ ...f, nominal: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 rounded border text-xs outline-none" />
                           </div>
                           {tahap.isIjazahBased && (
                             <div className="w-32">
                               <label className="text-[10px] text-text-secondary">Nominal (MA/P)</label>
                               <input type="number" required value={poinForm.nominalIjazah || ''} onChange={e => setPoinForm(f => ({ ...f, nominalIjazah: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 rounded border text-xs outline-none bg-warning/5 border-warning/30" />
                             </div>
                           )}
                           <button type="submit" disabled={isLoading} className="px-3 py-1.5 bg-primary text-white text-xs rounded font-medium disabled:opacity-50 h-[30px] mb-0.5">Simpan</button>
                           <button type="button" onClick={() => setActiveFormTarget(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded font-medium h-[30px] mb-0.5">Batal</button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}

                {/* Form Tambah Tahap */}
                {activeFormTarget?.type === 'tahap' && activeFormTarget.id === paket.id ? (
                  <div className="bg-white p-4 rounded-xl border border-primary text-sm shadow-sm">
                    <h4 className="font-bold mb-3">Tambah Tahap Baru</h4>
                    <form onSubmit={(e) => handleCreateTahap(paket.id, e)} className="grid grid-cols-4 gap-4 items-end">
                      <div className="col-span-2">
                        <label className="text-xs text-text-secondary">Nama Tahap</label>
                        <input type="text" required value={tahapForm.nama} onChange={e => setTahapForm(f => ({ ...f, nama: e.target.value }))} className="w-full px-2 py-1.5 rounded border text-sm outline-none mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Urutan</label>
                        <input type="number" required value={tahapForm.urutan} onChange={e => setTahapForm(f => ({ ...f, urutan: parseInt(e.target.value) }))} className="w-full px-2 py-1.5 rounded border text-sm text-center outline-none mt-1" />
                      </div>
                      <div className="pb-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                          <input type="checkbox" checked={tahapForm.isIjazahBased} onChange={e => setTahapForm(f => ({ ...f, isIjazahBased: e.target.checked }))} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" />
                          Ijazah Based
                        </label>
                      </div>
                      <div className="col-span-4 flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setActiveFormTarget(null)} className="px-3 py-1.5 text-xs text-text-secondary hover:bg-gray-100 rounded font-medium">Batal</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-1.5 text-xs bg-primary text-white rounded font-medium disabled:opacity-50 shadow-sm">Simpan Tahap</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveFormTarget({type: 'tahap', id: paket.id})}
                    className="w-full py-3 border-2 border-dashed border-primary-light/40 rounded-xl text-primary font-medium hover:bg-primary-light/10 hover:border-primary-light transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Tambah Tahap Baru
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
