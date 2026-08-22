"use client";

import { useState } from "react";
import { createTahapProgres, updateTahapProgres, deleteTahapProgres } from "@/app/admin/(dashboard)/progres/actions";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";

export default function MasterProgresManager({ tahaps, selectedPeriodeId }: { tahaps: any[], selectedPeriodeId: string }) {
  const [formData, setFormData] = useState({
    nama: "",
    urutan: tahaps.length > 0 ? tahaps.length + 1 : 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ id: "", nama: "", isActive: true, urutan: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !selectedPeriodeId) return;
    setIsLoading(true);
    await createTahapProgres({ ...formData, periodeId: selectedPeriodeId });
    setFormData(f => ({ ...f, nama: "", urutan: f.urutan + 1 }));
    setIsLoading(false);
  };

  const handleEditData = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ id: item.id, nama: item.nama, isActive: item.isActive ?? true, urutan: item.urutan });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.nama) return;
    setIsLoading(true);
    await updateTahapProgres(editFormData.id, editFormData);
    setEditingId(null);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus tahap ini? Seluruh data progres santri yang bersangkutan akan lenyap!")) {
      setIsLoading(true);
      await deleteTahapProgres(id);
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20 top-24 sticky">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Tambah Tahap
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Nama Tahap Makro</label>
              <input 
                type="text" 
                required 
                value={formData.nama} 
                onChange={e => setFormData(f => ({ ...f, nama: e.target.value }))} 
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm" 
                placeholder="Contoh: Tahdid Mustawa" 
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary">Urutan</label>
              <input 
                type="number" 
                required 
                value={formData.urutan} 
                onChange={e => setFormData(f => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} 
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm text-center" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || !selectedPeriodeId}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 mt-2 shadow-sm"
            >
              Simpan Tahap
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 overflow-hidden mb-6">
          <div className="bg-primary/5 px-6 py-3 border-b border-primary-light/20">
            <h3 className="font-bold text-primary">Tahap Progres Studi ({tahaps.length} Tahap)</h3>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-bg-cream/50 text-text-primary">
                <th className="p-4 font-semibold border-b border-primary-light/10 w-16 text-center">Urutan</th>
                <th className="p-4 font-semibold border-b border-primary-light/10">Nama Makro Tahap</th>
                <th className="p-4 font-semibold border-b border-primary-light/10 w-24 text-center">Aktif?</th>
                <th className="p-4 font-semibold border-b border-primary-light/10 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tahaps.length > 0 ? tahaps.map(t => (
                <tr key={t.id} className={`border-b border-primary-light/10 ${editingId === t.id ? 'bg-primary/5' : 'hover:bg-bg-cream/50'}`}>
                  {editingId === t.id ? (
                    <>
                      <td className="p-2">
                        <input type="number" className="w-full px-2 py-1 text-center border rounded bg-white" value={editFormData.urutan} onChange={e => setEditFormData(f => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} />
                      </td>
                      <td className="p-2">
                        <input type="text" className="w-full px-2 py-1 border rounded bg-white" value={editFormData.nama} onChange={e => setEditFormData(f => ({ ...f, nama: e.target.value }))} />
                      </td>
                      <td className="p-2 text-center">
                        <input type="checkbox" className="rounded" checked={editFormData.isActive} onChange={e => setEditFormData(f => ({ ...f, isActive: e.target.checked }))} />
                      </td>
                      <td className="p-2 text-center flex items-center justify-center gap-2">
                        <button onClick={handleSaveEdit} className="p-1.5 bg-success/10 text-success rounded hover:bg-success/20"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-danger/10 text-danger rounded hover:bg-danger/20"><X size={16} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-center font-mono font-bold text-primary">{t.urutan}</td>
                      <td className="p-4 font-medium text-text-primary text-lg">{t.nama}</td>
                      <td className="p-4 text-center">
                        {t.isActive ? (
                          <span className="px-2 py-1 bg-success/10 text-success text-xs font-bold rounded">Aktif</span>
                        ) : (
                          <span className="px-2 py-1 bg-text-secondary/10 text-text-secondary text-xs rounded">Non-Aktif</span>
                        )}
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditData(t)} className="text-primary hover:text-primary-dark transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} className="text-danger hover:text-danger/80 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center text-text-secondary italic">Belum ada urutan tahap pada periode ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
