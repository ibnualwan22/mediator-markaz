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
    // Generation of new payment format is handled by verify admin actions, or retroactive auto-script in dashboard!
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
