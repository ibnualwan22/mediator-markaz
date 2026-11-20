import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDriveClient } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

// Melayani isi file dokumen tahap progres untuk pratinjau inline (thumbnail
// dan modal) di spreadsheet progres camaba. Pola sama dengan proxy dokumen
// pemberkasan: file diidentifikasi lewat id baris ProgresSantri (?record=),
// byte diambil lewat Drive API karena webViewLink adalah halaman HTML dan
// file tidak di-share publik. Tambahkan ?download=1 supaya file benar-benar
// terunduh (Content-Disposition: attachment) dengan nama file aslinya.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("record") || "";
    const download = searchParams.get("download") === "1";
    if (!recordId) {
      return new NextResponse("Record tidak ditemukan", { status: 400 });
    }

    const resolvedParams = await params;
    const record = await prisma.progresSantri.findUnique({
      where: { id: recordId },
      select: { santriId: true, fileUrl: true },
    });

    if (!record || record.santriId !== resolvedParams.id) {
      return new NextResponse("No dokumen", { status: 404 });
    }

    const docUrl = record.fileUrl;
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
      // admin yang membuka dokumen ke situs phishing (open redirect).
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
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    console.error("Admin proxy missing progres file or error:", error instanceof Error ? error.message : error);
    return new NextResponse("Error loading dokumen", { status: 500 });
  }
}
