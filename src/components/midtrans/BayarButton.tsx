"use client";

import { useState } from "react";

declare global {
  interface Window {
    snap: any;
  }
}

function loadSnapJs(snapJsUrl: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.snap) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = snapJsUrl;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Snap.js Midtrans."));
    document.body.appendChild(script);
  });
}

// Daftar metode bayar — fee harus sama dengan hitungFee() di src/lib/midtrans.ts.
const METODE = [
  { id: "qris", label: "QRIS", desc: "Scan QR dari e-wallet / m-banking" },
  { id: "gopay", label: "GoPay", desc: "Saldo GoPay" },
  { id: "bank_transfer", label: "Virtual Account", desc: "BCA, BRI, BNI, Mandiri" },
] as const;

function hitungFee(metodeId: string, nominal: number): number {
  switch (metodeId) {
    case "qris":
      return Math.ceil(nominal * 0.007);
    case "gopay":
      return Math.ceil(nominal * 0.02);
    case "bank_transfer":
      return 4000;
    default:
      return 5000;
  }
}

function rp(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

interface BayarButtonProps {
  noPendaftaran: string;
  // Sisa tagihan yang harus dibayar (untuk pembayaran bertahap).
  // Default: diambil dari nominal penuh (diambil dari server saat bayar).
  sisa?: number;
  sudahDibayar?: number;
  label?: string;
  className?: string;
  onStatusChange?: () => void;
}

export default function BayarButton({
  noPendaftaran,
  sisa,
  sudahDibayar = 0,
  label = "Bayar Sekarang",
  className = "",
  onStatusChange,
}: BayarButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metode, setMetode] = useState<string>("qris");

  // Estimasi fee per metode (angka pasti dikonfirmasi server saat bayar).
  const estimasiSisa = sisa ?? 0;

  const handleBayar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pendaftaran/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPendaftaran, metode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat transaksi.");
      }
      if (data.alreadyPaid) {
        onStatusChange?.();
        return;
      }

      await loadSnapJs(data.snapJsUrl, data.clientKey);

      window.snap.pay(data.snapToken, {
        onSuccess: () => {
          onStatusChange?.();
        },
        onPending: () => {
          onStatusChange?.();
        },
        onError: () => {
          setError("Pembayaran gagal. Silakan coba lagi.");
          onStatusChange?.();
        },
        onClose: () => {
          // Pengguna menutup popup tanpa menyelesaikan pembayaran.
          onStatusChange?.();
        },
      });
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {sudahDibayar > 0 && (
        <p className="text-sm text-text-secondary mb-3">
          Sudah dibayar {rp(sudahDibayar)}. Sisa yang harus dibayar:{" "}
          <span className="font-bold text-text-primary">{rp(estimasiSisa)}</span>
        </p>
      )}

      <p className="text-sm font-medium text-text-primary mb-2">
        Pilih metode pembayaran:
      </p>
      <div className="space-y-2 mb-4">
        {METODE.map((m) => {
          const fee = hitungFee(m.id, estimasiSisa);
          const total = estimasiSisa + fee;
          const aktif = metode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetode(m.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                aktif
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      aktif ? "border-primary" : "border-gray-300"
                    }`}
                  >
                    {aktif && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">{m.label}</p>
                    <p className="text-xs text-text-secondary">{m.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">
                    Fee {rp(fee)}
                  </p>
                  <p className="font-bold text-text-primary">{rp(total)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleBayar}
        disabled={loading}
        className={`px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? "Menyiapkan pembayaran..." : label}
      </button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <p className="text-xs text-text-secondary mt-2">
        Biaya layanan sesuai metode yang dipilih ditambahkan pada total.
        {sudahDibayar > 0 &&
          " Setiap pembayaran tambahan dikenakan biaya layanan tersendiri."}
      </p>
    </div>
  );
}
