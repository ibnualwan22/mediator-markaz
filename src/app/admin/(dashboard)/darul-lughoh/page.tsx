import { prisma } from "@/lib/prisma";
import { getSettingDL } from "./actions";
import SpreadsheetDarulLughoh from "@/components/admin/SpreadsheetDarulLughoh";

export default async function DarulLughohPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string, periodeId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const filterPeriodeId = resolvedSearchParams.periodeId || "";
  const filterGelombangId = resolvedSearchParams.gelombangId || "";

  const periodes = await prisma.periode.findMany({ orderBy: { tahunDibuka: 'desc' } });
  const activePeriode = periodes.find(p => p.isActive) || periodes[0];
  const selectedPeriodeId = filterPeriodeId || (activePeriode ? activePeriode.id : "");

  const gelombangs = selectedPeriodeId ? await prisma.gelombang.findMany({
    where: { periodeId: selectedPeriodeId },
    orderBy: { nama: 'asc' }
  }) : [];

  const selectedGelombangId = filterGelombangId || (gelombangs.length > 0 ? gelombangs[0].id : "all");

  const setting = await getSettingDL();

  const santriList = selectedGelombangId ? await prisma.santri.findMany({
    where: {
      isVerified: true,
      isWithdrawn: false,
      gelombangId: selectedGelombangId === "all" ? undefined : selectedGelombangId,
      OR: [
        { namaLengkap: { contains: query, mode: 'insensitive' } },
        { nis: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      darulLughoh: {
        orderBy: [
          { level: 'asc' },
          { percobaan: 'desc' }, // Latest percobaan first
        ]
      }
    },
    orderBy: [
      { nomorUrut: 'asc' },
      { namaLengkap: 'asc' }
    ]
  }) : [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary dark:text-gray-100">Daurah Lughoh Management</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">Atur Penempatan Level, Pembayaran, dan Hasil Ujian DL.</p>
      </div>

      <SpreadsheetDarulLughoh
        santriList={santriList}
        gelombangs={gelombangs}
        periodes={periodes}
        query={query}
        selectedGelombangId={selectedGelombangId}
        selectedPeriodeId={selectedPeriodeId}
        setting={setting}
      />
    </div>
  );
}
