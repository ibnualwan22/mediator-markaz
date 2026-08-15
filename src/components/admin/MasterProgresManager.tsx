"use client";

import { useState } from "react";
import { createTahapProgres } from "@/app/admin/(dashboard)/progres/actions";
import { Plus } from "lucide-react";

export default function MasterProgresManager({ tahaps }: { tahaps: any[] }) {
  const [formData, setFormData] = useState({
    nama: "",
    urutan: tahaps.length > 0 ? tahaps.length + 1 : 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;
    setIsLoading(true);
    await createTahapProgres(formData);
    setFormData(f => ({ ...f, nama: "", urutan: f.urutan + 1 }));
    setIsLoading(false);
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
                onChange={e => setFormData(f => ({ ...f, urutan: parseInt(e.target.value) }))} 
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm text-center" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
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
              </tr>
            </thead>
            <tbody>
              {tahaps.length > 0 ? tahaps.map(t => (
                <tr key={t.id} className="border-b border-primary-light/10 hover:bg-bg-cream/50">
                  <td className="p-4 text-center font-mono font-bold text-primary">{t.urutan}</td>
                  <td className="p-4 font-medium text-text-primary text-lg">{t.nama}</td>
                </tr>
              )) : (
                <tr><td colSpan={2} className="p-4 text-center text-text-secondary italic">Belum ada urutan tahap</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
