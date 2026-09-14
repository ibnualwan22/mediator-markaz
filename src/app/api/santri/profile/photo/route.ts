import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";
import { ensureSantriFolder, uploadFileToDrive, getDriveClient } from "@/lib/googleDrive";

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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar (JPG/PNG), bukan PDF/Dokumen." }, { status: 400 });
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

    if (!driveRes.id) throw new Error("Gagal mendapatkan link dari Google Drive");
    
    // Make file public so it can be loaded in an <img> tag and get direct URL
    const drive = getDriveClient();
    await drive.permissions.create({
      fileId: driveRes.id as string,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    const url = `https://drive.google.com/uc?export=view&id=${driveRes.id}`;

    const updatedSantri = await prisma.santri.update({
      where: { id: session.santriId },
      data: { 
        fotoProfil: url,
        filePasFoto: url // Sinkronisasi dengan pas foto di form
      }
    });

    // Cari item pemberkasan untuk "Pas Photo" atau "Pas Foto" di periode ini
    const itemPemberkasan = await prisma.itemPemberkasan.findFirst({
      where: {
        periodeId: santri.gelombang.periodeId,
        OR: [
          { nama: { contains: 'Pas Photo', mode: 'insensitive' } },
          { nama: { contains: 'Pas Foto', mode: 'insensitive' } },
          { nama: { contains: 'Foto', mode: 'insensitive' } }
        ]
      }
    });

    if (itemPemberkasan) {
      await prisma.pemberkasanSantri.upsert({
        where: {
          santriId_itemPemberkasanId: {
            santriId: session.santriId,
            itemPemberkasanId: itemPemberkasan.id
          }
        },
        create: {
          santriId: session.santriId,
          itemPemberkasanId: itemPemberkasan.id,
          sudahDikumpulkan: true,
          fileUrl: url
        },
        update: {
          sudahDikumpulkan: true,
          fileUrl: url
        }
      });
    }

    return NextResponse.json({
      success: true,
      fileUrl: url,
      santri: updatedSantri
    });
  } catch (error: any) {
    console.error("Upload Foto Profil Error:", error);
    return NextResponse.json({ error: "Gagal mengupload foto." }, { status: 500 });
  }
}
