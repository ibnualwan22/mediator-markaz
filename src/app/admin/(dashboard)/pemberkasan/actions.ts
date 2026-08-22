"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createItemPemberkasan(data: { nama: string; tipe: string; isWajib: boolean; urutan: number }) {
  const activePeriode = await prisma.periode.findFirst({ where: { isActive: true } });
  const periodeId = activePeriode ? activePeriode.id : (await prisma.periode.findFirst())?.id || "default";

  await prisma.itemPemberkasan.create({
    data: {
      nama: data.nama,
      periodeId,
      kategori: data.tipe === 'INDO' ? 'INDONESIA' : 'MESIR',
      isActive: data.isWajib, // Using isActive to store isWajib logic for now
      urutan: data.urutan
    }
  });
  revalidatePath("/admin/pemberkasan/master");
}

export async function initSantriPemberkasan(santriId: string) {
  // Get all master items
  const items = await prisma.itemPemberkasan.findMany();
  
  // Get existing
  const existing = await prisma.pemberkasanSantri.findMany({
    where: { santriId }
  });
  
  const existingItemIds = existing.map(e => e.itemPemberkasanId);

  const missingItems = items.filter(i => !existingItemIds.includes(i.id));

  if (missingItems.length > 0) {
    await prisma.pemberkasanSantri.createMany({
      data: missingItems.map(i => ({
        santriId,
        itemPemberkasanId: i.id,
        sudahDikumpulkan: false
      }))
    });
  }

  revalidatePath(`/admin/pemberkasan/${santriId}`);
}

export async function updateStatusPemberkasan(id: string, status: string, catatan?: string) {
  const sudahDikumpulkan = status === "SELESAI";
  await prisma.pemberkasanSantri.update({
    where: { id },
    data: { 
      sudahDikumpulkan,
      ...(catatan !== undefined ? { catatan } : {}) 
    }
  });
  revalidatePath(`/admin/pemberkasan`);
}

export async function toggleCheckboxPemberkasan(id: string, sudahDikumpulkan: boolean) {
  await prisma.pemberkasanSantri.update({
    where: { id },
    data: { sudahDikumpulkan }
  });
  revalidatePath(`/admin/pemberkasan`);
}
