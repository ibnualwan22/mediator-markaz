import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { getDriveClient } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

/**
 * Proxy endpoint: serves the profile photo directly from Google Drive
 * so that <img src="/api/santri/profile/photo/image"> just works.
 */
export async function GET(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const santri = await prisma.santri.findUnique({
      where: { id: session.santriId },
      select: { fotoProfil: true }
    });

    const fotoUrl = santri?.fotoProfil;
    if (!fotoUrl) {
      return new NextResponse("No photo", { status: 404 });
    }

    // Extract file ID from the stored Google Drive URL
    let fileId: string | null = null;
    const match = fotoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    } else {
      // Try /d/FILE_ID/ format
      const match2 = fotoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match2) fileId = match2[1];
    }

    if (!fileId) {
      // If it's an external URL (not Drive), just redirect
      return NextResponse.redirect(fotoUrl);
    }

    const drive = getDriveClient();
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Profile photo proxy error:", error?.message);
    return new NextResponse("Error loading photo", { status: 500 });
  }
}
