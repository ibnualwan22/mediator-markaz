import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSantriFolder, uploadFileToDrive } from "@/lib/googleDrive";

export const maxDuration = 60; // Set longer timeout if supported by hosting, Drive API can take time.

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    let santriName = formData.get("santriName") as string;
    const documentName = formData.get("documentName") as string; // e.g. "Pas Foto", "Akte Kelahiran"

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!santriName || santriName.trim() === "") {
      santriName = "Tanpa Nama"; // fallback if user hasn't filled Step 1 completely
    }

    // 1. Dapatkan Gelombang dan Periode Aktif
    const activeGelombang = await prisma.gelombang.findFirst({
      where: { isActive: true },
      include: { periode: true },
    });

    if (!activeGelombang) {
      return NextResponse.json({ error: "Pendaftaran sedang ditutup. Tidak ada gelombang aktif." }, { status: 400 });
    }

    const periodeNama = activeGelombang.periode.nama.replace(/\//g, "-"); // safe folder name
    const gelombangNama = activeGelombang.nama.replace(/\//g, "-");
    const safeSantriName = santriName.replace(/\//g, "-");

    // 2. Siapkan Folder Google Drive (Otomatis)
    const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);

    // 3. Konversi File Web Ke Buffer Node.js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Unggah File (Simpan dengan penamaan terstruktur)
    const originalExt = file.name.split('.').pop() || "pdf";
    const newFileName = `${documentName} - ${safeSantriName}.${originalExt}`;

    const driveRes = await uploadFileToDrive(buffer, newFileName, file.type, santriFolderId);

    // Kembalikan URL WebView agar bisa di-preview atau disimpan ke string URL DB.
    return NextResponse.json({
      success: true,
      secure_url: driveRes.webViewLink,
      fileId: driveRes.id
    });

  } catch (error: any) {
    console.error("Upload Drive Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan foto/dokumen ke sistem: " + error.message }, { status: 500 });
  }
}
