import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDriveClient } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

// Melayani isi file bukti pembayaran (booking Tahap 1) untuk pratinjau
// inline di halaman admin. URL Drive mentah tidak bisa langsung jadi
// <img src> karena webViewLink adalah halaman HTML, dan file upload tidak
// di-share publik — jadi byte file diambil lewat Drive API (service account)
// seperti proxy foto admin. MIME asli dikembalikan supaya PDF juga bisa
// ditampilkan (iframe), bukan hanya gambar.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await params;
    const santri = await prisma.santri.findUnique({
      where: { id: resolvedParams.id },
      select: { fileBuktiPembayaran: true },
    });

    const buktiUrl = santri?.fileBuktiPembayaran;
    if (!buktiUrl) {
      return new NextResponse("No bukti", { status: 404 });
    }

    let fileId: string | null = null;
    const match = buktiUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    } else {
      const match2 = buktiUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match2) fileId = match2[1];
    }

    if (!fileId) {
      // URL bukan Drive hanya boleh di-redirect bila host-nya diizinkan.
      // Tanpa allowlist ini, URL sembarang dari isian form akan me-redirect
      // admin yang membuka bukti ke situs phishing (open redirect).
      const REDIRECT_HOSTS = new Set([
        "drive.google.com",
        "drive.usercontent.google.com",
        "res.cloudinary.com",
      ]);
      try {
        const target = new URL(buktiUrl);
        if (target.protocol === "https:" && REDIRECT_HOSTS.has(target.hostname)) {
          return NextResponse.redirect(target.toString());
        }
      } catch {
        /* URL tidak valid -> 404 di bawah */
      }
      return new NextResponse("No bukti", { status: 404 });
    }

    const drive = getDriveClient();
    const meta = await drive.files.get({ fileId, fields: "mimeType" });
    const mimeType = meta.data.mimeType || "application/octet-stream";

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    console.error("Admin proxy missing bukti or error:", error instanceof Error ? error.message : error);
    return new NextResponse("Error loading bukti", { status: 500 });
  }
}
