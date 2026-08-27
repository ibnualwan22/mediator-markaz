import { prisma } from "@/lib/prisma";
import MasterPaketManager from "@/components/admin/MasterPaketManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MasterPembayaranPage({ searchParams }: { searchParams: Promise<{ periodeId?: string }> }) {
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

  const pakets = await prisma.paketPembayaran.findMany({
    where: periodeId ? { periodeId } : {},
    orderBy: { urutan: 'asc' },
    include: {
      tahapPaket: {
        orderBy: { urutan: 'asc' },
        include: {
          poinTahap: {
            orderBy: { urutan: 'asc' }
          }
        }
      }
    }
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      <div className="flex items-start gap-4 mb-8">
        <Link href={`/admin/pembayaran${periodeId ? `?periodeId=${periodeId}` : ''}`} className="p-2 border border-primary-light/40 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-text-primary dark:text-gray-100 hover:bg-bg-cream dark:bg-gray-800 transition-colors mt-1 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Master Paket Pembayaran</h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">Kelola master paket periode <span className="font-bold text-primary">{activePeriode?.nama}</span></p>
        </div>
      </div>

      <MasterPaketManager pakets={pakets} periodes={periodes} currentPeriodeId={periodeId} />
    </div>
  );
}
