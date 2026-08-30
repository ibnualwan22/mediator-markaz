import "dotenv/config";
// Since Prisma client is generated in src/generated/prisma as per schema.prisma
// we use the generated one, or the one from lib/prisma if possible.
// For a standalone script, we can instantiate it directly from the default generated location if it's there,
// But wait, schema.prisma says output = "../src/generated/prisma".
import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("=== Memulai Update Data Santri ===");
  
  // Ambil semua santri berserta total pembayaran (dari tabel baru dan legacy)
  const santriList = await prisma.santri.findMany({
    include: {
      pembayaranSantri: true,
      legacyPembayaran: true
    }
  });

  let counterUpdate = 0;

  for (const santri of santriList) {
    // Kriteria "ijazahnya masih kosong"
    // Di sini kita asumsikan jika tidak spesifik MA atau IJAZAH_PESANTREN, dan fileIjazah masih bawaan ("-" atau "").
    // Anda bisa menyesuaikan kondisi ini.
    const isIjazahKosong = 
      (santri.riwayatAkademik === "SMA" || santri.riwayatAkademik === "LAINNYA") &&
      (santri.fileIjazah === "-" || !santri.fileIjazah);
      
    if (!isIjazahKosong) continue;

    // Hitung total bayar dari sistem baru
    const nominalDibayarBaru = santri.pembayaranSantri.reduce((acc, p) => acc + p.nominalDibayar, 0);
    // Hitung total bayar dari sistem lama (legacy)
    const nominalDibayarLama = santri.legacyPembayaran.reduce((acc, p) => p.status === 'LUNAS' ? acc + p.nominal : acc, 0);
    
    const totalPembayaran = nominalDibayarBaru + nominalDibayarLama;

    // Jika telah membayar sama dengan atau lebih dari 3.850.000
    if (totalPembayaran >= 3850000) {
      console.log(`Mengupdate riwayatAkademik untuk ${santri.namaLengkap} (${santri.noPendaftaran}) -> MA`);
      
      await prisma.santri.update({
        where: { id: santri.id },
        data: {
          riwayatAkademik: "MA"
        }
      });
      counterUpdate++;
    }
  }

  console.log("=== Update Selesai ===");
  console.log(`Berhasil mengupdate ${counterUpdate} santri.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
