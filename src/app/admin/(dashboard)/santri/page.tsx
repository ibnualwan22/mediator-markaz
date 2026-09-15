import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import SantriTable from "@/components/admin/SantriTable";

export const dynamic = "force-dynamic";

export default async function AdminSantriPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string, periodeId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const filterPeriodeId = resolvedSearchParams.periodeId || "";
  const filterGelombangId = resolvedSearchParams.gelombangId || "";

  const cookieStore = await cookies();
  const cookiePeriodeId = cookieStore.get('admin_active_periode')?.value;

  const periodes = await prisma.periode.findMany({ orderBy: { tahunDibuka: 'desc' } });
  const activePeriode = periodes.find(p => p.isActive) || periodes[0];
  const storedPeriode = cookiePeriodeId ? periodes.find(p => p.id === cookiePeriodeId) : null;
  const defaultPeriodeId = storedPeriode ? storedPeriode.id : (activePeriode ? activePeriode.id : "");
  const selectedPeriodeId = filterPeriodeId || defaultPeriodeId;

  const gelombangs = selectedPeriodeId ? await prisma.gelombang.findMany({
    where: { periodeId: selectedPeriodeId },
    orderBy: { nama: 'asc' }
  }) : [];

  const selectedGelombangId = filterGelombangId || (gelombangs.length > 0 ? gelombangs[0].id : "all");

  const santriList = await prisma.santri.findMany({
    where: {
      isVerified: true,
      gelombangId: selectedGelombangId === "all" ? undefined : selectedGelombangId,
      gelombang: selectedGelombangId === "all" ? { periodeId: selectedPeriodeId } : undefined,
      OR: query ? [
        { namaLengkap: { contains: query, mode: 'insensitive' } },
        { nis: { contains: query, mode: 'insensitive' } },
        { noPendaftaran: { contains: query, mode: 'insensitive' } }
      ] : undefined
    },
    orderBy: [
      { gender: 'asc' },
      { nomorUrut: 'asc' },
      { namaLengkap: 'asc' }
    ],
    include: {
      gelombang: { include: { periode: true } }
    }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Data Camaba</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Data camaba yang telah terverifikasi dan memiliki NIC.</p>
      </div>
      
      <SantriTable 
        santriList={santriList} 
        gelombangs={gelombangs}
        periodes={periodes}
        query={query}
        selectedGelombangId={selectedGelombangId}
        selectedPeriodeId={selectedPeriodeId}
      />
    </div>
  );
}
