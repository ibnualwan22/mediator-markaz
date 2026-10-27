import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSantriFolder, uploadFileToDrive } from "@/lib/googleDrive";
import {
  MAX_UPLOAD_SIZE,
  sanitizeFileNamePart,
  validateUploadBuffer,
} from "@/lib/uploadValidation";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const maxDuration = 60; // Set longer timeout if supported by hosting, Drive API can take time.

// Endpoint publik (form pendaftaran belum punya sesi), jadi pembatasnya
// per IP. Admin yang sedang login dibebaskan karena spreadsheet admin
// bisa mengunggah ratusan berkas dari satu IP yang sama.
// Batas: 30 upload per IP per jam — satu pendaftar normal hanya ~7 berkas.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const santriNameRaw = formData.get("santriName") as string;
    const documentNameRaw = formData.get("documentName") as string; // e.g. "Pas Foto", "Akte Kelahiran"

    // Optional: admin spreadsheet can pass the santri's actual gelombang/periode
    const overrideGelombang = formData.get("gelombangNama") as string | null;
    const overridePeriode = formData.get("periodeNama") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Pembatas laju (admin login dikecualikan, lihat komentar di atas).
    const adminSession = await getServerSession(authOptions);
    if (!adminSession) {
      const ip = getClientIp(req);
      if (isRateLimited(`upload-drive:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
        return NextResponse.json(
          { error: "Terlalu banyak upload. Silakan coba lagi nanti." },
          { status: 429 }
        );
      }
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB." },
        { status: 400 }
      );
    }

    // Validasi ISI file (magic bytes) SEBELUM folder dibuat, agar berkas
    // tidak valid tidak sempat membuat folder spam di Drive. Tipe dan
    // ekstensi dari browser tidak dipercaya sama sekali.
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadBuffer(buffer, { allowPdf: true });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const santriName = sanitizeFileNamePart(santriNameRaw);
    const documentName = sanitizeFileNamePart(documentNameRaw);

    let periodeNama: string;
    let gelombangNama: string;

    if (overrideGelombang && overridePeriode) {
      // Use the santri's actual gelombang/periode (from admin spreadsheet)
      periodeNama = overridePeriode.replace(/\//g, "-");
      gelombangNama = overrideGelombang.replace(/\//g, "-");
    } else {
      // Fallback: use active gelombang (for santri self-registration)
      const activeGelombang = await prisma.gelombang.findFirst({
        where: { isActive: true },
        include: { periode: true },
      });

      if (!activeGelombang) {
        return NextResponse.json({ error: "Pendaftaran sedang ditutup. Tidak ada gelombang aktif." }, { status: 400 });
      }

      periodeNama = activeGelombang.periode.nama.replace(/\//g, "-");
      gelombangNama = activeGelombang.nama.replace(/\//g, "-");
    }

    const safeSantriName = santriName.replace(/\//g, "-");

    // 2. Siapkan Folder Google Drive (Otomatis)
    const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);

    // 3. Unggah File (nama + MIME dari hasil deteksi, bukan dari browser)
    const newFileName = `${documentName} - ${safeSantriName}.${validation.ext}`;

    const driveRes = await uploadFileToDrive(buffer, newFileName, validation.mime, santriFolderId);

    // Kembalikan URL WebView agar bisa di-preview atau disimpan ke string URL DB.
    return NextResponse.json({
      success: true,
      secure_url: driveRes.webViewLink,
      fileId: driveRes.id
    });

  } catch (error: any) {
    console.error("Upload Drive Error:", error);
    // Pesan error internal (Drive/Prisma) tidak dikirim ke klien.
    return NextResponse.json({ error: "Gagal menyimpan foto/dokumen ke sistem." }, { status: 500 });
  }
}
