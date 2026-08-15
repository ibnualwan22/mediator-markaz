import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import PemberkasanTracker from "@/components/admin/PemberkasanTracker";
import { initSantriPemberkasan } from "@/app/admin/(dashboard)/pemberkasan/actions";

export default async function AdminPemberkasanSantriPage({ params }: { params: Promise<{ santriId: string }> }) {
  const resolvedParams = await params;
  const santri = await prisma.santri.findUnique({
    where: { id: resolvedParams.santriId },
    include: {
      pemberkasan: {
        include: { itemPemberkasan: true }
      }
    }
  });

  if (!santri || !santri.isVerified) {
    redirect("/admin/pemberkasan");
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-4">
          <Link href="/admin/pemberkasan" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary">Kelola Berkas Santri</h1>
            <p className="text-text-secondary mt-1">{santri.namaLengkap} - <span className="font-mono text-primary font-bold">{santri.nis}</span></p>
          </div>
        </div>

        {/* Server Action button wrapped in a separate form since we only need simple init */}
        <form action={async () => {
          "use server";
          await initSantriPemberkasan(santri.id);
        }}>
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-white border border-primary rounded-lg text-primary text-sm font-bold shadow-sm hover:bg-primary-light hover:text-white transition-colors">
            <RefreshCw size={16} /> Sync Master Item
          </button>
        </form>
      </div>

      <PemberkasanTracker pemberkasanDaftar={santri.pemberkasan} />
    </div>
  );
}
