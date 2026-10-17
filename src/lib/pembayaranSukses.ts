import { prisma } from "@/lib/prisma";
import { verifikasiCamaba } from "@/lib/verifikasiCamaba";
import {
  kirimDokumenWa,
  formatPesanLunas,
  getAppBaseUrl,
} from "@/lib/waGateway";
import {
  generateBuktiLunasPdfBytes,
  labelMetodePembayaran,
} from "@/lib/buktiLunasPdf";

// Dipanggil saat pembayaran Midtrans dinyatakan SUKSES — baik dari webhook
// maupun dari sinkronisasi manual. Idempoten: order yang sudah SUCCESS
// dilewati. Setelah menandai LUNAS:
//   1. camaba otomatis diverifikasi (generate NIS) — admin tidak perlu
//      verifikasi manual;
//   2. bukti lunas (PDF) di-generate di server lalu dikirim sebagai dokumen
//      WA otomatis (caption: NIS + link cek status + portal).
export async function prosesPembayaranSukses(
  orderId: string,
  paymentType: string | null,
  rawNotification: any
): Promise<{ ok: boolean; already?: boolean; ignored?: boolean }> {
  const transaksi = await prisma.transaksiMidtrans.findUnique({
    where: { orderId },
    include: { pembayaranSantri: true },
  });
  if (!transaksi) {
    return { ok: true, ignored: true };
  }
  if (transaksi.status === "SUCCESS") {
    return { ok: true, already: true };
  }

  await prisma.$transaction([
    prisma.transaksiMidtrans.update({
      where: { id: transaksi.id },
      data: {
        status: "SUCCESS",
        paymentType,
        rawNotification: rawNotification as any,
        paidAt: new Date(),
      },
    }),
    prisma.pembayaranSantri.update({
      where: { id: transaksi.pembayaranSantriId },
      data: {
        nominalDibayar: transaksi.pembayaranSantri.nominalHarus,
        isLunas: true,
        tanggalLunas: new Date(),
      },
    }),
  ]);

  // Auto-verifikasi: admin tidak perlu klik verifikasi manual lagi.
  const santriId = transaksi.pembayaranSantri.santriId;
  let nis: string | null = null;
  if (santriId) {
    try {
      const hasil = await verifikasiCamaba(santriId);
      nis = hasil.nis ?? null;
    } catch (e) {
      console.error("Auto-verifikasi gagal untuk", orderId, e);
    }
  }

  // Bukti lunas (PDF) + notifikasi WA otomatis (fire-and-forget: gagal
  // generate/kirim tidak menggagalkan pencatatan pembayaran).
  try {
    const santri = santriId
      ? await prisma.santri.findUnique({
          where: { id: santriId },
          select: {
            namaLengkap: true,
            noWaSantri: true,
            noPendaftaran: true,
            tanggalLahir: true,
            nis: true,
          },
        })
      : null;
    if (santri?.noWaSantri) {
      const tglLahir = santri.tanggalLahir
        ? new Date(santri.tanggalLahir).toISOString().slice(0, 10)
        : "";
      const metodeLabel = labelMetodePembayaran(paymentType, rawNotification);
      const pesan = formatPesanLunas({
        nama: santri.namaLengkap,
        noPendaftaran: santri.noPendaftaran,
        tanggalLahir: tglLahir,
        nis: nis ?? santri.nis,
        totalBayar: transaksi.grossAmount,
        metodeLabel,
      });
      // PDF di-generate di server (isomorphic, tanpa API browser).
      const base = getAppBaseUrl();
      const pdfBytes = await generateBuktiLunasPdfBytes({
        noPendaftaran: santri.noPendaftaran,
        nis: nis ?? santri.nis,
        namaLengkap: santri.namaLengkap,
        orderId,
        metodeLabel,
        waktuBayar: new Date(),
        biayaPendaftaran: transaksi.grossAmount - (transaksi.serviceFee ?? 0),
        biayaLayanan: transaksi.serviceFee ?? 0,
        cekStatusUrl: base
          ? `${base}/cek-status?no=${encodeURIComponent(santri.noPendaftaran)}&tgl=${encodeURIComponent(tglLahir)}`
          : "",
      });
      const hasilWa = await kirimDokumenWa(
        santri.noWaSantri,
        pesan,
        pdfBytes,
        `Bukti-Lunas-${santri.noPendaftaran}.pdf`
      );
      if (!hasilWa.success) {
        console.warn("WA dokumen lunas gagal:", orderId, hasilWa.detail);
      }
    }
  } catch (e) {
    console.error("WA dokumen lunas error:", orderId, e);
  }

  return { ok: true };
}
