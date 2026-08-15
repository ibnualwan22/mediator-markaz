"use client";

import { useState } from "react";
import { updateStatusPemberkasan } from "@/app/admin/(dashboard)/pemberkasan/actions";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function PemberkasanTracker({ pemberkasanDaftar }: { pemberkasanDaftar: any[] }) {
  const [isLoading, setIsLoading] = useState(false);

  const indoItems = pemberkasanDaftar.filter(p => p.itemPemberkasan.kategori === "INDONESIA").sort((a,b) => a.itemPemberkasan.urutan - b.itemPemberkasan.urutan);
  const mesirItems = pemberkasanDaftar.filter(p => p.itemPemberkasan.kategori === "MESIR").sort((a,b) => a.itemPemberkasan.urutan - b.itemPemberkasan.urutan);

  const handleUpdate = async (id: string, isDone: boolean) => {
    setIsLoading(true);
    // updateStatusPemberkasan expects string status in older logic, let's map it:
    await updateStatusPemberkasan(id, isDone ? "BELUM" : "SELESAI");
    setIsLoading(false);
  };

  const getStatusDisplay = (isDone: boolean) => {
    if (isDone) {
      return <span className="flex items-center gap-1.5 px-3 py-1 bg-success text-white rounded-full text-xs font-bold"><CheckCircle2 size={14} /> Selesai</span>
    } else {
      return <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-200 text-text-secondary rounded-full text-xs font-bold"><AlertCircle size={14} /> Belum</span>
    }
  };

  const renderSection = (items: any[], title: string, bgClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className={`rounded-2xl border border-primary-light/20 overflow-hidden ${bgClass} mb-6`}>
        <div className="px-6 py-4 border-b border-primary-light/20 flex justify-between items-center bg-white/50">
          <h3 className="font-heading font-bold text-text-primary text-lg">{title}</h3>
          <div className="text-sm font-semibold text-text-secondary">
            {items.filter(i => i.sudahDikumpulkan).length} / {items.length} Selesai
          </div>
        </div>
        <div className="divide-y divide-primary-light/10">
          {items.map(p => (
            <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 hover:bg-white transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-mono font-bold text-primary flex-shrink-0 mt-0.5">
                  {p.itemPemberkasan.urutan}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text-primary">{p.itemPemberkasan.nama}</h4>
                    {p.itemPemberkasan.isActive && <span className="text-[10px] uppercase font-bold text-danger px-1.5 py-0.5 bg-danger/10 rounded">Wajib</span>}
                  </div>
                  {p.catatan && <p className="text-xs text-text-secondary mt-1 max-w-sm">Catatan: {p.catatan}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 sm:justify-end">
                <div className="w-28 flex justify-end">
                  {getStatusDisplay(p.sudahDikumpulkan)}
                </div>
                <button 
                  disabled={isLoading}
                  onClick={() => handleUpdate(p.id, p.sudahDikumpulkan)}
                  className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-primary/20"
                >
                  Ubah Status
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Checklist Sections */}
      {renderSection(indoItems, "Berkas Dalam Negeri (Indonesia)", "bg-blue-50/50")}
      {renderSection(mesirItems, "Proses Luar Negeri (Mesir)", "bg-amber-50/50")}
      
      {pemberkasanDaftar.length === 0 && (
         <div className="text-center p-8 bg-white border border-primary-light/20 rounded-2xl italic text-text-secondary">
           Santri belum memiliki checklist pemberkasan. Jika master item sudah diisi, tekan tombol inisialisasi di atas.
         </div>
      )}
    </div>
  );
}
