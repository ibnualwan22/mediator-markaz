import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { ensureSantriFolder, uploadFileToDrive } from "@/lib/googleDrive";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const santri = await prisma.santri.findUnique({
      where: { id: session.santriId },
      include: {
        gelombang: { include: { periode: true } }
      }
    });

    if (!santri) return NextResponse.json({ error: "Data santri tidak ditemukan." }, { status: 404 });

    const periodeNama = santri.gelombang.periode.nama.replace(/\//g, "-");
    const gelombangNama = santri.gelombang.nama.replace(/\//g, "-");
    const safeSantriName = santri.namaLengkap.replace(/\//g, "-");

    const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalExt = file.name.split('.').pop() || "jpg";
    const newFileName = `Pas Foto - ${safeSantriName}.${originalExt}`;

    const driveRes = await uploadFileToDrive(buffer, newFileName, file.type, santriFolderId);

    const url = driveRes.webViewLink;
    if (!url) throw new Error("Gagal mendapatkan link dari Google Drive");

    const updatedSantri = await prisma.santri.update({
      where: { id: session.santriId },
      data: { filePasFoto: url }
    });

    return NextResponse.json({
      success: true,
      fileUrl: driveRes.webViewLink,
      santri: updatedSantri
    });
  } catch (error: any) {
    console.error("Upload Foto Profil Error:", error);
    return NextResponse.json({ error: "Gagal mengupload foto." }, { status: 500 });
  }
}
