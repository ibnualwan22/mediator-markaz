import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Receipt } from "lucide-react";

export default async function AdminPembayaranPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";

  const santriMembayar = await prisma.santri.findMany({
    where: {
      isVerified: true,
      OR: [
        { namaLengkap: { contains: query, mode: 'insensitive' } },
        { nis: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      pembayaran: true,
    },
    orderBy: { nis: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Manajemen Pembayaran</h1>
        <p className="text-text-secondary mt-1">Pantau dan kelola pembayaran 6 Tahap untuk setiap santri terverifikasi.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-primary-light/20 overflow-hidden text-sm">
        <div className="p-4 border-b border-primary-light/20">
          <form className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Cari NIS atau Nama..." 
              className="w-full pl-9 pr-4 py-2 bg-bg-cream border border-primary-light/30 rounded-lg outline-none focus:border-primary text-sm"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 text-text-primary text-xs">
                <th className="p-4 font-semibold border-b border-primary-light/20">NIS / Nama</th>
                <th className="p-4 font-semibold border-b border-primary-light/20">Progress Pembayaran</th>
                <th className="p-4 font-semibold border-b border-primary-light/20 text-center">Tagihan Aktif</th>
                <th className="p-4 font-semibold border-b border-primary-light/20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {santriMembayar.length > 0 ? santriMembayar.map(s => {
                const totalLunas = s.pembayaran.filter(p => p.status === 'LUNAS').length;
                const belumLunas = s.pembayaran.filter(p => p.status === 'BELUM_BAYAR');
                const nextTahap = belumLunas.length > 0 ? belumLunas[0].tahap : 'Semua Lunas';

                return (
                  <tr key={s.id} className="border-b border-primary-light/10 hover:bg-bg-cream transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-primary">{s.nis}</div>
                      <div className="font-semibold text-text-primary mt-0.5">{s.namaLengkap}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1 text-xs font-medium">
                        Tahap {totalLunas} dari 6 Lunas
                      </div>
                      <div className="w-48 bg-primary-light/20 rounded-full h-1.5 overflow-hidden flex">
                         <div className="bg-success h-full transition-all" style={{ width: `${(totalLunas / 6) * 100}%` }}></div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                       {belumLunas.length > 0 ? (
                         <span className="px-2.5 py-1 bg-warning/10 text-warning font-bold text-xs rounded-full">
                           Menunggu Tahap {nextTahap}
                         </span>
                       ) : (
                         <span className="px-2.5 py-1 bg-success/10 text-success font-bold text-xs rounded-full">
                           Bersih/Lunas
                         </span>
                       )}
                    </td>
                    <td className="p-4 text-center">
                      <Link 
                        href={`/admin/pembayaran/${s.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary-light/40 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium text-xs shadow-sm"
                      >
                        <Receipt size={14} /> Kelola Tagihan
                      </Link>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary italic">
                    {query ? "Tidak ada santri dengan pencarian tersebut." : "Belum ada data santri terverifikasi."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
