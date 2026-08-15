"use client";

import { useState } from "react";
import { updateProgresSantri } from "@/app/admin/(dashboard)/progres/actions";
import { CheckCircle2, ChevronRight, Edit3 } from "lucide-react";

export default function ProgresTracker({ progresDaftar }: { progresDaftar: any[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingCatatan, setEditingCatatan] = useState<string | null>(null);
  const [tempCatatan, setTempCatatan] = useState("");

  const tahaps = [...progresDaftar].sort((a,b) => a.tahapProgres.urutan - b.tahapProgres.urutan);

  const handleToggle = async (id: string, currentIsSelesai: boolean) => {
    setIsLoading(true);
    await updateProgresSantri(id, !currentIsSelesai);
    setIsLoading(false);
  };

  const handleSaveCatatan = async (id: string, isSelesai: boolean) => {
    setIsLoading(true);
    await updateProgresSantri(id, isSelesai, tempCatatan);
    setEditingCatatan(null);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-8 sm:left-12 top-0 bottom-0 w-1 bg-primary-light/20 -z-10 rounded-full"></div>
        
        {tahaps.map((p, idx) => {
          const isLunas = p.selesai;
          return (
            <div key={p.id} className="relative flex items-start gap-4 sm:gap-6 mb-8 group">
              <div 
                onClick={() => handleToggle(p.id, isLunas)}
                className={`w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center rounded-full border-4 cursor-pointer transition-all shadow-sm z-10 
                  ${isLunas ? 'bg-success border-success text-white' : 'bg-white border-primary-light/40 text-text-secondary hover:border-primary'} 
                  ${isLoading ? 'opacity-50 pointer-events-none' : ''}`
                }
              >
                {isLunas ? <CheckCircle2 size={32} /> : <span className="font-bold font-mono text-xl">{p.tahapProgres.urutan}</span>}
              </div>

              <div className={`flex-1 bg-white p-5 sm:p-6 rounded-2xl border transition-all mt-1 
                ${isLunas ? 'border-success/30 shadow-md ring-1 ring-success/10' : 'border-primary-light/20 shadow-sm'}`
              }>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className={`font-heading font-bold text-lg sm:text-xl ${isLunas ? 'text-success' : 'text-text-primary'}`}>
                    {p.tahapProgres.nama}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isLunas ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-secondary'}`}>
                      {isLunas ? 'SELESAI' : 'BELUM'}
                    </span>
                  </div>
                </div>

                {editingCatatan === p.id ? (
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="text" 
                      value={tempCatatan}
                      onChange={e => setTempCatatan(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-bg-cream border border-primary-light/50 rounded outline-none focus:border-primary text-sm"
                      placeholder="Masukkan catatan / detail..."
                    />
                    <button 
                      onClick={() => handleSaveCatatan(p.id, p.selesai)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-primary text-white font-medium rounded text-sm hover:bg-primary-light"
                    >
                      Simpan
                    </button>
                    <button 
                      onClick={() => setEditingCatatan(null)}
                      className="px-3 py-1.5 text-text-secondary hover:text-danger text-sm"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4 mt-2 bg-bg-cream/50 p-3 rounded-lg border border-primary-light/10 group-hover:border-primary-light/30 transition-colors">
                    <p className={`text-sm ${p.keterangan ? 'text-text-secondary' : 'text-text-secondary/50 italic'}`}>
                      {p.keterangan || "Tidak ada catatan."}
                    </p>
                    <button 
                      onClick={() => {
                        setTempCatatan(p.keterangan || "");
                        setEditingCatatan(p.id);
                      }}
                      className="text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {tahaps.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-primary-light/20 text-center italic text-text-secondary shadow-sm ml-8 sm:ml-12">
            Belum ada tahap makro yang disetup untuk santri ini. Klik 'Sync Master Tahap' di atas.
          </div>
        )}
      </div>
    </div>
  );
}
