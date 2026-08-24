"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============ PAKET PEMBAYARAN CRUD ============

export async function createPaket(data: { nama: string; urutan: number; isDefault: boolean }) {
  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  const periodeId = activePeriode ? activePeriode.id : (await prisma.periode.findFirst())?.id || "default";

  // If new is default, unset others first
  if (data.isDefault) {
    await prisma.paketPembayaran.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });
  }

  await prisma.paketPembayaran.create({
    data: {
      nama: data.nama,
      urutan: data.urutan,
      periodeId,
      isDefault: data.isDefault,
    }
  });

  revalidatePath("/admin/pembayaran/master");
}

export async function setPaketDefault(id: string) {
  await prisma.$transaction([
    prisma.paketPembayaran.updateMany({ data: { isDefault: false } }),
    prisma.paketPembayaran.update({ where: { id }, data: { isDefault: true } })
  ]);
  revalidatePath("/admin/pembayaran/master");
}

export async function updatePaket(id: string, data: { nama: string; urutan: number }) {
  await prisma.paketPembayaran.update({
    where: { id },
    data: { nama: data.nama, urutan: data.urutan }
  });
  revalidatePath("/admin/pembayaran/master");
}

export async function deletePaket(id: string) {
  await prisma.paketPembayaran.delete({ where: { id } });
  revalidatePath("/admin/pembayaran/master");
}

// ============ TAHAP PAKET CRUD ============

export async function createTahapPaket(data: { paketPembayaranId: string; nama: string; urutan: number; isIjazahBased: boolean }) {
  await prisma.tahapPaket.create({
    data: {
      paketPembayaranId: data.paketPembayaranId,
      nama: data.nama,
      urutan: data.urutan,
      isIjazahBased: data.isIjazahBased
    }
  });
  revalidatePath("/admin/pembayaran/master");
}

export async function deleteTahapPaket(id: string) {
  await prisma.tahapPaket.delete({ where: { id } });
  revalidatePath("/admin/pembayaran/master");
}

// ============ POIN TAHAP CRUD ============

export async function createPoinTahap(data: { 
  tahapPaketId: string; 
  nama: string; 
  urutan: number; 
  nominal: number; 
  nominalIjazah?: number 
}) {
  await prisma.poinTahap.create({
    data: {
      tahapPaketId: data.tahapPaketId,
      nama: data.nama,
      urutan: data.urutan,
      nominal: data.nominal,
      nominalIjazah: data.nominalIjazah
    }
  });
  revalidatePath("/admin/pembayaran/master");
}

export async function deletePoinTahap(id: string) {
  await prisma.poinTahap.delete({ where: { id } });
  revalidatePath("/admin/pembayaran/master");
}

// ============ PEMBAYARAN SANTRI (SPREADSHEET ACTION) ============

export async function upsertCicilanPembayaran(santriId: string, poinTahapId: string, nominalDibayar: number, nominalHarus: number) {
  const p = await prisma.pembayaranSantri.findUnique({ 
    where: { 
      santriId_poinTahapId: { santriId, poinTahapId } 
    } 
  });

  const resolvedHarus = p ? p.nominalHarus : nominalHarus;
  const isLunas = nominalDibayar >= resolvedHarus;

  if (p) {
    await prisma.pembayaranSantri.update({
      where: { id: p.id },
      data: { 
        nominalDibayar,
        isLunas,
        tanggalLunas: isLunas && !p.isLunas ? new Date() : p.tanggalLunas 
      }
    });
  } else {
    await prisma.pembayaranSantri.create({
      data: {
        santriId,
        poinTahapId,
        nominalHarus: resolvedHarus,
        nominalDibayar,
        isLunas,
        tanggalLunas: isLunas ? new Date() : null
      }
    });
  }

  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function bulkUpsertCicilanPembayaran(updates: { santriId: string, poinTahapId: string, nominalHarus: number }[]) {
  // Execute sequentially or via transaction to avoid concurrent write issues with identical keys
  // For simplicity and to reuse logic, we can construct Prisma operations and run in a transaction
  const operations = [];
  
  for (const update of updates) {
    const { santriId, poinTahapId, nominalHarus } = update;
    
    // In a real bulk setting, we might want to batch findUnique, but since this is usually < 100 students per page, 
    // it's acceptable to do a quick find to read current nominalHarus.
    // However, to optimize, we can find all existing records in one go:
  }
  
  // Actually, let's optimize it:
  const existingRecords = await prisma.pembayaranSantri.findMany({
    where: {
      OR: updates.map(u => ({ santriId: u.santriId, poinTahapId: u.poinTahapId }))
    }
  });

  const existingMap = new Map();
  for (const rec of existingRecords) {
    existingMap.set(`${rec.santriId}-${rec.poinTahapId}`, rec);
  }

  const ops = updates.map(update => {
    const { santriId, poinTahapId, nominalHarus } = update;
    const p = existingMap.get(`${santriId}-${poinTahapId}`);
    const resolvedHarus = p ? p.nominalHarus : nominalHarus;
    
    if (p) {
      return prisma.pembayaranSantri.update({
        where: { id: p.id },
        data: { 
          nominalDibayar: resolvedHarus,
          isLunas: true,
          tanggalLunas: p.isLunas ? p.tanggalLunas : new Date() 
        }
      });
    } else {
      return prisma.pembayaranSantri.create({
        data: {
          santriId,
          poinTahapId,
          nominalHarus: resolvedHarus,
          nominalDibayar: resolvedHarus,
          isLunas: true,
          tanggalLunas: new Date()
        }
      });
    }
  });

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }
  
  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function changePaketSantri(santriId: string, paketPembayaranId: string) {
  // Update santri record
  await prisma.santri.update({
    where: { id: santriId },
    data: { paketPembayaranId }
  });

  // Get new paket points
  const paket = await prisma.paketPembayaran.findUnique({
    where: { id: paketPembayaranId },
    include: {
      tahapPaket: {
        include: { poinTahap: true }
      }
    }
  });

  if (paket) {
    const points = paket.tahapPaket.flatMap(t => 
      t.poinTahap.map(p => ({
        poinId: p.id,
        isIjazahBased: t.isIjazahBased,
        nominal: p.nominal,
        nominalIjazah: p.nominalIjazah
      }))
    );

    const santri = await prisma.santri.findUnique({ where: { id: santriId } });
    if (!santri) return { success: false };

    // UPSERT all points to ensure records exist, keeping old payments
    for (const pt of points) {
      let calcHarus = pt.nominal;
      if (pt.isIjazahBased && pt.nominalIjazah) {
        if (santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN') {
          calcHarus = pt.nominalIjazah;
        }
      }

      await prisma.pembayaranSantri.upsert({
        where: {
          santriId_poinTahapId: { santriId: santri.id, poinTahapId: pt.poinId }
        },
        create: {
          santriId: santri.id,
          poinTahapId: pt.poinId,
          nominalHarus: calcHarus,
          nominalDibayar: 0,
          isLunas: false
        },
        update: {}
      });
    }
  }

  revalidatePath('/admin/pembayaran');
  return { success: true };
}
