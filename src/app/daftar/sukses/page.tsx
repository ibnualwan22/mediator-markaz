import Link from "next/link";
import { CheckCircle2, FileText, ArrowRight, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function PendaftaranSuksesPage({ searchParams }: { searchParams: Promise<{ id: string }> }) {
  const resolvedSearchParams = await searchParams;
  if (!resolvedSearchParams.id) {
    redirect("/");
  }

  const santri = await prisma.santri.findUnique({
    where: { id: resolvedSearchParams.id },
    include: {
    }
  });

  if (!santri) {
    redirect("/");
  }



  return (
    <div className="min-h-screen bg-bg-cream flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border border-primary-light/20 overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 L 100 0 L 100 10 L 10 100 Z" fill="currentColor" />
            </svg>
          </div>
          <CheckCircle2 size={80} className="text-white mx-auto mb-4 relative z-10" />
          <h1 className="text-3xl font-heading font-bold text-white relative z-10">Pendaftaran Berhasil!</h1>
          <p className="text-primary-bg/90 mt-2 relative z-10">
            Alhamdulillah, data Anda telah tersimpan di sistem kami.
          </p>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          <div className="text-center mb-8">
            <p className="text-sm text-text-secondary uppercase tracking-wider font-semibold">Nomor Pendaftaran Anda</p>
            <div className="text-3xl md:text-4xl font-bold font-mono text-primary mt-2">{santri.noPendaftaran}</div>
            <p className="text-sm mt-3 text-text-secondary max-w-md mx-auto">
              Simpan nomor pendaftaran ini untuk mengecek status pendaftaran dan pembayaran Anda ke depannya.
            </p>
          </div>

          <div className="bg-bg-cream rounded-2xl p-6 border border-primary-light/30">
            <div className="flex items-center gap-3 text-lg font-heading font-bold text-text-primary mb-4 border-b border-primary-light/20 pb-3">
              <Wallet className="text-primary" />
              INVOICE PEMBAYARAN TAHAP 1
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Nama Lengkap</span>
                <span className="font-semibold">{santri.namaLengkap}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Keterangan</span>
                <span className="font-semibold text-right">Investasi Fiksasi/Booking Kuota</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Status Pembayaran</span>
                <span className="px-3 py-1 bg-danger/10 text-danger text-xs font-bold rounded-full">
                  BELUM DIBAYAR
                </span>
              </div>
              
              <div className="pt-4 border-t border-primary-light/20">
                <div className="flex justify-between items-end">
                  <span className="text-text-primary font-medium">Total Tagihan</span>
                  <span className="text-3xl font-bold text-primary">Rp 1.000.000</span>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-text-secondary mb-2">Silakan transfer biaya pendaftaran ke rekening berikut:</p>
              <div className="text-xl font-bold text-text-primary tracking-wide">BRI 055501049030500</div>
              <div className="text-sm font-medium text-text-primary">a.n. Markaz Arabiyah</div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="px-6 py-3 rounded-xl border border-primary-light/50 text-text-primary font-medium hover:bg-bg-cream transition-colors text-center"
            >
              Kembali ke Beranda
            </Link>
            <Link 
              href={`/cek-status?email=${santri.email}`}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors text-center flex items-center justify-center gap-2 shadow-md"
            >
              Cek Status Saya <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
