import { prisma } from "@/lib/prisma";
import MasterItemManager from "@/components/admin/MasterItemManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MasterPemberkasanPage() {
  const items = await prisma.itemPemberkasan.findMany({
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
          <p className="text-text-secondary mt-1">Kelola daftar dokumen/berkas standar yang perlu diurus santri.</p>
        </div>
      </div>

      <MasterItemManager items={items} />
    </div>
  );
}
