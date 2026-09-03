"use client";

import { useState } from "react";
import { createItemPemberkasan, updateItemPemberkasan, deleteItemPemberkasan, duplicateItemPemberkasanFromPeriode } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { Plus, Edit2, Trash2, X, Check, Copy } from "lucide-react";
import Swal from "sweetalert2";

export default function MasterItemManager({ items, periodes, currentPeriodeId }: { items: any[], periodes: any[], currentPeriodeId?: string }) {
  const [formData, setFormData] = useState({
    nama: "",
    tipe: "INDO",
    isWajib: true,
    urutan: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ id: "", nama: "", isWajib: true, urutan: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;
    setIsLoading(true);
    await createItemPemberkasan(formData);
    setFormData(f => ({ ...f, nama: "", urutan: f.urutan + 1 }));
    setIsLoading(false);
    Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleEditData = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ id: item.id, nama: item.nama, isWajib: item.isActive || false, urutan: item.urutan });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.nama) return;
    setIsLoading(true);
    await updateItemPemberkasan(editFormData.id, editFormData);
    setEditingId(null);
    setIsLoading(false);
    Swal.fire({ title: 'Diperbarui!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Berkas?',
      text: "Peringatan: Seluruh data centang pemberkasan camaba yang berhubungan dengan berkas ini akan raib!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!'
    });
    if (res.isConfirmed) {
      setIsLoading(true);
      await deleteItemPemberkasan(id);
      setIsLoading(false);
      Swal.fire({ title: 'Terhapus!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    }
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
      title: 'Duplikat Master Berkas',
      text: 'Pilih periode sumber untuk menyalin daftar berkasnya.',
      input: 'select',
      inputOptions: periodesOptions,
      inputPlaceholder: 'Pilih Periode',
      showCancelButton: true,
      confirmButtonText: 'Duplikat'
    });

    if (sourcePeriodeId && currentPeriodeId) {
      setIsLoading(true);
      const res = await duplicateItemPemberkasanFromPeriode(sourcePeriodeId, currentPeriodeId);
      setIsLoading(false);
      if (res.success) {
        Swal.fire('Berhasil', 'Berkas telah disalin!', 'success');
      } else {
        Swal.fire('Gagal', res.error, 'error');
      }
    }
  };

  const indoItems = items.filter(i => i.kategori === "INDONESIA");
  const mesirItems = items.filter(i => i.kategori === "MESIR");

  const renderTable = (data: any[], title: string) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 overflow-hidden mb-6">
      <div className="bg-primary/5 px-6 py-3 border-b border-primary-light/20 dark:border-gray-700">
        <h3 className="font-bold text-primary">{title} ({data.length} Item)</h3>
      </div>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-bg-cream dark:bg-gray-800/50 text-text-primary dark:text-gray-100">
            <th className="p-4 font-semibold border-b border-primary-light/10 dark:border-gray-700 w-16 text-center">Urutan</th>
            <th className="p-4 font-semibold border-b border-primary-light/10 dark:border-gray-700">Nama Berkas</th>
            <th className="p-4 font-semibold border-b border-primary-light/10 dark:border-gray-700 w-32 text-center">Wajib?</th>
            <th className="p-4 font-semibold border-b border-primary-light/10 dark:border-gray-700 w-24 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map(i => (
            <tr key={i.id} className={`border-b border-primary-light/10 dark:border-gray-700 ${editingId === i.id ? 'bg-primary/5' : 'hover:bg-bg-cream dark:bg-gray-800/50'}`}>
              {editingId === i.id ? (
                <>
                  <td className="p-2">
                    <input type="number" className="w-full px-2 py-1 text-center border rounded bg-white dark:bg-gray-900" value={editFormData.urutan} onChange={e => setEditFormData(f => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-900" value={editFormData.nama} onChange={e => setEditFormData(f => ({ ...f, nama: e.target.value }))} />
                  </td>
                  <td className="p-2 text-center">
                    <input type="checkbox" className="rounded" checked={editFormData.isWajib} onChange={e => setEditFormData(f => ({ ...f, isWajib: e.target.checked }))} />
                  </td>
                  <td className="p-2 text-center flex items-center justify-center gap-2">
                    <button onClick={handleSaveEdit} className="p-1.5 bg-success/10 text-success rounded hover:bg-success/20"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-danger/10 text-danger rounded hover:bg-danger/20"><X size={16} /></button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-4 text-center font-mono">{i.urutan}</td>
                  <td className="p-4 font-medium text-text-primary dark:text-gray-100">{i.nama}</td>
                  <td className="p-4 text-center">
                    {i.isActive ? (
                      <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-bold rounded">Wajib</span>
                    ) : (
                      <span className="px-2 py-1 bg-text-secondary/10 text-text-secondary dark:text-gray-400 text-xs rounded">Opsional</span>
                    )}
                  </td>
                  <td className="p-4 text-center flex items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditData(i)} className="text-primary hover:text-primary-dark transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(i.id)} className="text-danger hover:text-danger/80 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </>
              )}
            </tr>
          )) : (
            <tr><td colSpan={4} className="p-4 text-center text-text-secondary dark:text-gray-400 italic">Belum ada item</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 top-24 sticky">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Tambah Item
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary dark:text-gray-400">Tipe Berkas</label>
              <select 
                value={formData.tipe} 
                onChange={e => setFormData(f => ({ ...f, tipe: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm bg-bg-cream dark:bg-gray-800"
              >
                <option value="INDO">Dalam Negeri (INDO)</option>
                <option value="MESIR">Luar Negeri (MESIR)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary dark:text-gray-400">Nama Berkas</label>
              <input 
                type="text" 
                required 
                value={formData.nama} 
                onChange={e => setFormData(f => ({ ...f, nama: e.target.value }))} 
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm" 
                placeholder="Contoh: Legalisir Kemenag" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-secondary dark:text-gray-400">Urutan</label>
                <input 
                  type="number" 
                  required 
                  value={formData.urutan} 
                  onChange={e => setFormData(f => ({ ...f, urutan: parseInt(e.target.value) }))} 
                  className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm text-center" 
                />
              </div>
              <div className="flex flex-col justify-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    checked={formData.isWajib} 
                    onChange={e => setFormData(f => ({ ...f, isWajib: e.target.checked }))} 
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Wajib?
                </label>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 mt-2 shadow-sm"
            >
              Simpan Item
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        {items.length === 0 && (
           <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-primary-light/20 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400 flex flex-col items-center gap-4 mb-6">
             <div className="italic">Belum ada berkas pembayaran. Silakan buat di form, atau duplikat dari periode lalu.</div>
             <button 
                onClick={handleDuplicate}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-black dark:hover:bg-white rounded-lg transition-colors font-medium shadow-sm"
             >
                <Copy size={16} /> Duplikat dari Periode Lain 
             </button>
           </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-end mb-4">
             <button 
                onClick={handleDuplicate}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-primary-light/40 dark:border-gray-700 text-primary hover:bg-primary-light/10 hover:border-primary rounded-lg transition-all text-sm font-semibold shadow-sm"
             >
                <Copy size={16} /> Salin Berkas Periode Lain
             </button>
          </div>
        )}

        {renderTable(indoItems, "Berkas Dalam Negeri (INDO)")}
        {renderTable(mesirItems, "Berkas Luar Negeri (MESIR)")}
      </div>
    </div>
  );
}
