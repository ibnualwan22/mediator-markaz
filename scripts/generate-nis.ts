import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Mulai pengecekan Santri yang belum memiliki NIS...");

  // Get all santri without NIS
  const santriWithoutNis = await prisma.santri.findMany({
    where: { nis: null },
    include: { gelombang: true },
    orderBy: { createdAt: "asc" }, // Generate sequentially based on registration time
  });

  if (santriWithoutNis.length === 0) {
    console.log("Semua santri di database sudah memiliki NIS.");
    return;
  }

  console.log(`Ditemukan ${santriWithoutNis.length} santri yang belum memiliki NIS.\n`);

  // We want to process them by gelombang to maintain the 'nomorUrut' logic correctly
  // First, get the current counter mapping for each gelombang
  const gelombangCounts = new Map<string, number>();

  for (const santri of santriWithoutNis) {
    // 1. Calculate gelombang digits
    const gelombangMatch = santri.gelombang.nama.match(/\d+/);
    const gelombangNum = gelombangMatch ? parseInt(gelombangMatch[0]) : 1;
    const kodeGelombang = String(gelombangNum).padStart(2, "0");

    // 2. Format DDMMYY from createdAt
    const regDate = santri.createdAt;
    const dd = String(regDate.getDate()).padStart(2, "0");
    const mm = String(regDate.getMonth() + 1).padStart(2, "0");
    const yy = String(regDate.getFullYear()).slice(-2);
    const tanggalMendaftar = `${dd}${mm}${yy}`;

    // 3. Get / initialize sequence number (nomorUrut)
    if (!gelombangCounts.has(santri.gelombangId)) {
      // Get the existing count of verified/NIS-having santri for this gelombang
      const existingCount = await prisma.santri.count({
        where: {
          gelombangId: santri.gelombangId,
          nis: { not: null },
        },
      });
      gelombangCounts.set(santri.gelombangId, existingCount);
    }

    const currentCount = gelombangCounts.get(santri.gelombangId)!;
    const nextCount = currentCount + 1;
    gelombangCounts.set(santri.gelombangId, nextCount);

    const nomorUrut = String(nextCount).padStart(3, "0");

    // 4. Final NIS Format string
    const generatedNis = `${kodeGelombang}${tanggalMendaftar}${nomorUrut}`;

    console.log(
      `Memproses ${santri.namaLengkap} - Pendaftaran: ${santri.noPendaftaran} -> NIS: ${generatedNis}`
    );

    // Update to DB
    await prisma.santri.update({
      where: { id: santri.id },
      data: {
        nis: generatedNis,
        isVerified: true, // Auto set to verified based on existing logic
      },
    });

    // Also apply automatic stages creation based on verified logic
    try {
      const isAgama =
        santri.riwayatAkademik === "MA" ||
        santri.riwayatAkademik === "IJAZAH_PESANTREN";
      const nominalTahap3 = isAgama ? 3850000 : 4850000;

      // Check existing payments to avoid duplicates
      const existingPayments = await prisma.pembayaran.findMany({
        where: { santriId: santri.id, tahap: { in: [2, 3, 4, 5] } }
      });

      const existingStages = existingPayments.map(p => p.tahap);
      
      const newPayments = [
        { tahap: 2, nominal: 1200000, status: "BELUM_BAYAR", keterangan: "Sebelum Pelaksanaan Tes Tahdid Mustawa" },
        { tahap: 3, nominal: nominalTahap3, status: "BELUM_BAYAR", keterangan: "Menjelang Pelaksanaan Ujian Mu'adalah" },
        { tahap: 4, nominal: 6500000, status: "BELUM_BAYAR", keterangan: "Sebelum Pengajuan Visa" },
        { tahap: 5, nominal: 16250000, status: "BELUM_BAYAR", keterangan: "Sebelum Pemberangkatan" }
      ].filter(p => !existingStages.includes(p.tahap))
       .map(p => ({ ...p, santriId: santri.id }));

      if (newPayments.length > 0) {
         // @ts-ignore
         await prisma.pembayaran.createMany({ data: newPayments });
      }

    } catch (err) {
      console.log(`Peringatan: Gagal generate tagihan otomatis untuk ${santri.namaLengkap} (mungkin sudah ada)`);
    }
  }

  console.log("\n✅ Berhasil membuat NIS untuk semua santri yang belum memiliki.");
}

main()
  .catch((e) => {
    console.error("Kesalahan saat menjalankan script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
