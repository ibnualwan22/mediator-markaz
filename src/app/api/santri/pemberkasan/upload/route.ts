import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { ensureSantriFolder, uploadFileToDrive } from "@/lib/googleDrive";

export const maxDuration = 60; // Set longer timeout if supported by hosting, Drive API can take time.

export async function POST(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const itemPemberkasanId = formData.get("itemPemberkasanId") as string;

    if (!file || !itemPemberkasanId) {
      return NextResponse.json({ error: "File dan dokumen pendaftaran tidak lengkap." }, { status: 400 });
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

    const item = await prisma.itemPemberkasan.findUnique({
      where: { id: itemPemberkasanId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item pemberkasan tidak ditemukan." }, { status: 404 });
    }

    const periodeNama = santri.gelombang.periode.nama.replace(/\//g, "-");
    const gelombangNama = santri.gelombang.nama.replace(/\//g, "-");
    const safeSantriName = santri.namaLengkap.replace(/\//g, "-");

    // 2. Ensure Google Drive Folder 
    const santriFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName);

    // 3. Convert File to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload File
    const originalExt = file.name.split('.').pop() || "pdf";
    const newFileName = `${item.nama} - ${safeSantriName}.${originalExt}`;

    const driveRes = await uploadFileToDrive(buffer, newFileName, file.type, santriFolderId);

    // 5. Update Database Record
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
    return NextResponse.json({ error: "Gagal mengupload berkas: " + error.message }, { status: 500 });
  }
}
