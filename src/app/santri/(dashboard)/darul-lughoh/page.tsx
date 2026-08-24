import { getSantriSession } from "@/lib/santri-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, AlertCircle, XCircle, RotateCcw } from "lucide-react";

export default async function DarulLughohSantriPage() {
  const session = await getSantriSession();
  if (!session) redirect("/santri/login");

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      darulLughoh: {
        orderBy: [
          { level: 'desc' },
          { percobaan: 'desc' }
        ]
      }
    }
  });

  if (!santri) redirect("/santri/login");

  const dlData = santri.darulLughoh;

  if (dlData.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Level Darul Lughoh</h1>
          <p className="text-text-secondary mt-1">Lacak penempatan level dan hasil ujian Darul Lughoh Anda.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-12 h-12 text-primary mb-3" />
          <h3 className="font-heading font-bold text-primary text-lg">Belum Ada Riwayat Level</h3>
          <p className="text-text-secondary mt-1">Anda belum ditempatkan pada level Daurah Lughoh manapun oleh admin.</p>
        </div>
      </div>
    );
  }

  const currentLevel = dlData[0]; // Karena sudah diurutkan dari yang terbaru
  const previousLevels = dlData.slice(1);

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const getStatusUjianStyle = (status: string) => {
    switch (status) {
      case 'LULUS': return 'bg-success/15 text-success border-success/30';
      case 'REMIDI': return 'bg-error/15 text-error border-error/30';
      default: return 'bg-warning/15 text-warning border-warning/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LULUS': return <CheckCircle2 size={16} />;
      case 'REMIDI': return <RotateCcw size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Level Darul Lughoh</h1>
        <p className="text-text-secondary mt-1">Lacak penempatan level, status pembayaran, dan hasil ujian Darul Lughoh.</p>
      </div>

      {/* Current Level Highlight */}
      <h2 className="text-xl font-heading font-bold text-text-primary mt-8 mb-4">Level Saat Ini</h2>
      <div className="bg-white rounded-2xl border-2 border-primary-light/40 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
            Percobaan ke-{currentLevel.percobaan}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white shadow-lg">
              <span className="text-2xl font-bold">{currentLevel.level}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">
                Mustawa
              </h3>
              <p className="text-3xl font-heading font-bold text-primary">
                Level {currentLevel.level}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-bg-cream/50 rounded-xl p-5 border border-primary-light/10">
            {/* Payment Status */}
            <div>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Status Pembayaran</p>
              <div className="flex flex-col gap-1 items-start">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm border ${currentLevel.isLunas
                    ? 'bg-success/15 text-success border-success/30'
                    : 'bg-warning/15 text-warning border-warning/30'
                  }`}>
                  {currentLevel.isLunas ? (
                    <><CheckCircle2 size={16} /> Lunas</>
                  ) : (
                    <><Clock size={16} /> Belum Lunas (Sisa: {formatRp(currentLevel.nominalHarus - currentLevel.nominalDibayar)})</>
                  )}
                </span>

                <div className="mt-2 text-sm font-mono flex flex-col">
                  <span className="text-text-secondary">Sudah dibayar: <strong className={currentLevel.nominalDibayar >= currentLevel.nominalHarus ? 'text-success' : 'text-text-primary'}>{formatRp(currentLevel.nominalDibayar)}</strong></span>
                  <span className="text-text-secondary text-xs">Total harus: {formatRp(currentLevel.nominalHarus)}</span>
                </div>
              </div>
            </div>

            {/* Exam Status */}
            <div>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Status Ujian</p>
              <div className="flex flex-col gap-1 items-start">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm border uppercase ${getStatusUjianStyle(currentLevel.statusUjian)}`}>
                  {getStatusIcon(currentLevel.statusUjian)}
                  {currentLevel.statusUjian}
                </span>

                {currentLevel.tanggalUjian && (
                  <p className="mt-2 text-sm text-text-secondary font-medium">
                    Tanggal Ujian: <span className="text-text-primary">{new Date(currentLevel.tanggalUjian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {currentLevel.catatan && (
            <div className="mt-6 bg-white border border-primary-light/20 rounded-xl p-4 text-sm flex gap-3 items-start shadow-sm">
              <AlertCircle size={18} className="text-primary-light shrink-0 mt-0.5" />
              <div className="text-text-primary">
                <span className="font-bold text-primary-light text-xs uppercase tracking-wider block mb-1">Catatan Admin</span>
                {currentLevel.catatan}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Levels */}
      {previousLevels.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-heading font-bold text-text-primary mb-4">Riwayat Level Sebelumnya</h2>
          <div className="space-y-4">
            {previousLevels.map((lvl) => (
              <div key={lvl.id} className="bg-white rounded-xl border border-primary-light/20 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:border-primary-light/50 transition-colors shadow-sm">

                <div className="w-12 h-12 shrink-0 rounded-xl bg-bg-cream flex items-center justify-center border-2 border-primary/10">
                  <span className="text-xl font-bold text-text-secondary">{lvl.level}</span>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-bold text-text-primary mb-1">Level {lvl.level}</h3>
                    <p className="text-xs text-text-secondary font-mono">
                      Percobaan {lvl.percobaan}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Ujian</span>
                    <span className={`inline-flex items-center w-max gap-1 px-2 py-0.5 rounded text-xs font-bold border uppercase ${getStatusUjianStyle(lvl.statusUjian)}`}>
                      {getStatusIcon(lvl.statusUjian)} {lvl.statusUjian}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Pembayaran</span>
                    {lvl.isLunas ? (
                      <span className="text-sm font-bold text-success flex items-center gap-1">
                        <CheckCircle2 size={14} /> Lunas
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-warning font-mono">
                        Sisa {formatRp(Math.max(0, lvl.nominalHarus - lvl.nominalDibayar))}
                      </span>
                    )}
                  </div>
                </div>

                {(lvl.tanggalUjian || lvl.catatan) && (
                  <div className="w-full sm:w-auto p-3 bg-bg-cream rounded-lg text-xs text-text-secondary border border-gray-100 flex flex-col gap-1">
                    {lvl.tanggalUjian && <span>Tgl: {new Date(lvl.tanggalUjian).toLocaleDateString()}</span>}
                    {lvl.catatan && <span className="line-clamp-2" title={lvl.catatan}>Catatan: {lvl.catatan}</span>}
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
