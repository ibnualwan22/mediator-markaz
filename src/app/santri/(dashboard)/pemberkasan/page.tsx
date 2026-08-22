import { getSantriSession } from "@/lib/santri-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FolderCheck, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default async function PemberkasanSantriPage() {
  const session = await getSantriSession();
  if (!session) redirect("/santri/login");

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      pemberkasan: true,
      gelombang: {
        include: {
          periode: true
        }
      }
    }
  });

  if (!santri) redirect("/santri/login");

  // Ambil master item pemberkasan untuk periode santri ini
  const items = await prisma.itemPemberkasan.findMany({
    where: { periodeId: santri.gelombang.periode.id, isActive: true },
    orderBy: [
      { kategori: 'asc' },
      { urutan: 'asc' }
    ]
  });

  if (items.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Status Pemberkasan</h1>
          <p className="text-text-secondary mt-1">Lacak kelengkapan dokumen pendaftaran Anda.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <FolderCheck className="w-12 h-12 text-primary mb-3" />
          <h3 className="font-heading font-bold text-primary text-lg">Belum Ada Syarat Berkas</h3>
          <p className="text-text-secondary mt-1">Belum ada daftar item pemberkasan yang ditentukan oleh admin untuk periode ini.</p>
        </div>
      </div>
    );
  }

  // Hitung statistik
  const totalItem = items.length;
  let totalTerkumpul = 0;

  // Map status ke setiap item
  const mappedItems = items.map(item => {
    const record = santri.pemberkasan.find(p => p.itemPemberkasanId === item.id);
    const sudahDikumpulkan = record?.sudahDikumpulkan ?? false;
    const catatan = record?.catatan ?? null;
    
    if (sudahDikumpulkan) {
      totalTerkumpul++;
    }

    return { ...item, sudahDikumpulkan, catatan };
  });

  const percent = totalItem > 0 ? Math.round((totalTerkumpul / totalItem) * 100) : 0;
  const isComplete = totalTerkumpul === totalItem && totalItem > 0;

  // Grup berdasarkan kategori
  const groupedItems = {
    INDONESIA: mappedItems.filter(i => i.kategori === 'INDONESIA'),
    MESIR: mappedItems.filter(i => i.kategori === 'MESIR')
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Status Pemberkasan</h1>
        <p className="text-text-secondary mt-1">Lacak kelengkapan dokumen pendaftaran Anda. Data hanya bisa diubah oleh admin.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6 sm:p-8 relative">
        {isComplete && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-bl-[100px] -z-0"></div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 relative z-10">
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary font-medium mb-1 flex items-center gap-1.5">
              <FolderCheck size={16} /> Total Berkas Berhasil Dikumpulkan
            </span>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${isComplete ? 'text-success' : 'text-primary'}`}>
                {totalTerkumpul}
              </span>
              <span className="text-text-secondary text-lg mb-1">/ {totalItem}</span>
            </div>
            {isComplete && (
              <span className="inline-flex items-center gap-1 mt-2 text-success text-sm font-bold bg-success/10 w-max px-2.5 py-1 rounded-full">
                <CheckCircle2 size={14} /> Berkas Lengkap
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-text-secondary">Progress</span>
            <span className={`text-sm font-bold ${isComplete ? 'text-success' : 'text-primary'}`}>{percent}%</span>
          </div>
          <div className="h-3 w-full bg-bg-cream rounded-full overflow-hidden border border-primary/10">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full relative ${
                isComplete ? 'bg-success' : 'bg-gradient-to-r from-primary to-primary-light'
              }`}
              style={{ width: `${percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
            </div>
          </div>
        </div>
      </div>

      {Object.entries(groupedItems).map(([kategori, kItems]) => {
        if (kItems.length === 0) return null;
        
        // Status kategori
        const kCount = kItems.length;
        const kCollected = kItems.filter(i => i.sudahDikumpulkan).length;
        const kComplete = kCount === kCollected;

        return (
          <div key={kategori} className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
            <div className={`p-5 flex items-center justify-between border-b ${kComplete ? 'bg-success/5 border-success/20' : 'bg-bg-cream border-primary-light/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kComplete ? 'bg-success text-white' : 'bg-white text-primary border border-primary/20 shadow-sm'}`}>
                  {kComplete ? <CheckCircle2 size={20} /> : <FolderCheck size={20} />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-text-primary">Berkas {kategori}</h3>
                  <p className="text-xs text-text-secondary">
                    {kComplete ? 'Semua berkas terkumpul' : `${kCollected} dari ${kCount} dikumpulkan`}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-primary-light/10">
              {kItems.map((item, idx) => (
                <div key={item.id} className="p-4 sm:p-5 flex gap-4 hover:bg-bg-cream/50 transition-colors">
                  <div className="mt-0.5 relative shrink-0">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors ${
                      item.sudahDikumpulkan 
                        ? 'bg-success border-success text-white' 
                        : 'bg-bg-subtle border-text-secondary/30 text-transparent'
                    }`}>
                      <CheckCircle2 size={14} className={item.sudahDikumpulkan ? 'opacity-100' : 'opacity-0'} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${item.sudahDikumpulkan ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {item.nama}
                    </p>
                    {item.catatan && (
                      <div className="mt-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex gap-2 items-start">
                        <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
                        <div className="text-text-primary">
                          <span className="font-bold text-warning text-xs uppercase tracking-wider block mb-0.5">Catatan Admin</span>
                          {item.catatan}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs font-medium uppercase tracking-wider">
                    {item.sudahDikumpulkan ? (
                      <span className="text-success bg-success/10 px-2 py-1 rounded">Terkumpul</span>
                    ) : (
                      <span className="text-text-secondary bg-bg-cream px-2 py-1 rounded">Belum</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
