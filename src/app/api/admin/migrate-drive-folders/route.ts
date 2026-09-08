import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSantriFolder, moveFileToFolder } from "@/lib/googleDrive";

export const maxDuration = 300; // 5 minutes — migration can take a while

/**
 * One-time migration endpoint: moves misplaced files to the correct
 * gelombang folder in Google Drive.
 * 
 * GET /api/admin/migrate-drive-folders
 */
export async function GET() {
  // Fire and forget (Background Process)
  // Ini mencegah Cloudflare Timeout Error 524 (karena nunggu lebih dari 100 detik)
  (async () => {
    try {
      console.log("=== MEMUAI MIGRASI GOOGLE DRIVE (BACKGROUND) ===");
      // 1. Get all santri with their gelombang, periode, and uploaded files
      const santriList = await prisma.santri.findMany({
        where: {
          isVerified: true,
          gelombangId: { not: undefined },
        },
        include: {
          gelombang: { include: { periode: true } },
          pemberkasan: {
            where: { fileUrl: { not: null } },
            include: { itemPemberkasan: true },
          },
          progresSantri: {
            where: { fileUrl: { not: null } },
            include: { tahapProgres: true },
          },
        },
      });

      const results = {
        moved: 0,
        skipped: 0,
        errors: [] as string[],
        details: [] as string[],
      };

      const fileIdRegex = /\/d\/([a-zA-Z0-9_-]+)\//;

      for (const santri of santriList) {
        if (!santri.gelombang || !santri.gelombang.periode) {
          results.skipped++;
          continue;
        }

        const periodeNama = santri.gelombang.periode.nama.replace(/\//g, "-");
        const gelombangNama = santri.gelombang.nama.replace(/\//g, "-");
        const safeSantriName = santri.namaLengkap.replace(/\//g, "-");

        // Gather all files for this santri
        const files: { url: string; label: string }[] = [];

        for (const p of santri.pemberkasan) {
          if (p.fileUrl) files.push({ url: p.fileUrl, label: `Pemberkasan: ${p.itemPemberkasan?.nama || 'unknown'}` });
        }
        for (const p of santri.progresSantri) {
          if (p.fileUrl) files.push({ url: p.fileUrl, label: `Progres: ${p.tahapProgres?.nama || 'unknown'}` });
        }

        if (files.length === 0) {
          results.skipped++;
          continue;
        }

        // Ensure the correct folder exists for this santri
        let correctFolderId: string;
        try {
          correctFolderId = await ensureSantriFolder(periodeNama, gelombangNama, safeSantriName) as string;
        } catch (err: any) {
          results.errors.push(`[${santri.namaLengkap}] Gagal buat folder: ${err.message}`);
          console.error(`Gagal folder ${santri.namaLengkap}`);
          continue;
        }

        // Move each file to the correct folder
        for (const file of files) {
          const match = file.url.match(fileIdRegex);
          if (!match) {
            results.details.push(`[${santri.namaLengkap}] Skip ${file.label}: URL format tidak dikenali`);
            results.skipped++;
            continue;
          }

          const fileId = match[1];
          try {
            await moveFileToFolder(fileId, correctFolderId);
            results.moved++;
            results.details.push(`[${santri.namaLengkap}] ✓ Moved ${file.label} → ${gelombangNama}`);
            console.log(`[SUCCESS] ${santri.namaLengkap} - ${file.label} dipindah ke ${gelombangNama}`);
          } catch (err: any) {
            results.errors.push(`[${santri.namaLengkap}] ✗ ${file.label}: ${err.message}`);
            console.error(`[ERROR] ${santri.namaLengkap} - ${file.label}: ${err.message}`);
          }
        }
      }

      console.log("=== SELESAI MIGRASI ===");
      console.log(`Summary: Moved ${results.moved}, Skipped ${results.skipped}, Errors ${results.errors.length}`);

    } catch (error: any) {
      console.error("Migration Fatal Error:", error);
    }
  })();

  return NextResponse.json({
    success: true,
    message: "Proses migrasi sedang berjalan di background (background task). Proses ini memakan waktu beberapa menit. Anda bisa menutup halaman ini, dan mengecek hasilnya langsung di Google Drive Anda nanti.",
  });
}
