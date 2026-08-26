import { PrismaClient } from '@prisma/client';
import { upsertCicilanPembayaran } from './src/app/admin/(dashboard)/pembayaran/actions';

const prisma = new PrismaClient();

async function main() {
  const santri = await prisma.santri.findFirst({
    where: { 
       paketPembayaranId: { not: null }
    },
    include: {
      paketPembayaran: {
        include: {
          tahapPaket: {
            orderBy: { urutan: 'asc' },
            include: { poinTahap: { orderBy: { urutan: 'asc' } } }
          }
        }
      }
    }
  });

  if (!santri || !santri.paketPembayaran) {
    console.log("No santri or paket");
    return;
  }

  const firstPoint = santri.paketPembayaran.tahapPaket[0].poinTahap[0];
  if (!firstPoint) {
    console.log("No point");
    return;
  }

  console.log("Trying to upsert for santri", santri.id, "point", firstPoint.id);
  console.log("Original Nominal Harus:", firstPoint.nominal);

  // Let's pass a huge input
  const testNominal = firstPoint.nominal + 100000;
  console.log("Input nominal:", testNominal);

  const res = await upsertCicilanPembayaran(santri.id, firstPoint.id, testNominal, firstPoint.nominal);
  console.log("Result:", res);

  // Check the DB
  const records = await prisma.pembayaranSantri.findMany({
    where: { santriId: santri.id }
  });
  console.log("Records in DB after upsert:");
  for (const r of records) {
    console.log("- point:", r.poinTahapId, "dibayar:", r.nominalDibayar, "isLunas:", r.isLunas);
  }
}

main().finally(() => prisma.$disconnect());
