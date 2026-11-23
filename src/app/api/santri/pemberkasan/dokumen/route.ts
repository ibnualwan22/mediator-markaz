import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { getDriveClient } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

// Kolom dokumen pendaftaran yang boleh diakses lewat proxy ini.
const ALLOWED_FIELDS = new Set([
  "fileAkteLahir",
  "fileKK",
  "fileKtp",
  "filePasFoto",
  "fileIjazah",
  "fileTranskrip",
  "filePaspor",
]);

// Melayani isi dokumen pendaftaran milik santri sendiri untuk pratinjau
// inline di halaman pemberkasan santri. Pola sama dengan proxy foto profil:
// kepemilikan ditegakkan dari sesi (santri hanya bisa membuka dokumennya
// sendiri). Tambahkan ?download=1 supaya file benar-benar terunduh
// (Content-Disposition: attachment) dengan nama file aslinya.
export async function GET(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field") || "";
    const download = searchParams.get("download") === "1";
    if (!ALLOWED_FIELDS.has(field)) {
      return new NextResponse("Field tidak diizinkan", { status: 400 });
    }

    const santri = await prisma.santri.findUnique({
      where: { id: session.santriId },
      select: { [field]: true } as any,
    });

    const docUrl = (santri as any)?.[field] as string | null | undefined;
    if (!docUrl) {
      return new NextResponse("No dokumen", { status: 404 });
    }

    let fileId: string | null = null;
    const match = docUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    } else {
      const match2 = docUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match2) fileId = match2[1];
    }

    if (!fileId) {
      // URL bukan Drive hanya boleh di-redirect bila host-nya diizinkan.
      // Tanpa allowlist ini, URL sembarang dari isian form akan me-redirect
      // santri yang membuka dokumen ke situs phishing (open redirect).
      const REDIRECT_HOSTS = new Set([
        "drive.google.com",
        "drive.usercontent.google.com",
        "res.cloudinary.com",
      ]);
      try {
        const target = new URL(docUrl);
        if (target.protocol === "https:" && REDIRECT_HOSTS.has(target.hostname)) {
          return NextResponse.redirect(target.toString());
        }
      } catch {
        /* URL tidak valid -> 404 di bawah */
      }
      return new NextResponse("No dokumen", { status: 404 });
    }

    const drive = getDriveClient();
    const meta = await drive.files.get({ fileId, fields: "mimeType, name", supportsAllDrives: true });
    const mimeType = meta.data.mimeType || "application/octet-stream";

    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);

    if (download) {
      const rawName = (meta.data.name || "dokumen").replace(/["\r\n]/g, "");
      const safeName = rawName || "dokumen";
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
          "Cache-Control": "no-store",
        },
      });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        // JANGAN public: URL proxy ini sama untuk semua santri (hanya
        // ?field=...), isinya milik santri yang login. Cache-Control public
        // membuat CDN menyimpan dokumen santri pertama yang membuka lalu
        // menyajikannya ke santri lain (insiden 23 Nov 2026: akte & pas
        // foto Ummu Fathiyah muncul di akun Torib dkk).
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Santri proxy missing dokumen or error:", error instanceof Error ? error.message : error);
    return new NextResponse("Error loading dokumen", { status: 500 });
  }
}
