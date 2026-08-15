import { prisma } from "@/lib/prisma";
import MasterProgresManager from "@/components/admin/MasterProgresManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MasterProgresPage() {
  const tahaps = await prisma.tahapProgres.findMany({
    orderBy: { urutan: 'asc' }
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start gap-4 mb-4">
        <Link href="/admin/progres" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">Master Tahap Progres</h1>
          <p className="text-text-secondary mt-1">Konfigurasi urutan langkah-langkah besar untuk seluruh santri.</p>
        </div>
      </div>

      <MasterProgresManager tahaps={tahaps} />
    </div>
  );
}
