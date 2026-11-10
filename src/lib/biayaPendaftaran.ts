// Resolusi biaya Tahap 1 (booking) untuk form pendaftaran.
//
// Aturan nominal SAMA dengan verifySantri (santri/actions.ts) dan
// updatePembayaranSantriMeta (pembayaran/actions.ts) — itulah satu-satunya
// tempat rumus ini boleh tinggal. Jangan turunkan ulang rumusnya di route
// atau komponen lain; panggil helper ini.
//
// - Paket: default milik periode gelombang; fallback paket default global;
//   fallback paket pertama (sama seperti verifySantri).
// - Tahap/poin: urutan terkecil (tahap 1, poin 1 = booking).
// - Nominal: bila tahap isIjazahBased dan riwayat MA/IJAZAH_PESANTREN dan
//   poin.nominalIjazah terisi → pakai nominalIjazah; bila tidak → nominal.
import { prisma } from "@/lib/prisma";
import { Prisma } from "../generated/prisma/client";

const paketDenganTahap = {
  tahapPaket: {
    orderBy: { urutan: "asc" },
    include: { poinTahap: { orderBy: { urutan: "asc" } } },
  },
} satisfies Prisma.PaketPembayaranInclude;

export type BiayaPendaftaran = {
  poinTahapId: string;
  poinNama: string;
  tahapNama: string;
  nominal: number;
};

export async function resolveBiayaPendaftaran(
  gelombangId: string,
  riwayatAkademik?: string | null
): Promise<BiayaPendaftaran | null> {
  const gelombang = await prisma.gelombang.findUnique({
    where: { id: gelombangId },
    select: { periodeId: true },
  });

  let paket = null as Prisma.PaketPembayaranGetPayload<{ include: typeof paketDenganTahap }> | null;
  if (gelombang) {
    paket = await prisma.paketPembayaran.findFirst({
      where: { periodeId: gelombang.periodeId, isDefault: true },
      include: paketDenganTahap,
    });
  }
  if (!paket) {
    paket = await prisma.paketPembayaran.findFirst({
      where: { isDefault: true },
      include: paketDenganTahap,
    });
  }
  if (!paket) {
    paket = await prisma.paketPembayaran.findFirst({ include: paketDenganTahap });
  }
  if (!paket) return null;

  const tahap = paket.tahapPaket[0];
  const poin = tahap?.poinTahap[0];
  if (!tahap || !poin) return null;

  const isAgama =
    riwayatAkademik === "MA" || riwayatAkademik === "IJAZAH_PESANTREN";
  const nominal =
    tahap.isIjazahBased && isAgama && poin.nominalIjazah !== null
      ? poin.nominalIjazah
      : poin.nominal;

  return {
    poinTahapId: poin.id,
    poinNama: poin.nama,
    tahapNama: tahap.nama,
    nominal,
  };
}
