import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("=== Memulai Sinkronisasi Pembayaran Tahap 2 (Ijazah Based) ===");

  // Cari semua santri MA / PESANTREN
  const santriAgamaList = await prisma.santri.findMany({
    where: {
      riwayatAkademik: {
        in: ['MA', 'IJAZAH_PESANTREN']
      }
    },
    include: {
      pembayaranSantri: {
        include: {
          poinTahap: {
            include: {
              tahapPaket: true
            }
          }
        }
      }
    }
  });

  let counterUpdate = 0;

  for (const santri of santriAgamaList) {
    for (const pembayaran of santri.pembayaranSantri) {
      const tahap = pembayaran.poinTahap.tahapPaket;
      const poin = pembayaran.poinTahap;

      // Cek apakah poin ini berada di tahap isIjazahBased dan nominalIjazah tidak null
      if (tahap.isIjazahBased && poin.nominalIjazah !== null) {
        
        // Cek apakah nominalHarus saat ini belum sync (memakai nominal non-ijazah atau angka lain)
        if (pembayaran.nominalHarus !== poin.nominalIjazah) {
          
          const isLunas = pembayaran.nominalDibayar >= poin.nominalIjazah;
          
          await prisma.pembayaranSantri.update({
            where: { id: pembayaran.id },
            data: {
              nominalHarus: poin.nominalIjazah,
              isLunas: isLunas,
              tanggalLunas: isLunas && !pembayaran.tanggalLunas ? new Date() : pembayaran.tanggalLunas
            }
          });
          
          counterUpdate++;
          console.log(`Mengoreksi tagihan ${poin.nama} untuk ${santri.namaLengkap}: ${pembayaran.nominalHarus} -> ${poin.nominalIjazah}`);
        }
      }
    }
  }

  console.log("=== Selesai Sinkronisasi ===");
  console.log(`Berhasil menyesuaikan nominalHarus untuk ${counterUpdate} data pecahan tagihan.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
