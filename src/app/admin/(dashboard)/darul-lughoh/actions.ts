"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettingDL() {
  const setting = await prisma.settingDL.findFirst();
  if (setting) return setting;
  return prisma.settingDL.create({ data: { nominalPerLevel: 1950000 } });
}

export async function updateSettingDL(nominalPerLevel: number) {
  const setting = await getSettingDL();
  await prisma.settingDL.update({
    where: { id: setting.id },
    data: { nominalPerLevel }
  });
  revalidatePath("/admin/darul-lughoh");
}

export async function assignLevelDL(santriId: string, level: number) {
  const setting = await getSettingDL();
  
  // Check if exists
  const existing = await prisma.darulLughohSantri.findFirst({
    where: { santriId }
  });

  if (existing) return { success: false, error: "Santri sudah set level awal" };

  const recordsToCreate = [];
  
  // Level terlewati otomatis LULUS dan free
  for (let i = 1; i < level; i++) {
    recordsToCreate.push({
      santriId,
      level: i,
      percobaan: 1,
      nominalHarus: 0,
      nominalDibayar: 0,
      isLunas: true,
      statusUjian: "LULUS",
      catatan: "Terlewati (Penempatan Penyetaraan Awal)"
    });
  }

  // Level saat ini
  recordsToCreate.push({
    santriId,
    level,
    percobaan: 1,
    nominalHarus: setting.nominalPerLevel,
    nominalDibayar: 0,
    statusUjian: "BELUM_UJIAN",
    isLunas: false
  });

  await prisma.darulLughohSantri.createMany({
    data: recordsToCreate
  });

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function updatePembayaranDL(id: string, nominalDibayar: number) {
  const dl = await prisma.darulLughohSantri.findUnique({ where: { id } });
  if (!dl) return;

  const isLunas = nominalDibayar >= dl.nominalHarus;
  await prisma.darulLughohSantri.update({
    where: { id },
    data: { nominalDibayar, isLunas }
  });

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
}

export async function bulkUpdatePembayaranDL(updates: { id: string, nominalDibayar: number }[]) {
  const ops = updates.map(update => {
    return prisma.darulLughohSantri.update({
      where: { id: update.id },
      data: { nominalDibayar: update.nominalDibayar, isLunas: true } // Since we only bulk update to Set Lunas
    });
  });

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
}

export async function updateStatusUjianDL(id: string, status: string) {
  const current = await prisma.darulLughohSantri.findUnique({ where: { id } });
  if (!current) return { success: false, error: "Not found" };

  await prisma.darulLughohSantri.update({
    where: { id },
    data: { 
      statusUjian: status,
      tanggalUjian: new Date()
    }
  });

  if (status === "REMIDI") {
    // create next percobaan
    await prisma.darulLughohSantri.create({
      data: {
        santriId: current.santriId,
        level: current.level,
        percobaan: current.percobaan + 1,
        nominalHarus: current.nominalHarus,
        statusUjian: "BELUM_UJIAN"
      }
    });
  } else if (status === "LULUS" && current.level < 6) {
    // Lanjut ke level berikutnya
    const setting = await getSettingDL();
    
    // Cek agar tidak duplikat
    const existNext = await prisma.darulLughohSantri.findFirst({
      where: {
        santriId: current.santriId,
        level: current.level + 1,
        percobaan: 1
      }
    });

    if (!existNext) {
      await prisma.darulLughohSantri.create({
        data: {
          santriId: current.santriId,
          level: current.level + 1,
          percobaan: 1,
          nominalHarus: setting.nominalPerLevel,
          statusUjian: "BELUM_UJIAN",
          isLunas: false
        }
      });
    }
  }

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function generateNextLevelDL(santriId: string, level: number) {
  const setting = await getSettingDL();
  const existNext = await prisma.darulLughohSantri.findFirst({
    where: { santriId, level, percobaan: 1 }
  });

  if (!existNext) {
    await prisma.darulLughohSantri.create({
      data: {
        santriId,
        level,
        percobaan: 1,
        nominalHarus: setting.nominalPerLevel,
        statusUjian: "BELUM_UJIAN",
        isLunas: false
      }
    });
  }

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function resetAllLevelDL(santriId: string) {
  try {
    await prisma.darulLughohSantri.deleteMany({
      where: { santriId }
    });
    
    revalidatePath("/admin/darul-lughoh");
    revalidatePath("/admin/pembayaran");
    return { success: true };
  } catch (error) {
    console.error("Reset DL error:", error);
    return { success: false, error: "Gagal me-reset Darul Lughoh" };
  }
}
