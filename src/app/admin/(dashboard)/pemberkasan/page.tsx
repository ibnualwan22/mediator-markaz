import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Settings } from "lucide-react";
import SpreadsheetPemberkasan from "@/components/admin/SpreadsheetPemberkasan";

export default async function AdminPemberkasanPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string, periodeId?: string }> }) {
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

  // Master Items
  const items = await prisma.itemPemberkasan.findMany({
    where: selectedPeriodeId ? { periodeId: selectedPeriodeId } : {},
    orderBy: [
      { kategori: 'asc' },
      { urutan: 'asc' }
    ]
  });

  const santriList = selectedGelombangId ? await prisma.santri.findMany({
    where: {
      isVerified: true,
      gelombangId: selectedGelombangId === "all" ? undefined : selectedGelombangId,
      OR: [
        { namaLengkap: { contains: query, mode: 'insensitive' } },
        { nis: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      pemberkasan: true
    },
    orderBy: { namaLengkap: 'asc' }
  }) : [];

  // Auto-sync missing PemberkasanSantri records without requiring manual action
  if (items.length > 0 && santriList.length > 0) {
    const bulkInsertData: any[] = [];
    santriList.forEach(santri => {
      const existingItemIds = new Set(santri.pemberkasan.map(p => p.itemPemberkasanId));
      items.forEach(item => {
        if (!existingItemIds.has(item.id)) {
          // Fake a CUID for the memory injection so React rendering doesn't choke on missing id
          const mockId = Math.random().toString(36).substring(7);
          const newKesan = {
            id: mockId,
            santriId: santri.id,
            itemPemberkasanId: item.id,
            sudahDikumpulkan: false,
            catatan: null
          };
          bulkInsertData.push({ santriId: santri.id, itemPemberkasanId: item.id, sudahDikumpulkan: false });
          // Inject into memory exactly what react expects
          santri.pemberkasan.push(newKesan as any); 
        }
      });
    });

    if (bulkInsertData.length > 0) {
      await prisma.pemberkasanSantri.createMany({
        data: bulkInsertData
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Spreadsheet Pemberkasan</h1>
          <p className="text-text-secondary mt-1">Lacak kelengkapan berkas pendaftaran santri secara horizontal.</p>
        </div>
        <Link 
          href="/admin/pemberkasan/master" 
          className="px-4 py-2 bg-text-primary text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm flex items-center gap-2"
        >
          <Settings size={16} /> Master Item Berkas
        </Link>
      </div>

      <SpreadsheetPemberkasan 
        santriList={santriList}
        items={items}
        gelombangs={gelombangs}
        periodes={periodes}
        query={query}
        selectedGelombangId={selectedGelombangId}
        selectedPeriodeId={selectedPeriodeId}
      />
    </div>
  );
}
