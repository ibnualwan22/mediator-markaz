import { prisma } from "@/lib/prisma";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Ringkasan pendaftaran Mediator Markaz Arabiyah.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20">
          <p className="text-sm font-medium text-text-secondary mb-1">Total Pendaftar</p>
          <p className="text-3xl font-bold text-primary">{totalSantri}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20">
          <p className="text-sm font-medium text-text-secondary mb-1">Santri Terverifikasi (NIS Generated)</p>
          <p className="text-3xl font-bold text-success">{santriVerified}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20">
          <p className="text-sm font-medium text-text-secondary mb-1">Gelombang Aktif</p>
          <p className="text-lg font-bold text-text-primary">
            {activeGelombang ? `${activeGelombang.periode.nama} - ${activeGelombang.nama}` : 'Tidak ada'}
          </p>
        </div>
      </div>
      
      {/* Nanti bisa ditambah chart atau tabel terbaru */}
    </div>
  );
}
