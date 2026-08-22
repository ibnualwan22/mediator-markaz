import { getSantriSession } from "@/lib/santri-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default async function PembayaranSantriPage() {
  const session = await getSantriSession();
  if (!session) redirect("/santri/login");

  // Ambil santri beserta dengan relasi pembayaran
  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      paketPembayaran: {
        include: {
          tahapPaket: {
            orderBy: { urutan: 'asc' },
            include: {
              poinTahap: { orderBy: { urutan: 'asc' } }
            }
          }
        }
      },
      pembayaranSantri: {
        include: {
          poinTahap: true
        }
      },
      darulLughoh: {
        orderBy: [
          { level: 'asc' },
          { percobaan: 'asc' }
        ]
      }
    }
  });

  if (!santri) redirect("/santri/login");

  // Jika belum di-assign paket
  if (!santri.paketPembayaran) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Status Pembayaran</h1>
          <p className="text-text-secondary mt-1">Lacak dan lihat histori pembayaran cicilan Anda.</p>
        </div>
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-warning mb-3" />
          <h3 className="font-heading font-bold text-warning text-lg">Belum Dapat Paket</h3>
          <p className="text-warning/80 mt-1">Anda belum dimasukkan ke dalam paket pembayaran oleh admin. Silakan hubungi admin.</p>
        </div>
      </div>
    );
  }

  // Hitung total
  let totalHarus = 0;
  let totalDibayar = 0;

  // Siapkan data per tahap
  const stagesData = santri.paketPembayaran.tahapPaket.map(tahap => {
    let tahapHarus = 0;
    let tahapDibayar = 0;

    const poinList = tahap.poinTahap.map(poin => {
      // Cari record pembayaran untuk poin ini
      const paymentRecord = santri.pembayaranSantri.find(p => p.poinTahapId === poin.id);
      
      // Jika pembayaran belum ada (misal digenerate on logic / blm dibikin)
      let harus = 0;
      if (paymentRecord) {
        harus = paymentRecord.nominalHarus;
      } else {
        // Fallback hitung
        harus = (tahap.isIjazahBased && ['MA', 'IJAZAH_PESANTREN'].includes(santri.riwayatAkademik) && poin.nominalIjazah !== null)
          ? poin.nominalIjazah
          : poin.nominal;
      }

      let dibayar = paymentRecord ? paymentRecord.nominalDibayar : 0;
      let status = paymentRecord?.isLunas ? 'LUNAS' : 'BELUM';

      tahapHarus += harus;
      tahapDibayar += dibayar;

      return {
        id: poin.id,
        nama: poin.nama,
        harus,
        dibayar,
        status,
        terakhirUpdate: paymentRecord?.updatedAt,
      };
    });

    totalHarus += tahapHarus;
    totalDibayar += tahapDibayar;

    let tahapStatus = "BELUM";
    if (tahapDibayar >= tahapHarus && tahapHarus > 0) tahapStatus = "LUNAS";
    else if (tahapDibayar > 0) tahapStatus = "SEBAGIAN";

    return {
      id: tahap.id,
      nama: tahap.nama,
      harus: tahapHarus,
      dibayar: tahapDibayar,
      status: tahapStatus,
      poinList,
      isDarulLughoh: false
    };
  });
  
  if (santri.darulLughoh && santri.darulLughoh.length > 0) {
    let dlHarus = 0;
    let dlDibayar = 0;
    
    const poinList = santri.darulLughoh.map(dl => {
      dlHarus += dl.nominalHarus;
      dlDibayar += dl.nominalDibayar;
      
      const isRemidi = dl.percobaan > 1;
      return {
        id: dl.id,
        nama: `Pelunasan Level ${dl.level}${isRemidi ? ` (Remidi Percobaan ke-${dl.percobaan})` : ''}`,
        harus: dl.nominalHarus,
        dibayar: dl.nominalDibayar,
        status: dl.isLunas ? 'LUNAS' : 'BELUM',
        terakhirUpdate: dl.updatedAt,
      };
    });

    let dlStatus = "BELUM";
    if (dlDibayar >= dlHarus && dlHarus > 0) dlStatus = "LUNAS";
    else if (dlDibayar > 0) dlStatus = "SEBAGIAN";

    const dlStage = {
      id: "darul-lughoh",
      nama: "Biaya Darul Lughoh",
      harus: dlHarus,
      dibayar: dlDibayar,
      status: dlStatus,
      poinList,
      isDarulLughoh: true
    };

    totalHarus += dlHarus;
    totalDibayar += dlDibayar;

    if (stagesData.length > 0) {
      stagesData.splice(1, 0, dlStage); // Insert at index 1 (after Tahap 1)
    } else {
      stagesData.push(dlStage);
    }
  }

  const percent = totalHarus > 0 ? Math.min(100, Math.round((totalDibayar / totalHarus) * 100)) : 0;
  const sisa = Math.max(0, totalHarus - totalDibayar);

  // Format rupiah
  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Status Pembayaran</h1>
        <p className="text-text-secondary mt-1">Paket: {santri.paketPembayaran.nama}</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary font-medium mb-1 flex items-center gap-1.5">
              <CreditCard size={16} /> Total Harus Dibayar
            </span>
            <span className="text-2xl font-bold text-text-primary">{formatRp(totalHarus)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary font-medium mb-1">Total Sudah Dibayar</span>
            <span className="text-2xl font-bold text-success">{formatRp(totalDibayar)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary font-medium mb-1">Sisa Kekurangan</span>
            <span className="text-2xl font-bold text-warning">{formatRp(sisa)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-text-secondary">Progress Pembayaran</span>
            <span className="text-sm font-bold text-primary">{percent}%</span>
          </div>
          <div className="h-3 w-full bg-bg-cream rounded-full overflow-hidden border border-primary/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-1000 ease-out rounded-full relative" 
              style={{ width: `${percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Rincian per Tahap */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-text-primary mt-8 mb-4">Rincian per Tahap</h2>
        
        {stagesData.map((tahap, idx) => (
          <div key={tahap.id} className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
            {/* Header Tahap */}
            <div className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${tahap.status === 'LUNAS' ? 'bg-success/5 border-success/20' : 'bg-bg-cream border-primary-light/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  tahap.status === 'LUNAS' ? 'bg-success text-white' : 
                  tahap.status === 'SEBAGIAN' ? 'bg-warning text-white' : 
                  'bg-white text-text-secondary border border-text-secondary/20'
                }`}>
                  {tahap.status === 'LUNAS' ? <CheckCircle2 size={18} /> : 
                   tahap.status === 'SEBAGIAN' ? <Clock size={18} /> : 
                   <span className="text-sm font-bold">{idx + 1}</span>}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-text-primary">{tahap.nama}</h3>
                  <p className="text-xs text-text-secondary">
                    {tahap.status === 'LUNAS' ? 'Semua poin telah lunas' : 
                     tahap.status === 'SEBAGIAN' ? 'Sedang dicicil' : 'Belum dibayar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:justify-end gap-4 text-sm font-mono">
                <div className="flex flex-col text-right">
                  <span className="text-text-secondary text-xs">Total Tahap</span>
                  <span className="font-bold">{formatRp(tahap.harus)}</span>
                </div>
              </div>
            </div>

            {/* List Poin */}
            <div className="divide-y divide-primary-light/5">
              {tahap.poinList.map((poin) => (
                <div key={poin.id} className="p-4 sm:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors hover:bg-bg-cream/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-text-primary">{poin.nama}</p>
                    {poin.status === 'LUNAS' && poin.terakhirUpdate && (
                      <p className="text-[11px] text-text-secondary mt-1">
                        Selesai pada: {new Date(poin.terakhirUpdate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-8 text-sm font-mono shrink-0">
                    <div className="w-28 text-right">
                      <span className="block text-[10px] uppercase text-text-secondary tracking-wider font-sans mb-0.5">Harus</span>
                      {formatRp(poin.harus)}
                    </div>
                    <div className="w-28 text-right">
                      <span className="block text-[10px] uppercase text-text-secondary tracking-wider font-sans mb-0.5">Dibayar</span>
                      <span className={poin.dibayar >= poin.harus ? 'text-success font-bold' : poin.dibayar > 0 ? 'text-warning font-bold' : ''}>
                        {formatRp(poin.dibayar)}
                      </span>
                    </div>
                    <div className="w-24 text-right">
                      {poin.status === 'LUNAS' ? (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-success/15 text-success text-[11px] font-bold tracking-wider">
                          <CheckCircle2 size={12} className="mr-1" /> LUNAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-full px-2 py-1 rounded bg-text-secondary/10 text-text-secondary/80 text-[11px] font-bold tracking-wider">
                          SISA {formatRp(Math.max(0, poin.harus - poin.dibayar))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
