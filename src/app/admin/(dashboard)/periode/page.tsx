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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Manajemen Periode & Gelombang</h1>
        <p className="text-text-secondary mt-1">Atur tahun ajaran dan gelombang pendaftaran yang aktif.</p>
      </div>
      
      <PeriodeManager periodes={periodes} />
    </div>
  );
}
