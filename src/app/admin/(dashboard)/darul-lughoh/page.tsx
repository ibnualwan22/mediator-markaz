import { prisma } from "@/lib/prisma";
import { getSettingDL } from "./actions";
import SpreadsheetDarulLughoh from "@/components/admin/SpreadsheetDarulLughoh";

export default async function DarulLughohPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const filterGelombangId = resolvedSearchParams.gelombangId || "";

  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  
  const gelombangs = activePeriode ? await prisma.gelombang.findMany({
    where: { periodeId: activePeriode.id },
    orderBy: { tanggalBuka: 'asc' }
  }) : [];

  const selectedGelombangId = filterGelombangId || (gelombangs.length > 0 ? gelombangs[0].id : "");

  const setting = await getSettingDL();

  const santriList = selectedGelombangId ? await prisma.santri.findMany({
    where: {
      isVerified: true,
      gelombangId: selectedGelombangId,
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
    orderBy: { nis: 'asc' }
  }) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Darul Lughoh Management</h1>
        <p className="text-text-secondary mt-1">Atur Penempatan Level, Pembayaran, dan Hasil Ujian DL.</p>
      </div>

      <SpreadsheetDarulLughoh 
        santriList={santriList}
        gelombangs={gelombangs}
        query={query}
        selectedGelombangId={selectedGelombangId}
        setting={setting}
      />
    </div>
  );
}
