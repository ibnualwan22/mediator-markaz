import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentYear = new Date().getFullYear();
  
  // Basic stats
  const totalSantri = await prisma.santri.count();
  const santriVerified = await prisma.santri.count({ where: { isVerified: true } });
  
  // Gelombang Aktif
  const activeGelombang = await prisma.gelombang.findFirst({
    where: { isActive: true },
    include: { periode: true }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Dashboard</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Ringkasan pendaftaran Mediator Markaz Arabiyah.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700">
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Total Pendaftar</p>
          <p className="text-2xl md:text-3xl font-bold text-primary">{totalSantri}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700">
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Santri Terverifikasi (NIS Generated)</p>
          <p className="text-2xl md:text-3xl font-bold text-success">{santriVerified}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700">
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Gelombang Aktif</p>
          <p className="text-lg font-bold text-text-primary dark:text-gray-100">
            {activeGelombang ? `${activeGelombang.periode.nama} - ${activeGelombang.nama}` : 'Tidak ada'}
          </p>
        </div>
      </div>
      
      {/* Nanti bisa ditambah chart atau tabel terbaru */}
    </div>
  );
}
