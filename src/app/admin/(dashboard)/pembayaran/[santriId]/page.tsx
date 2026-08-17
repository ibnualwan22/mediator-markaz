import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { redirect } from "next/navigation";
import PembayaranManager from "@/components/admin/PembayaranManager";

export default async function AdminPembayaranSantriPage({ params }: { params: Promise<{ santriId: string }> }) {
  const resolvedParams = await params;
  const santri = await prisma.santri.findUnique({
    where: { id: resolvedParams.santriId },
    include: {
      pembayaran: {
        orderBy: { tahap: 'asc' }
      }
    }
  });

  if (!santri) {
    redirect("/admin/pembayaran");
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/admin/pembayaran" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">Kelola Tagihan Santri</h1>
          <p className="text-text-secondary mt-1 flex items-center gap-2">
            {santri.namaLengkap} 
            <span className="text-gray-300">|</span> 
            {santri.nis ? (
              <span className="font-mono text-primary font-medium">{santri.nis}</span>
            ) : (
              <span className="font-mono text-warning text-sm border border-warning px-1.5 py-0.5 rounded">Belum Verifikasi</span>
            )}
          </p>
        </div>
      </div>

      <PembayaranManager santri={santri} pembayaran={santri.pembayaran} />
    </div>
  );
}
