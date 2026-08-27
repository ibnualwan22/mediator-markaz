import { prisma } from "@/lib/prisma";
import SantriTable from "@/components/admin/SantriTable";

export const dynamic = "force-dynamic";

export default async function AdminSantriPage() {
  const santriList = await prisma.santri.findMany({
    orderBy: [
      { gender: 'asc' },
      { nomorUrut: 'asc' },
      { namaLengkap: 'asc' }
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
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Data Santri</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Kelola data pendaftar dan verifikasi untuk menghasilkan NIS.</p>
      </div>
      
      <SantriTable santriList={santriList} gelombangList={gelombangList} />
    </div>
  );
}
