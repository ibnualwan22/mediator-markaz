"use client";

import { generateTahap, updateStatusBayar } from "@/app/admin/(dashboard)/pembayaran/actions";
import { CheckCircle2, Plus, Clock, FileText } from "lucide-react";
import { useState } from "react";

export default function PembayaranManager({ santri, pembayaran }: { santri: any, pembayaran: any[] }) {
  const [isLoading, setIsLoading] = useState(false);

  // Map tahap yang sudah ada
  const payMap = new Map();
  pembayaran.forEach(p => {
    payMap.set(p.tahap, p);
  });

  const stages = [1, 2, 3, 4, 5, 6];

  const handleCreateTahap = async (t: number) => {
    setIsLoading(true);
    await generateTahap(santri.id, t);
    setIsLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsLoading(true);
    await updateStatusBayar(id, newStatus);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 p-6 md:p-8">
      <div className="flex justify-between items-center mb-8 border-b border-primary-light/20 pb-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-text-primary">Timeline Pembayaran 6 Tahap</h2>
          <p className="text-sm text-text-secondary mt-1">Riwayat Akademik: <span className="font-semibold">{santri.riwayatAkademik}</span></p>
        </div>
        <div className="bg-primary/5 px-4 py-2 rounded-xl text-primary font-bold text-sm border border-primary/20">
          Total Lunas: {pembayaran.filter(p => p.status === 'LUNAS').length} / 6
        </div>
      </div>

      <div className="space-y-4">
        {!santri.isVerified && (
           <div className="bg-primary/5 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm flex items-start gap-3">
             <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div>
               <strong>Perhatian:</strong> Santri ini belum terverifikasi (NIS belum ter-generate).<br/>
               Melunasi pembayaran <strong>Tahap 1</strong> akan otomatis memverifikasi santri, membuat NIS, dan menerbitkan tagihan tahap berikutnya.
             </div>
           </div>
        )}
        {stages.map(t => {
          const record = payMap.get(t);
          
          if (!record) {
            // Cek apakah tahap sebelumnya lunas, jika iya tampilkan tombol Buat
            const previousLunas = t === 1 || (payMap.has(t-1) && payMap.get(t-1).status === 'LUNAS');
            
            return (
              <div key={t} className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-primary-light/40 bg-bg-cream/50">
                <div className="w-12 h-12 flex-shrink-0 bg-primary-light/20 rounded-full flex items-center justify-center font-bold text-text-secondary">T{t}</div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-semibold text-text-secondary/70">Tahap {t} Belum Dibuat</h4>
                  <p className="text-xs text-text-secondary/50">Tagihan tahap ini belum di-generate sistem.</p>
                </div>
                {previousLunas ? (
                  <button 
                    disabled={isLoading}
                    onClick={() => handleCreateTahap(t)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-primary rounded-lg text-primary hover:bg-primary-light hover:text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Plus size={16} /> Buat Tagihan
                  </button>
                ) : (
                  <div className="text-xs text-text-secondary/50 font-medium px-4 py-2 bg-gray-100 rounded-lg">Menunggu Tahap {t-1} Lunas</div>
                )}
              </div>
            );
          }

          const isLunas = record.status === 'LUNAS';

          return (
            <div key={t} className={`flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl border ${isLunas ? 'border-success/30 bg-success/5 shadow-sm' : 'border-warning/30 bg-warning/5 shadow-sm'}`}>
              <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold ${isLunas ? 'bg-success text-white shadow-md' : 'bg-warning text-white shadow-md'}`}>
                {isLunas ? <CheckCircle2 size={24} /> : `T${t}`}
              </div>
              
              <div className="flex-1 w-full text-center sm:text-left">
                <h4 className={`font-bold ${isLunas ? 'text-success' : 'text-text-primary'}`}>
                  Tahap {t}: {record.keterangan}
                </h4>
                <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                   <div className="flex items-center gap-1 text-sm font-semibold">
                      <FileText size={14} className="text-text-secondary" />
                      Rp {record.nominal.toLocaleString('id-ID')}
                   </div>
                   <div className="flex items-center gap-1 text-xs">
                     <Clock size={14} className="text-text-secondary" /> 
                     {new Date(record.createdAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                   </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
                {isLunas ? (
                  <button 
                    disabled={isLoading}
                    onClick={() => handleUpdateStatus(record.id, 'BELUM_BAYAR')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-text-secondary hover:text-danger underline decoration-dashed disabled:opacity-50"
                  >
                    Batalkan Pelunasan
                  </button>
                ) : (
                  <button 
                    disabled={isLoading}
                    onClick={() => handleUpdateStatus(record.id, 'LUNAS')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-success text-white font-bold rounded-lg shadow-md hover:bg-success/80 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Mark as LUNAS
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
