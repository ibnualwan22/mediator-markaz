import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

// Simple Levenshtein distance for fuzzy matching
function levenshtein(s1: string, s2: string) {
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  
  const v0 = new Array(s2.length + 1);
  const v1 = new Array(s2.length + 1);
  
  for (let i = 0; i <= s2.length; i++) v0[i] = i;
  
  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= s2.length; j++) v0[j] = v1[j];
  }
  return v1[s2.length];
}

// Normalize strings for matching
function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File Excel harus dipilih" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: "File kosong / salah format" }, { status: 400 });
    }

    // Attempt to detect columns
    const firstRow = rawData[0];
    const nameCol = Object.keys(firstRow).find(k => k.toLowerCase().includes('nama'));
    const urutCol = Object.keys(firstRow).find(k => k.toLowerCase().includes('urut') || k.toLowerCase() === 'nis' || k.toLowerCase().includes('no'));

    if (!nameCol || !urutCol) {
      return NextResponse.json({ error: "Kolom Nama atau Nomor Urut tidak terdeteksi otomatis. Pastikan file memiliki heading 'Nama' dan 'Nomor Urut'." }, { status: 400 });
    }

    // Cache ALL santris from DB into memory once so we don't spam the DB
    const allDbSantris = await prisma.santri.findMany({
      select: { id: true, namaLengkap: true }
    });

    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rawNama = row[nameCol];
      const rawUrut = row[urutCol];
      
      const rowNum = i + 2;

      if (!rawNama) {
        errors.push(`Baris ${rowNum}: Nama kosong`);
        failedCount++;
        continue;
      }
      if (!rawUrut) {
        continue; // skip if no urut provided
      }

      // Convert urut to string and pad it if necessary (the user said 2 digits, but we just save it as string)
      let urutStr = String(rawUrut).trim();
      
      const searchNorm = normalizeText(String(rawNama));
      
      // Perform fuzzy matching against all DB santris
      let bestMatch: typeof allDbSantris[0] | null = null;
      let bestDistance = Infinity;

      for (const dbSantri of allDbSantris) {
        const dbNorm = normalizeText(dbSantri.namaLengkap);
        const distance = levenshtein(searchNorm, dbNorm);
        
        // Allowed threshold: if string length is ~10, maybe allow distance up to 3 for typos
        // e.g., missing one letter is distance 1
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = dbSantri;
        }
      }

      // Determine acceptable threshold based on name length
      const maxAllowedDistance = Math.max(2, Math.floor(searchNorm.length * 0.3));

      if (bestMatch && bestDistance <= maxAllowedDistance) {
        const finalUrut = urutStr.length < 2 ? urutStr.padStart(2, '0') : urutStr;

        try {
          await prisma.santri.update({
            where: { id: bestMatch.id },
            data: { nomorUrut: finalUrut }
          });
          successCount++;
        } catch (err: any) {
          errors.push(`Baris ${rowNum}: Gagal update nomor urut`);
          failedCount++;
        }
      } else {
        errors.push(`Baris ${rowNum}: Tidak dapat mencocokkan nama "${rawNama}" (Paling dekat: ${bestMatch?.namaLengkap || 'Kosong'} dng jarak ${bestDistance})`);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total: rawData.length, success: successCount, failed: failedCount, errors }
    });

  } catch (error: any) {
    console.error("Import Excel Error:", error);
    return NextResponse.json({ error: "Kesalahan server saat memproses file" }, { status: 500 });
  }
}
