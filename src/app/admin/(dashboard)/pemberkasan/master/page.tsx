import { prisma } from "@/lib/prisma";
import MasterItemManager from "@/components/admin/MasterItemManager";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MasterPemberkasanPage({ searchParams }: { searchParams: Promise<{ periodeId?: string }> }) {
  const resolvedParams = await searchParams;
  let activePeriode;
  if (resolvedParams.periodeId) {
    activePeriode = await prisma.periode.findUnique({ where: { id: resolvedParams.periodeId } });
  }
  if (!activePeriode) {
    activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  }

  const periodeId = activePeriode?.id;
  const periodes = await prisma.periode.findMany({ orderBy: { tahunDibuka: 'desc' } });

  const items = await prisma.itemPemberkasan.findMany({
    where: periodeId ? { periodeId } : {},
    orderBy: [
      { kategori: 'asc' },
      { urutan: 'asc' }
    ]
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start gap-4 mb-4">
        <Link href="/admin/pemberkasan" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">Master Item Berkas</h1>
          <p className="text-text-secondary mt-1">Kelola master berkas periode <span className="font-bold text-primary">{activePeriode?.nama}</span></p>
        </div>
      </div>

      <MasterItemManager items={items} periodes={periodes} currentPeriodeId={periodeId} />
    </div>
  );
}
