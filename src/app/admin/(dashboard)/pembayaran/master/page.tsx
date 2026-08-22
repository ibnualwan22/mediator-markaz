import { prisma } from "@/lib/prisma";
import MasterPaketManager from "@/components/admin/MasterPaketManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MasterPembayaranPage() {
  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  const periodeId = activePeriode?.id;

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
    <div className="space-y-6 pb-20">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/admin/pembayaran" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Master Paket Pembayaran</h1>
          <p className="text-text-secondary mt-1">Kelola paket, tahap, dan rincian poin pembayaran untuk santri.</p>
        </div>
      </div>

      <MasterPaketManager pakets={pakets} />
    </div>
  );
}
