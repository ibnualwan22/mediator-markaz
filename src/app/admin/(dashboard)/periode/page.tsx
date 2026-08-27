import { prisma } from "@/lib/prisma";
import PeriodeManager from "@/components/admin/PeriodeManager";

export const dynamic = "force-dynamic";

export default async function AdminPeriodePage() {
  const periodes = await prisma.periode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      gelombang: {
        orderBy: { tanggalBuka: 'asc' }
      }
    }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Manajemen Periode & Gelombang</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Atur tahun ajaran dan gelombang pendaftaran yang aktif.</p>
      </div>
      
      <PeriodeManager periodes={periodes} />
    </div>
  );
}
