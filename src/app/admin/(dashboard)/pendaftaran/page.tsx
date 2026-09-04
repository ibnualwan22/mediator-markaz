import { prisma } from "@/lib/prisma";
import PendaftaranTable from "@/components/admin/PendaftaranTable";

export const dynamic = "force-dynamic";

export default async function AdminPendaftaranPage() {
  const pendaftarList = await prisma.santri.findMany({
    where: { isVerified: false, isWithdrawn: false },
    orderBy: [
      { createdAt: 'desc' },
    ],
    include: {
      gelombang: { include: { periode: true } }
    }
  });

  const gelombangList = await prisma.gelombang.findMany({
    include: { periode: true },
    orderBy: { tanggalBuka: 'desc' }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Pendaftaran Camaba</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Daftar camaba yang baru mendaftar dan belum diverifikasi.</p>
      </div>
      
      <PendaftaranTable pendaftarList={pendaftarList} gelombangList={gelombangList} />
    </div>
  );
}
