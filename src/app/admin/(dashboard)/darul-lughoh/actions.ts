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

  if (existing) return { success: false, error: "Camaba sudah set level awal" };

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
  if (!dl) return { success: false, error: "Record not found" };

  let currentNominal = Math.min(nominalDibayar, dl.nominalHarus);
  let surplus = Math.max(0, nominalDibayar - dl.nominalHarus);

  const isLunas = currentNominal >= dl.nominalHarus;
  await prisma.darulLughohSantri.update({
    where: { id },
    data: { nominalDibayar: currentNominal, isLunas }
  });

  if (surplus > 0) {
    const allDLs = await prisma.darulLughohSantri.findMany({
      where: { santriId: dl.santriId },
      orderBy: [
        { level: 'asc' },
        { percobaan: 'asc' }
      ]
    });

    const startIndex = allDLs.findIndex(d => d.id === dl.id);
    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < allDLs.length; i++) {
        if (surplus <= 0) break;
        const nextDl = allDLs[i];
        const nextKekurangan = Math.max(0, nextDl.nominalHarus - nextDl.nominalDibayar);
        
        if (nextKekurangan > 0) {
          const takeAmount = Math.min(surplus, nextKekurangan);
          const newDibayar = nextDl.nominalDibayar + takeAmount;
          
          await prisma.darulLughohSantri.update({
            where: { id: nextDl.id },
            data: { 
              nominalDibayar: newDibayar, 
              isLunas: newDibayar >= nextDl.nominalHarus 
            }
          });
          
          surplus -= takeAmount;
        }
      }
    }
  }

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
  return { success: true, remainingSurplus: surplus };
}

export async function updateDarulLughohMeta(id: string, tanggalJatuhTempo: Date | null, catatan: string | null) {
  await prisma.darulLughohSantri.update({
    where: { id },
    data: { tanggalJatuhTempo, catatan }
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
    return { success: false, error: "Gagal me-reset Dauroh Lughoh & Ta'hili" };
  }
}

export async function bulkUpdateStatusLulusDL(ids: string[]) {
  for (const id of ids) {
    await updateStatusUjianDL(id, "LULUS");
  }
  return { success: true };
}

export async function undoStatusUjianDL(id: string) {
  const current = await prisma.darulLughohSantri.findUnique({ where: { id } });
  if (!current) return { success: false, error: "Not found" };

  await prisma.darulLughohSantri.update({
    where: { id },
    data: { 
      statusUjian: "BELUM_UJIAN",
      tanggalUjian: null
    }
  });

  await prisma.darulLughohSantri.deleteMany({
    where: {
      santriId: current.santriId,
      OR: [
        { level: { gt: current.level } },
        { level: current.level, percobaan: { gt: current.percobaan } }
      ]
    }
  });

  revalidatePath("/admin/darul-lughoh");
  revalidatePath("/admin/pembayaran");
  return { success: true };
}

export async function deleteAttemptDL(id: string) {
  try {
    await prisma.darulLughohSantri.delete({ where: { id } });
    revalidatePath("/admin/darul-lughoh");
    revalidatePath("/admin/pembayaran");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Gagal menghapus riwayat" };
  }
}
