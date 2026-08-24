import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

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

    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const nis = row["NIS"] ? String(row["NIS"]) : undefined;
      const nama = row["Nama Lengkap"];
      let paspor = row["Nomor Paspor"] ? String(row["Nomor Paspor"]).toUpperCase().trim() : undefined;
      
      const rowNum = i + 2;

      if (!nama) {
        errors.push(`Baris ${rowNum}: Nama Lengkap wajib diisi`);
        failedCount++;
        continue;
      }
      
      if (!paspor || paspor.trim() === "") {
        // Lewati karena tidak mengupdate paspor (mungkin cuma ada di excel default)
        continue; 
      }

      try {
        let santri = null;

        if (nis) {
          santri = await prisma.santri.findFirst({
            where: { noPendaftaran: String(nis) }
          });
        }
        
        if (!santri && nama) {
          const matchedSantris = await prisma.santri.findMany({
            where: { namaLengkap: String(nama) }
          });
          if (matchedSantris.length === 1) santri = matchedSantris[0];
          else if (matchedSantris.length > 1) {
            errors.push(`Baris ${rowNum}: Ditemukan nama kembar "${nama}". Spesifikasikan NIS.`);
            failedCount++;
            continue;
          }
        }

        if (!santri) {
          errors.push(`Baris ${rowNum}: Santri "${nama}" ${nis ? `atau NIS "${nis}"` : ""} tidak ditemukan di web`);
          failedCount++;
          continue;
        }

        await prisma.santri.update({
          where: { id: santri.id },
          data: { nomorPaspor: paspor }
        });

        successCount++;
      } catch (err: any) {
        console.error(`Gagal import paspor baris ${rowNum}:`, err);
        errors.push(`Baris ${rowNum}: Gagal menyimpan paspor untuk ${nama}`);
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
