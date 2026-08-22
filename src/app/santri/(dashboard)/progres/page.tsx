import { getSantriSession } from "@/lib/santri-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LineChart, CheckCircle2, Circle, AlertCircle, Calendar } from "lucide-react";

export default async function ProgresSantriPage() {
  const session = await getSantriSession();
  if (!session) redirect("/santri/login");

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      progresSantri: true,
      gelombang: {
        include: {
          periode: true
        }
      }
    }
  });

  if (!santri) redirect("/santri/login");

  // Ambil master progres untuk periode santri ini
  const tahaps = await prisma.tahapProgres.findMany({
    where: { periodeId: santri.gelombang.periode.id, isActive: true },
    orderBy: { urutan: 'asc' }
  });

  if (tahaps.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Progres Studi</h1>
          <p className="text-text-secondary mt-1">Lacak capaian dan tahapan persiapan keberangkatan Anda.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <LineChart className="w-12 h-12 text-primary mb-3" />
          <h3 className="font-heading font-bold text-primary text-lg">Belum Ada Tahapan</h3>
          <p className="text-text-secondary mt-1">Belum ada daftar tahapan progres yang ditentukan oleh admin untuk periode ini.</p>
        </div>
      </div>
    );
  }

  // Cek progres
  let totalSelesai = 0;
  const mappedTahaps = tahaps.map(tahap => {
    const record = santri.progresSantri.find(p => p.tahapProgresId === tahap.id);
    const selesai = record?.selesai ?? false;
    const tanggalSelesai = record?.tanggalSelesai ?? null;
    const catatan = record?.catatan ?? null;
    
    if (selesai) totalSelesai++;

    return { ...tahap, selesai, tanggalSelesai, catatan };
  });

  const percent = tahaps.length > 0 ? Math.round((totalSelesai / tahaps.length) * 100) : 0;
  const isAllComplete = tahaps.length > 0 && totalSelesai === tahaps.length;

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Progres Studi</h1>
        <p className="text-text-secondary mt-1">Lacak capaian dan tahapan persiapan keberangkatan Anda.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8">
          <div>
            <h2 className="text-lg font-heading font-bold text-text-primary mb-1">Capaian Progres</h2>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-bold ${isAllComplete ? 'text-success' : 'text-primary'}`}>
                {percent}%
              </span>
              <span className="text-text-secondary pb-1">selesai</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-sm font-medium text-text-secondary block mb-1">Tahapan Diselesaikan</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-text-primary text-white rounded-full text-sm font-bold shadow-sm">
              <CheckCircle2 size={16} /> {totalSelesai} dari {tahaps.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 w-full bg-bg-cream rounded-full overflow-hidden border border-primary/10">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full relative ${
              isAllComplete ? 'bg-success' : 'bg-gradient-to-r from-primary to-primary-light'
            }`}
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm p-6 sm:p-8 relative mt-8">
        <h3 className="font-heading font-bold text-text-primary text-lg mb-8">Timeline Perkiraan</h3>
        
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-2 bottom-6 w-0.5 bg-primary/10 rounded-full"></div>

          <div className="space-y-6">
            {mappedTahaps.map((tahap, idx) => {
              const isActive = !tahap.selesai && (idx === 0 || mappedTahaps[idx - 1].selesai);
              
              return (
                <div key={tahap.id} className={`group relative flex gap-6 ${tahap.selesai ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {/* Indicator */}
                  <div className="relative z-10 shrink-0 flex justify-center mt-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                      tahap.selesai 
                        ? 'bg-success text-white' 
                        : isActive 
                          ? 'bg-primary text-white scale-110 shadow-md ring-4 ring-primary/20' 
                          : 'bg-bg-subtle text-text-secondary/50 border-gray-200'
                    }`}>
                      {tahap.selesai ? <CheckCircle2 size={24} /> : 
                       isActive ? <LineChart size={22} className="animate-pulse" /> : 
                       <Circle size={12} className="fill-current" />}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 rounded-2xl border transition-all ${
                    isActive 
                      ? 'bg-primary/5 border-primary/30 p-5 shadow-sm' 
                      : tahap.selesai 
                        ? 'bg-white border-success/20 p-5 hover:border-success/40' 
                        : 'bg-transparent border-transparent p-4'
                  }`}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                      <div>
                        {isActive && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary text-white mb-2">
                            Tahap Saat Ini
                          </span>
                        )}
                        <h4 className={`font-heading font-bold ${
                          isActive ? 'text-primary text-xl' : 'text-text-primary text-lg'
                        }`}>
                          {tahap.nama}
                        </h4>
                        
                        {tahap.tanggalSelesai && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-text-secondary">
                            <Calendar size={14} className="text-success" />
                            Selesai pada: <span className="font-medium text-text-primary">
                              {new Date(tahap.tanggalSelesai).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 mt-1 sm:mt-0">
                        {tahap.selesai ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-bold border border-success/20">
                            SELESAI
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-sm font-bold border border-warning/20">
                            ON PROGRES
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-subtle text-text-secondary text-sm font-medium border border-gray-200">
                            MENUNGGU
                          </span>
                        )}
                      </div>
                    </div>

                    {tahap.catatan && (
                      <div className="mt-4 bg-white/60 border border-primary-light/10 rounded-xl p-4 text-sm flex gap-3 items-start shadow-sm">
                        <AlertCircle size={18} className="text-primary-light shrink-0 mt-0.5" />
                        <div className="text-text-primary leading-relaxed">
                          <span className="font-bold text-primary-light text-xs uppercase tracking-wider block mb-1">Catatan Progress</span>
                          {tahap.catatan}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
