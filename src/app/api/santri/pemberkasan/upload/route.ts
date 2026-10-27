import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { ensureSantriFolder, uploadFileToDrive } from "@/lib/googleDrive";
import {
  MAX_UPLOAD_SIZE,
  sanitizeFileNamePart,
  validateUploadBuffer,
} from "@/lib/uploadValidation";
import { isRateLimited } from "@/lib/rateLimit";

export const maxDuration = 60; // Set longer timeout if supported by hosting, Drive API can take time.

// Satu santri normal hanya mengunggah segelintir berkas; 30/jam/akun
// cukup longgar untuk retry, tapi menghentikan flood dari satu akun.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isRateLimited(`pemberkasan-upload:${session.santriId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Terlalu banyak upload. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const itemPemberkasanId = formData.get("itemPemberkasanId") as string | null;
    const field = formData.get("field") as string | null;

    if (!file || (!itemPemberkasanId && !field)) {
      return NextResponse.json({ error: "File dan dokumen pendaftaran tidak lengkap." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB." },
        { status: 400 }
      );
    }

    // Validasi ISI file (magic bytes) sebelum apa pun menyentuh Drive/DB.
    // Tipe dan ekstensi dari browser tidak dipercaya sama sekali.
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadBuffer(buffer, { allowPdf: true });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 1. Get Santri data to construct folder path
    const santri = await prisma.santri.findUnique({
      where: { id: session.santriId },
      include: {
        gelombang: {
          include: { periode: true }
        }
      }
    });

    if (!santri) {
      return NextResponse.json({ error: "Data santri tidak ditemukan." }, { status: 404 });
    }

    const periodeNama = santri.gelombang.periode.nama.replace(/\//g, "-");
    const gelombangNama = santri.gelombang.nama.replace(/\//g, "-");
    const safeSantriName = sanitizeFileNamePart(santri.namaLengkap);

    // Cabang dokumen FORM (field Santri): dipakai tombol upload di seksi
    // Dokumen Pendaftaran portal santri. Berkas disimpan ke field Santri
    // yang sama dengan form pendaftaran (bukan ke PemberkasanSantri).
    const DOKUMEN_FORM: Record<string, string> = {
      fileAkteLahir: "Scan Akte Kelahiran",
      fileKK: "Scan Kartu Keluarga (KK)",
      fileKtp: "Scan/Foto KTP",
      filePasFoto: "Pas Foto",
      fileIjazah: "Scan Ijazah Asli",
      fileTranskrip: "Scan Transkrip Nilai",
      filePaspor: "Scan Paspor",
    };
    if (field) {
      const label = DOKUMEN_FORM[field];
      if (!label) {
        return NextResponse.json({ error: "Field dokumen tidak dikenal." }, { status: 400 });
      }
      const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);
      const newFileName = `${label} - ${safeSantriName}.${validation.ext}`;
      const driveRes = await uploadFileToDrive(buffer, newFileName, validation.mime, santriFolderId);
      await prisma.santri.update({
        where: { id: session.santriId },
        data: { [field]: driveRes.webViewLink } as any,
      });
      return NextResponse.json({
        success: true,
        fileUrl: driveRes.webViewLink,
        message: "Berkas berhasil diupload"
      });
    }

    if (!itemPemberkasanId) {
      return NextResponse.json({ error: "Item pemberkasan tidak ditemukan." }, { status: 404 });
    }
    const item = await prisma.itemPemberkasan.findUnique({
      where: { id: itemPemberkasanId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item pemberkasan tidak ditemukan." }, { status: 404 });
    }

    // 2. Ensure Google Drive Folder
    const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);

    // 3. Upload File (nama + MIME dari hasil deteksi, bukan dari browser)
    const newFileName = `${item.nama} - ${safeSantriName}.${validation.ext}`;

    const driveRes = await uploadFileToDrive(buffer, newFileName, validation.mime, santriFolderId);

    // 4. Update Database Record
    const update = await prisma.pemberkasanSantri.upsert({
      where: {
        santriId_itemPemberkasanId: {
          santriId: session.santriId,
          itemPemberkasanId: itemPemberkasanId
        }
      },
      update: {
        fileUrl: driveRes.webViewLink,
        sudahDikumpulkan: true,
      },
      create: {
        santriId: session.santriId,
        itemPemberkasanId: itemPemberkasanId,
        fileUrl: driveRes.webViewLink,
        sudahDikumpulkan: true,
      }
    });

    return NextResponse.json({
      success: true,
      fileUrl: driveRes.webViewLink,
      message: "Berkas berhasil diupload"
    });

  } catch (error: any) {
    console.error("Upload Pemberkasan Santri Error:", error);
    // Pesan error internal tidak dikirim ke klien.
    return NextResponse.json({ error: "Gagal mengupload berkas." }, { status: 500 });
  }
}
