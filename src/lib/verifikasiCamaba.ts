import { prisma } from "@/lib/prisma";

// Inti logika verifikasi camaba: generate NIS, tandai verified, buatkan
// sisa tagihan. Dipakai oleh:
//  - server action verifySantri (klik manual admin), dan
//  - prosesPembayaranSukses (auto-verifikasi saat Midtrans settlement).
// Idempoten: camaba yang sudah verified dilewati.
export async function verifikasiCamaba(
  santriId: string
): Promise<{ success: boolean; error?: string; nis?: string }> {
  const santri = await prisma.santri.findUnique({
    where: { id: santriId },
    include: { gelombang: true },
  });

  if (!santri) {
    return { success: false, error: "Santri tidak ditemukan." };
  }
  if (santri.isVerified) {
    return { success: true, nis: santri.nis ?? undefined };
  }

  // 1. Angka gelombang dari nama gelombang
  const gelombangMatch = santri.gelombang.nama.match(/\d+/);
  const gelombangNum = gelombangMatch ? parseInt(gelombangMatch[0]) : 1;
  const kodeGelombang = String(gelombangNum).padStart(2, "0");

  // 2. DDMMYY dari tanggal mendaftar
  const regDate = santri.createdAt;
  const dd = String(regDate.getDate()).padStart(2, "0");
  const mm = String(regDate.getMonth() + 1).padStart(2, "0");
  const yy = String(regDate.getFullYear()).slice(-2);
  const tanggalMendaftar = `${dd}${mm}${yy}`;

  // 3. Nomor urut dalam gelombang
  const latestVerifiedCount = await prisma.santri.count({
    where: { isVerified: true, gelombangId: santri.gelombangId },
  });
  const nomorUrut = String(latestVerifiedCount + 1).padStart(3, "0");
  const generatedNis = `${kodeGelombang}${tanggalMendaftar}${nomorUrut}`;

  // Paket default
  let paket = await prisma.paketPembayaran.findFirst({
    where: { isDefault: true },
    include: { tahapPaket: { include: { poinTahap: true } } },
  });
  if (!paket) {
    paket = await prisma.paketPembayaran.findFirst({
      include: { tahapPaket: { include: { poinTahap: true } } },
    });
  }

  const isAgama =
    santri.riwayatAkademik === "MA" ||
    santri.riwayatAkademik === "IJAZAH_PESANTREN";

  // Tagihan yang sudah dibuat (mis. saat pendaftaran) tidak dibuat ulang.
  const existingPembayaran = await prisma.pembayaranSantri.findMany({
    where: { santriId },
    select: { poinTahapId: true },
  });
  const existingPoinIds = new Set(existingPembayaran.map((p) => p.poinTahapId));

  const pembayaranRecords: any[] = [];
  if (paket) {
    for (let t = 0; t < paket.tahapPaket.length; t++) {
      const tahap = paket.tahapPaket[t];
      for (let p = 0; p < tahap.poinTahap.length; p++) {
        const poin = tahap.poinTahap[p];
        if (existingPoinIds.has(poin.id)) continue;
        const nominalActive =
          tahap.isIjazahBased && isAgama && poin.nominalIjazah !== null
            ? poin.nominalIjazah
            : poin.nominal;

        let nominalDibayar = 0;
        let isLunas = nominalActive === 0 && !poin.isBebas;
        if (t === 0 && p === 0) {
          nominalDibayar = nominalActive;
          isLunas = true;
        }

        pembayaranRecords.push({
          santriId,
          poinTahapId: poin.id,
          nominalHarus: nominalActive,
          nominalDibayar,
          isLunas,
        });
      }
    }
  }

  await prisma.santri.update({
    where: { id: santriId },
    data: {
      isVerified: true,
      nis: generatedNis,
      nomorUrut,
      paketPembayaranId: paket?.id || null,
    },
  });

  if (pembayaranRecords.length > 0) {
    await prisma.pembayaranSantri.createMany({ data: pembayaranRecords });
  }

  return { success: true, nis: generatedNis };
}
