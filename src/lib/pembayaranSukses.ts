import { prisma } from "@/lib/prisma";
import { verifikasiCamaba } from "@/lib/verifikasiCamaba";

// Dipanggil saat pembayaran Midtrans dinyatakan SUKSES — baik dari webhook
// maupun dari sinkronisasi manual. Idempoten: order yang sudah SUCCESS
// dilewati. Setelah menandai LUNAS, camaba otomatis diverifikasi
// (generate NIS + aktif) sehingga admin tidak perlu verifikasi manual.
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
  if (santriId) {
    try {
      await verifikasiCamaba(santriId);
    } catch (e) {
      console.error("Auto-verifikasi gagal untuk", orderId, e);
    }
  }

  return { ok: true };
}
