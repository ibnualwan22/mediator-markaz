import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Settings } from "lucide-react";
import SpreadsheetPemberkasan from "@/components/admin/SpreadsheetPemberkasan";

export default async function AdminPemberkasanPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const filterGelombangId = resolvedSearchParams.gelombangId || "";

  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  
  const gelombangs = activePeriode ? await prisma.gelombang.findMany({
    where: { periodeId: activePeriode.id },
    orderBy: { tanggalBuka: 'asc' }
  }) : [];

  const selectedGelombangId = filterGelombangId || (gelombangs.length > 0 ? gelombangs[0].id : "");

  // Master Items
  const items = await prisma.itemPemberkasan.findMany({
    where: activePeriode ? { periodeId: activePeriode.id } : {},
    orderBy: [
      { kategori: 'asc' },
      { urutan: 'asc' }
    ]
  });

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
      pemberkasan: true
    },
    orderBy: { nis: 'asc' }
  }) : [];

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
        query={query}
        selectedGelombangId={selectedGelombangId}
      />
    </div>
  );
}
