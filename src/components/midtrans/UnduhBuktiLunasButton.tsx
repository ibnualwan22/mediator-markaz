"use client";

import { useState } from "react";
import { ReceiptText, Loader2 } from "lucide-react";
import {
  generateBuktiLunasPdf,
  labelMetodePembayaran,
} from "@/lib/buktiLunasPdf";

export interface LunasButtonInfo {
  noPendaftaran: string;
  nis?: string | null;
  namaLengkap: string;
  biayaPendaftaran: number;
  biayaLayanan: number;
  transaksi: {
    orderId: string;
    paymentType: string | null;
    paidAt: string | null;
    raw: any;
  };
}

// Tombol "Unduh Bukti Lunas (PDF)" — tampil saat tagihan sudah LUNAS.
export default function UnduhBuktiLunasButton({
  info,
  className = "",
}: {
  info: LunasButtonInfo | null;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const unduh = async () => {
    if (busy || !info) return;
    setBusy(true);
    try {
      await generateBuktiLunasPdf({
        noPendaftaran: info.noPendaftaran,
        nis: info.nis,
        namaLengkap: info.namaLengkap,
        orderId: info.transaksi.orderId,
        metodeLabel: labelMetodePembayaran(
          info.transaksi.paymentType,
          info.transaksi.raw
        ),
        waktuBayar: info.transaksi.paidAt
          ? new Date(info.transaksi.paidAt)
          : new Date(),
        biayaPendaftaran: info.biayaPendaftaran,
        biayaLayanan: info.biayaLayanan,
        cekStatusUrl: `${window.location.origin}/cek-status`,
      });
    } catch (e) {
      console.error("Gagal membuat PDF:", e);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (!info) return null;

  return (
    <button
      onClick={unduh}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-success text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60 shadow-md ${className}`}
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <ReceiptText size={18} />
      )}
      {busy ? "Membuat PDF..." : "Unduh Bukti Lunas (PDF)"}
    </button>
  );
}
