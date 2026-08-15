import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import ProgresTracker from "@/components/admin/ProgresTracker";
import { initSantriProgres } from "@/app/admin/(dashboard)/progres/actions";

export default async function AdminProgresSantriPage({ params }: { params: Promise<{ santriId: string }> }) {
  const resolvedParams = await params;
  const santri = await prisma.santri.findUnique({
    where: { id: resolvedParams.santriId },
    include: {
      progresSantri: {
        include: { tahapProgres: true }
      }
    }
  });

  if (!santri || !santri.isVerified) {
    redirect("/admin/progres");
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Link href="/admin/progres" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary">Kelola Progres Singkat</h1>
            <p className="text-text-secondary mt-1">{santri.namaLengkap} - <span className="font-mono text-primary font-bold">{santri.nis}</span></p>
          </div>
        </div>

        {/* Server Action button for adding missing master items */}
        <form action={async () => {
          "use server";
          await initSantriProgres(santri.id);
        }}>
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-white border border-primary rounded-lg text-primary text-sm font-bold shadow-sm hover:bg-primary-light hover:text-white transition-colors">
            <RefreshCw size={16} /> Sync Master Tahap
          </button>
        </form>
      </div>

      <ProgresTracker progresDaftar={santri.progresSantri} />
    </div>
  );
}
