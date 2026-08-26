import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Settings } from "lucide-react";
import SpreadsheetProgres from "@/components/admin/SpreadsheetProgres";

export default async function AdminProgresPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string, periodeId?: string }> }) {
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

  // Master Tahaps
  const tahaps = await prisma.tahapProgres.findMany({
    where: selectedPeriodeId ? { periodeId: selectedPeriodeId } : {},
    orderBy: { urutan: 'asc' }
  });

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
      progresSantri: true
    },
    orderBy: [
      { nomorUrut: 'asc' },
      { namaLengkap: 'asc' }
    ]
  }) : [];

  // Auto-sync missing ProgresSantri records without requiring manual action
  if (tahaps.length > 0 && santriList.length > 0) {
    const bulkInsertData: any[] = [];
    santriList.forEach(santri => {
      const existingTahapIds = new Set(santri.progresSantri.map(p => p.tahapProgresId));
      tahaps.forEach(tahap => {
        if (!existingTahapIds.has(tahap.id)) {
          // Fake a CUID for the memory injection so React rendering doesn't choke on missing id
          const mockId = Math.random().toString(36).substring(7);
          const newProgres = {
            id: mockId,
            santriId: santri.id,
            tahapProgresId: tahap.id,
            selesai: false,
            tanggalSelesai: null,
            catatan: null,
            updatedAt: new Date(),
          };
          
          bulkInsertData.push({
            santriId: santri.id,
            tahapProgresId: tahap.id,
            selesai: false,
          });
          
          // Inject to memory for immediate render
          santri.progresSantri.push(newProgres);
        }
      });
    });

    if (bulkInsertData.length > 0) {
      // Fire and forget
      prisma.progresSantri.createMany({
        data: bulkInsertData,
        skipDuplicates: true
      }).catch(err => console.error("Auto-sync progres error:", err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Manajemen Progres Studi</h1>
          <p className="text-text-secondary mt-1">Pantau kesiapan dan keberangkatan santri secara makro.</p>
        </div>
        <Link 
          href={`/admin/progres/master${selectedPeriodeId ? `?periodeId=${selectedPeriodeId}` : ''}`} 
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Settings size={16} /> Pengaturan Tahap
        </Link>
      </div>

      <SpreadsheetProgres 
        santriList={santriList}
        tahaps={tahaps}
        gelombangs={gelombangs}
        periodes={periodes}
        query={query}
        selectedGelombangId={selectedGelombangId}
        selectedPeriodeId={selectedPeriodeId}
      />
    </div>
  );
}
