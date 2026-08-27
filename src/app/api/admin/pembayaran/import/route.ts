import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File Excel harus dipilih" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Attempting strict numerical import requires robust handling
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: "File Excel kosong atau format tidak sesuai" },
        { status: 400 }
      );
    }

    const errors = [];
    let successCount = 0;
    let failedCount = 0;

    // Cache to prevent repetitive DB queries
    // PoinTahap map: poinId => metadata (nominal, isIjazahBased, nominalIjazah, dll)
    const poinCache = new Map<string, any>();
    const getPoinMeta = async (poinId: string) => {
      if (poinCache.has(poinId)) return poinCache.get(poinId);
      const poin = await prisma.poinTahap.findUnique({
        where: { id: poinId },
        include: { tahapPaket: true }
      });
      if (poin) poinCache.set(poinId, poin);
      return poin;
    };

    const extractPoinId = (headerName: string) => {
      const match = headerName.match(/\((c[a-zA-Z0-9]+)\)$/);
      if (match && match[1]) return match[1];
      return null;
    };

    // Filter headers that looks like payment columns
    const headers = Object.keys(rawData[0] || {});
    const paymentColumns = headers.filter(h => extractPoinId(h) !== null);

    if (paymentColumns.length === 0) {
      return NextResponse.json(
        { error: "Format Kolom tidak sesuai template. Pastikan header memiliki ID poin dalam tanda kurung." },
        { status: 400 }
      );
    }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const nis = row["NIS"];
      const nama = row["Nama Santri"];
      const rowNum = i + 2;

      try {
        let santri = null;
        if (nis) {
          santri = await prisma.santri.findUnique({
            where: { nis: String(nis).trim() }
          });
          // Fallback to noPendaftaran if NIS fetch fails
          if (!santri) {
            santri = await prisma.santri.findUnique({
              where: { noPendaftaran: String(nis).trim() }
            });
          }
        }
        
        if (!santri && nama) {
          const matchedSantris = await prisma.santri.findMany({
            where: { namaLengkap: String(nama).trim() }
          });

          if (matchedSantris.length === 1) {
            santri = matchedSantris[0];
          }
        }

        if (!santri) {
          errors.push(`Baris ${rowNum}: Santri "${nama || nis}" tidak ditemukan`);
          failedCount++;
          continue;
        }

        let hasValidUpdate = false;

        // Perform Sequential DB Ops for each valid payment column
        for (const col of paymentColumns) {
          const rawValue = row[col];
          if (rawValue === undefined || rawValue === null || rawValue === "") continue;

          // Parse explicit numbers
          const numericValue = typeof rawValue === 'number' 
            ? rawValue 
            : parseInt(String(rawValue).replace(/[^\d]/g, ""), 10);
            
          if (isNaN(numericValue)) continue; // skip invalid text

          const poinId = extractPoinId(col);
          if (!poinId) continue;

          const poin = await getPoinMeta(poinId);
          if (!poin) continue;

          // Calculate "Kewajiban" (Nominal Harus)
          let nominalHarus = poin.nominal;
          if (poin.tahapPaket.isIjazahBased && poin.nominalIjazah) {
            if (santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN') {
              nominalHarus = poin.nominalIjazah;
            }
          }

          // Evaluate Lunas
          const isLunas = numericValue >= nominalHarus;

          const existingP = await prisma.pembayaranSantri.findUnique({
            where: { santriId_poinTahapId: { santriId: santri.id, poinTahapId: poinId } }
          });

          if (existingP) {
             // Only update if difference exists
             if (existingP.nominalDibayar !== numericValue || existingP.isLunas !== isLunas) {
               await prisma.pembayaranSantri.update({
                 where: { id: existingP.id },
                 data: {
                   nominalDibayar: numericValue,
                   isLunas,
                   tanggalLunas: isLunas && !existingP.isLunas ? new Date() : existingP.tanggalLunas,
                 }
               });
               hasValidUpdate = true;
             }
          } else {
             // Create incoming entry
             await prisma.pembayaranSantri.create({
               data: {
                 santriId: santri.id,
                 poinTahapId: poinId,
                 nominalHarus: nominalHarus,
                 nominalDibayar: numericValue,
                 isLunas,
                 tanggalLunas: isLunas ? new Date() : null,
                 catatan: "Diimport via Excel"
               }
             });
             hasValidUpdate = true;
          }
        }

        if (hasValidUpdate) {
           successCount++;
        }

      } catch (err: any) {
        console.error(`Gagal import baris ${rowNum}:`, err);
        errors.push(`Baris ${rowNum}: Error memproses "${nama || nis}"`);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: rawData.length,
        success: successCount,
        failed: failedCount,
        errors
      }
    });

  } catch (error: any) {
    console.error("Import Excel Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses file." },
      { status: 500 }
    );
  }
}
