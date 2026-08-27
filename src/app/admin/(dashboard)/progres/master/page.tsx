import { prisma } from "@/lib/prisma";
import MasterProgresManager from "@/components/admin/MasterProgresManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MasterProgresPage({ searchParams }: { searchParams: Promise<{ periodeId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const filterPeriodeId = resolvedSearchParams.periodeId || "";

  const periodes = await prisma.periode.findMany({ orderBy: { tahunDibuka: 'desc' } });
  const activePeriode = periodes.find(p => p.isActive) || periodes[0];
  const selectedPeriodeId = filterPeriodeId || (activePeriode ? activePeriode.id : "");

  const tahaps = await prisma.tahapProgres.findMany({
    where: selectedPeriodeId ? { periodeId: selectedPeriodeId } : {},
    orderBy: { urutan: 'asc' }
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-start gap-4">
          <Link href="/admin/progres" className="p-2 border border-primary-light/40 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-text-primary dark:text-gray-100 hover:bg-bg-cream dark:bg-gray-800 transition-colors mt-1 shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary dark:text-gray-100">Master Tahap Progres</h1>
            <p className="text-text-secondary dark:text-gray-400 mt-1">Konfigurasi urutan langkah-langkah besar untuk seluruh santri.</p>
          </div>
        </div>
      </div>

      <MasterProgresManager tahaps={tahaps} selectedPeriodeId={selectedPeriodeId} periodes={periodes} />
    </div>
  );
}
