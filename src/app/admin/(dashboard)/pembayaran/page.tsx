import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Settings } from "lucide-react";
import SpreadsheetPembayaran from "@/components/admin/SpreadsheetPembayaran";
import { redirect } from "next/navigation";

export default async function AdminPembayaranPage({ searchParams }: { searchParams: Promise<{ q?: string, gelombangId?: string, paketId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const filterGelombangId = resolvedSearchParams.gelombangId || "";
  const filterPaketId = resolvedSearchParams.paketId || "";

  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  
  const gelombangs = activePeriode ? await prisma.gelombang.findMany({
    where: { periodeId: activePeriode.id },
    orderBy: { tanggalBuka: 'asc' }
  }) : [];

  // Default Gelombang if not specified and available
  const selectedGelombangId = filterGelombangId || (gelombangs.length > 0 ? gelombangs[0].id : "");

  // Fetch all packages for the dropdown
  const allPakets = activePeriode ? await prisma.paketPembayaran.findMany({
    where: { periodeId: activePeriode.id },
    orderBy: { urutan: 'asc' },
    select: { id: true, nama: true, isDefault: true }
  }) : [];

  const defaultPaket = allPakets.find(p => p.isDefault) || allPakets[0];
  const selectedPaketId = filterPaketId || (defaultPaket ? defaultPaket.id : "");

  // Auto-assign existing unassigned santri to the default package (Retroactive fix)
  if (defaultPaket) {
    const unassignedCount = await prisma.santri.count({
      where: { isVerified: true, paketPembayaranId: null }
    });
    if (unassignedCount > 0) {
      await prisma.santri.updateMany({
        where: { isVerified: true, paketPembayaranId: null },
        data: { paketPembayaranId: defaultPaket.id }
      });
    }
  }

  let targetPakets = [];
  if (selectedPaketId === "all") {
    targetPakets = await prisma.paketPembayaran.findMany({
      orderBy: { urutan: 'asc' },
      include: {
        tahapPaket: {
          orderBy: { urutan: 'asc' },
          include: { poinTahap: { orderBy: { urutan: 'asc' } } }
        }
      }
    });
  } else if (selectedPaketId) {
    const single = await prisma.paketPembayaran.findUnique({
      where: { id: selectedPaketId },
      include: {
        tahapPaket: {
          orderBy: { urutan: 'asc' },
          include: { poinTahap: { orderBy: { urutan: 'asc' } } }
        }
      }
    });
    if (single) targetPakets.push(single);
  }

  const santriList = selectedGelombangId ? await prisma.santri.findMany({
    where: {
      isVerified: true,
      gelombangId: selectedGelombangId,
      paketPembayaranId: selectedPaketId === "all" ? undefined : selectedPaketId,
      OR: [
        { namaLengkap: { contains: query, mode: 'insensitive' } },
        { nis: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      pembayaranSantri: {
        include: { poinTahap: true }
      },
      darulLughoh: true
    },
    orderBy: { nis: 'asc' }
  }) : [];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Spreadsheet Pembayaran</h1>
          <p className="text-text-secondary mt-1">Lacak dan input pembayaran cicilan santri secara horizontal.</p>
        </div>
        <Link 
          href="/admin/pembayaran/master"
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm"
        >
          <Settings size={16} /> Master Paket
        </Link>
      </div>

      <SpreadsheetPembayaran 
        santriList={santriList} 
        targetPakets={targetPakets}
        allPakets={allPakets}
        gelombangs={gelombangs}
        query={query}
        selectedGelombangId={selectedGelombangId}
        selectedPaketId={selectedPaketId}
      />
    </div>
  );
}
