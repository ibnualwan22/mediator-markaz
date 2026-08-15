"use client";

import { useState } from "react";
import { createItemPemberkasan } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { Plus } from "lucide-react";

export default function MasterItemManager({ items }: { items: any[] }) {
  const [formData, setFormData] = useState({
    nama: "",
    tipe: "INDO",
    isWajib: true,
    urutan: 1
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;
    setIsLoading(true);
    await createItemPemberkasan(formData);
    setFormData(f => ({ ...f, nama: "", urutan: f.urutan + 1 }));
    setIsLoading(false);
  };

  const indoItems = items.filter(i => i.kategori === "INDONESIA");
  const mesirItems = items.filter(i => i.kategori === "MESIR");

  const renderTable = (data: any[], title: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 overflow-hidden mb-6">
      <div className="bg-primary/5 px-6 py-3 border-b border-primary-light/20">
        <h3 className="font-bold text-primary">{title} ({data.length} Item)</h3>
      </div>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-bg-cream/50 text-text-primary">
            <th className="p-4 font-semibold border-b border-primary-light/10 w-16 text-center">Urutan</th>
            <th className="p-4 font-semibold border-b border-primary-light/10">Nama Berkas</th>
            <th className="p-4 font-semibold border-b border-primary-light/10 w-32 text-center">Wajib?</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map(i => (
            <tr key={i.id} className="border-b border-primary-light/10 hover:bg-bg-cream/50">
              <td className="p-4 text-center font-mono">{i.urutan}</td>
              <td className="p-4 font-medium text-text-primary">{i.nama}</td>
              <td className="p-4 text-center">
                {i.isWajib ? (
                  <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-bold rounded">Wajib</span>
                ) : (
                  <span className="px-2 py-1 bg-text-secondary/10 text-text-secondary text-xs rounded">Opsional</span>
                )}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={3} className="p-4 text-center text-text-secondary italic">Belum ada item</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20 top-24 sticky">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Tambah Item
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Tipe Berkas</label>
              <select 
                value={formData.tipe} 
                onChange={e => setFormData(f => ({ ...f, tipe: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1 text-sm bg-bg-cream"
              >
                <option value="INDO">Dalam Negeri (INDO)</option>
                <option value="MESIR">Luar Negeri (MESIR)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Nama Berkas</label>
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
                <label className="text-sm text-text-secondary">Urutan</label>
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
        {renderTable(indoItems, "Berkas Dalam Negeri (INDO)")}
        {renderTable(mesirItems, "Berkas Luar Negeri (MESIR)")}
      </div>
    </div>
  );
}
