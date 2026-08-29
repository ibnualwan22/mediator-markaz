import { prisma } from "@/lib/prisma";
import DashboardCharts from "@/components/admin/DashboardCharts";
import { Users, UserCheck, CalendarDays, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ periodeId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const filterPeriodeId = resolvedSearchParams.periodeId || "";

  const periodes = await prisma.periode.findMany({ orderBy: { tahunDibuka: 'desc' } });
  const activePeriode = periodes.find(p => p.isActive) || periodes[0];
  const selectedPeriodeId = filterPeriodeId || (activePeriode ? activePeriode.id : "");
  const selectedPeriode = periodes.find(p => p.id === selectedPeriodeId);

  // Stats for the selected periode
  const totalSantriInPeriode = await prisma.santri.count({
    where: { gelombang: { periodeId: selectedPeriodeId } }
  });
  
  const verifiedSantriInPeriode = await prisma.santri.count({
    where: { gelombang: { periodeId: selectedPeriodeId }, isVerified: true }
  });

  const withdrawnSantriInPeriode = await prisma.santri.count({
    where: { gelombang: { periodeId: selectedPeriodeId }, isWithdrawn: true }
  });

  // Active Gelombang (global or contextual to periode?)
  const activeGelombang = await prisma.gelombang.findFirst({
    where: { isActive: true },
    include: { periode: true }
  });

  // Chart 1: Gelombang data within selected periode
  const gelombangs = await prisma.gelombang.findMany({
    where: { periodeId: selectedPeriodeId },
    include: {
      _count: { select: { santri: true } }
    },
    orderBy: { nama: 'asc' }
  });
  
  const gelombangData = gelombangs.map(g => ({ name: g.nama, count: g._count.santri }));

  // Chart 2: Global data (Santri per Periode)
  const periodesWithSantri = await prisma.periode.findMany({
    orderBy: { tahunDibuka: 'asc' },
    include: {
      gelombang: {
        include: { _count: { select: { santri: true } } }
      }
    }
  });

  const globalData = periodesWithSantri.map(p => {
    const totalSantri = p.gelombang.reduce((acc, curr) => acc + curr._count.santri, 0);
    return { name: p.nama, count: totalSantri };
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Dashboard</h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">Ringkasan pendaftaran Mediator Markaz Arabiyah.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:scale-110 transition-transform duration-500">
            <Users size={100} />
          </div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users size={20} />
            </div>
            <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Total Pendaftar</p>
          </div>
          <p className="text-3xl md:text-4xl font-black text-text-primary dark:text-gray-100 relative z-10">{totalSantriInPeriode}</p>
          <p className="text-xs text-text-secondary mt-1 relative z-10">Santri periode {selectedPeriode?.nama}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-success/30 dark:border-success/20 relative overflow-hidden group hover:border-success/50 transition-colors">
          <div className="absolute -right-4 -bottom-4 text-success/5 group-hover:scale-110 transition-transform duration-500">
            <UserCheck size={100} />
          </div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-success/10 rounded-lg text-success">
              <UserCheck size={20} />
            </div>
            <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Terverifikasi</p>
          </div>
          <p className="text-3xl md:text-4xl font-black text-text-primary dark:text-gray-100 relative z-10">{verifiedSantriInPeriode}</p>
          <p className="text-xs text-text-secondary mt-1 relative z-10">NIS Generated</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-danger/20 dark:border-danger/10 relative overflow-hidden group hover:border-danger/40 transition-colors">
          <div className="absolute -right-4 -bottom-4 text-danger/5 group-hover:scale-110 transition-transform duration-500">
            <Activity size={100} />
          </div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-danger/10 rounded-lg text-danger">
              <Activity size={20} />
            </div>
            <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Mundur</p>
          </div>
          <p className="text-3xl md:text-4xl font-black text-text-primary dark:text-gray-100 relative z-10">{withdrawnSantriInPeriode}</p>
          <p className="text-xs text-text-secondary mt-1 relative z-10">Santri yang mundur</p>
        </div>

        <div className="bg-gradient-to-br from-primary to-primary-light p-6 rounded-2xl shadow-md text-white relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <CalendarDays size={100} />
          </div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
             <div className="p-2 bg-white/20 rounded-lg text-white">
              <CalendarDays size={20} />
            </div>
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Gelombang Aktif</p>
          </div>
          <p className="text-xl md:text-2xl font-black relative z-10 leading-tight line-clamp-1" title={activeGelombang?.nama}>
            {activeGelombang ? `${activeGelombang.nama}` : 'Tidak ada'}
          </p>
          <p className="text-xs text-white/80 mt-1 relative z-10 line-clamp-1" title={activeGelombang?.periode.nama}>
            {activeGelombang ? `${activeGelombang.periode.nama}` : 'Gunakan Menu Master Data'}
          </p>
        </div>
      </div>
      
      {/* Charts component */}
      <DashboardCharts 
        gelombangData={gelombangData} 
        globalData={globalData} 
        periodes={periodes.map(p => ({ id: p.id, nama: p.nama }))}
        selectedPeriodeId={selectedPeriodeId}
        selectedPeriodeName={selectedPeriode?.nama || ""}
      />
    </div>
  );
}
