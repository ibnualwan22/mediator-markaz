import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, mapTransactionStatus } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

// POST /api/webhooks/midtrans
// Menerima HTTP(S) notification dari Midtrans. URL ini didaftarkan di
// dashboard Midtrans → Settings → Configuration → Payment Notification URL.
// Handler bersifat idempoten: notifikasi ganda untuk order yang sama aman.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.order_id) {
      return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
    }

    const { order_id, status_code, gross_amount, signature_key } = body;

    if (
      !verifyWebhookSignature({
        order_id: String(order_id),
        status_code: String(status_code),
        gross_amount: String(gross_amount),
        signature_key: String(signature_key || ""),
      })
    ) {
      console.error("Midtrans webhook: signature tidak valid", order_id);
      return NextResponse.json({ error: "Signature tidak valid." }, { status: 401 });
    }

    const transaksi = await prisma.transaksiMidtrans.findUnique({
      where: { orderId: String(order_id) },
      include: { pembayaranSantri: true },
    });
    if (!transaksi) {
      // Bukan order dari sistem ini; tetap 200 agar Midtrans tidak retry sia-sia.
      console.warn("Midtrans webhook: order tidak dikenal", order_id);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const outcome = mapTransactionStatus(
      String(body.transaction_status || ""),
      body.fraud_status ? String(body.fraud_status) : undefined
    );

    // Idempotency: order yang sudah SUCCESS tidak diproses ulang.
    if (transaksi.status === "SUCCESS") {
      return NextResponse.json({ ok: true, already: true });
    }

    if (outcome === "SUCCESS") {
      await prisma.$transaction([
        prisma.transaksiMidtrans.update({
          where: { id: transaksi.id },
          data: {
            status: "SUCCESS",
            paymentType: body.payment_type ? String(body.payment_type) : null,
            rawNotification: body as any,
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
    } else {
      await prisma.transaksiMidtrans.update({
        where: { id: transaksi.id },
        data: {
          status: outcome,
          paymentType: body.payment_type ? String(body.payment_type) : null,
          rawNotification: body as any,
        },
      });
    }

    return NextResponse.json({ ok: true, outcome });
  } catch (error: any) {
    console.error("Midtrans webhook error:", error);
    // Kembalikan 500 agar Midtrans me-retry notifikasi.
    return NextResponse.json(
      { error: "Gagal memproses notifikasi." },
      { status: 500 }
    );
  }
}
