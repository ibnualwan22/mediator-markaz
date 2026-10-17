import { prisma } from "@/lib/prisma";
import { verifikasiCamaba } from "@/lib/verifikasiCamaba";
import { hitungTotalDibayar } from "@/lib/midtrans";
import {
  kirimPesanWa,
  kirimDokumenWa,
  formatPesanLunas,
  getAppBaseUrl,
} from "@/lib/waGateway";
import {
  generateBuktiLunasPdfBytes,
  labelMetodePembayaran,
} from "@/lib/buktiLunasPdf";

// Dipanggil saat pembayaran Midtrans dinyatakan SUKSES — baik dari webhook
// maupun dari sinkronisasi manual.
//
// Keamanan:
// - Atomic claim via updateMany({ where: { orderId, status: "PENDING" } }):
//   hanya satu worker yang berhasil flip ke SUCCESS (anti race condition
//   webhook + sinkron-status berjalan bersamaan).
//
// Pembayaran kumulatif:
// - Satu PembayaranSantri boleh punya beberapa transaksi SUCCESS.
// - Dinyatakan LUNAS bila total NETO (grossAmount - serviceFee) >= nominalHarus.
// - Notifikasi WA "lunas" + auto-verifikasi hanya dikirim saat status BERUBAH
//   menjadi lunas (tidak diulang untuk pembayaran berikutnya).
// - Kelebihan bayar (total > nominalHarus) dicatat sebagai warning untuk
//   ditindaklanjuti admin (refund).
export async function prosesPembayaranSukses(
  orderId: string,
  paymentType: string | null,
  rawNotification: any
): Promise<{
  ok: boolean;
  already?: boolean;
  ignored?: boolean;
  isLunas?: boolean;
  totalDibayar?: number;
}> {
  // A2: atomic claim — cegah double-processing.
  const claimed = await prisma.transaksiMidtrans.updateMany({
    where: { orderId, status: "PENDING" },
    data: {
      status: "SUCCESS",
      paymentType,
      rawNotification: rawNotification as any,
      paidAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    const existing = await prisma.transaksiMidtrans.findUnique({
      where: { orderId },
      select: { status: true },
    });
    if (!existing) return { ok: true, ignored: true };
    return { ok: true, already: true };
  }

  const transaksi = await prisma.transaksiMidtrans.findUnique({
    where: { orderId },
    include: { pembayaranSantri: true },
  });
  if (!transaksi) {
    return { ok: true, ignored: true };
  }

  // B4: hitung total kumulatif dari semua transaksi SUCCESS.
  const pembayaranId = transaksi.pembayaranSantriId;
  const nominalHarus = transaksi.pembayaranSantri.nominalHarus;
  const wasLunas = transaksi.pembayaranSantri.isLunas;
  const totalDibayar = await hitungTotalDibayar(prisma, pembayaranId);
  const isLunas = totalDibayar >= nominalHarus;
  const newlyLunas = isLunas && !wasLunas;

  await prisma.pembayaranSantri.update({
    where: { id: pembayaranId },
    data: {
      nominalDibayar: totalDibayar,
      isLunas,
      tanggalLunas: newlyLunas
        ? new Date()
        : (transaksi.pembayaranSantri.tanggalLunas ?? undefined),
    },
  });

  // Kelebihan bayar → warning untuk refund manual oleh admin.
  if (totalDibayar > nominalHarus) {
    console.warn(
      `Kelebihan bayar: order=${orderId} total=${totalDibayar} ` +
        `harus=${nominalHarus} lebih=${totalDibayar - nominalHarus} — perlu refund`
    );
  }

  const santriId = transaksi.pembayaranSantri.santriId;

  if (newlyLunas) {
    await handleBaruLunas(orderId, paymentType, rawNotification, santriId, transaksi);
  } else if (!isLunas) {
    await handleBayarSebagian(santriId, totalDibayar, nominalHarus);
  }
  // Jika isLunas tapi bukan newlyLunas: pembayaran tambahan setelah lunas
  // (kelebihan) — tidak kirim WA lagi, cukup warning di atas.

  return { ok: true, isLunas, totalDibayar };
}

function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

// Notifikasi untuk pembayaran sebagian (belum lunas).
async function handleBayarSebagian(
  santriId: string | null,
  totalDibayar: number,
  nominalHarus: number
): Promise<void> {
  if (!santriId) return;
  try {
    const santri = await prisma.santri.findUnique({
      where: { id: santriId },
      select: { namaLengkap: true, noWaSantri: true, noPendaftaran: true },
    });
    if (!santri?.noWaSantri) return;
    const sisa = nominalHarus - totalDibayar;
    const pesan =
      `Halo ${santri.namaLengkap},\n\n` +
      `Pembayaran Anda sebesar ${rupiah(totalDibayar)} sudah kami terima.\n` +
      `Sisa tagihan: ${rupiah(sisa)}.\n\n` +
      `Silakan lunasi sisa tagihan melalui halaman cek status pendaftaran.\n` +
      `No. Pendaftaran: ${santri.noPendaftaran}`;
    const hasil = await kirimPesanWa(santri.noWaSantri, pesan);
    if (!hasil.success) {
      console.warn("WA bayar-sebagian gagal:", santri.noPendaftaran, hasil.detail);
    }
  } catch (e) {
    console.error("WA bayar-sebagian error:", e);
  }
}

// Alur saat status BERUBAH menjadi lunas: auto-verifikasi + bukti lunas via WA.
async function handleBaruLunas(
  orderId: string,
  paymentType: string | null,
  rawNotification: any,
  santriId: string | null,
  transaksi: {
    grossAmount: number;
    serviceFee: number | null;
  }
): Promise<void> {
  // Auto-verifikasi: admin tidak perlu klik verifikasi manual lagi.
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
}
