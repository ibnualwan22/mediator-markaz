"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTahapProgres(data: { nama: string; urutan: number; iconUrl?: string }) {
  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  const periodeId = activePeriode ? activePeriode.id : (await prisma.periode.findFirst())?.id || "default";

  await prisma.tahapProgres.create({
    data: {
      nama: data.nama,
      urutan: data.urutan,
      periodeId
    }
  });
  revalidatePath("/admin/progres/master");
}

export async function initSantriProgres(santriId: string) {
  // Get all master stages
  const tahaps = await prisma.tahapProgres.findMany();
  
  // Get existing
  const existing = await prisma.progresSantri.findMany({
    where: { santriId }
  });
  
  const existingTahapIds = existing.map(e => e.tahapProgresId);

  const missingTahaps = tahaps.filter(t => !existingTahapIds.includes(t.id));

  if (missingTahaps.length > 0) {
    await prisma.progresSantri.createMany({
      data: missingTahaps.map(t => ({
        santriId,
        tahapProgresId: t.id,
        selesai: false
      }))
    });
  }

  revalidatePath(`/admin/progres/${santriId}`);
}

export async function updateProgresSantri(id: string, isSelesai: boolean, keterangan?: string) {
  await prisma.progresSantri.update({
    where: { id },
    data: { 
      selesai: isSelesai,
      ...(keterangan !== undefined ? { keterangan } : {}) 
    }
  });
  revalidatePath(`/admin/progres/[santriId]`, 'page');
}
