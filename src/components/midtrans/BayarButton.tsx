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

interface BayarButtonProps {
  noPendaftaran: string;
  label?: string;
  className?: string;
  onStatusChange?: () => void;
}

export default function BayarButton({
  noPendaftaran,
  label = "Bayar Sekarang",
  className = "",
  onStatusChange,
}: BayarButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBayar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pendaftaran/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPendaftaran }),
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
      <button
        onClick={handleBayar}
        disabled={loading}
        className={`px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? "Menyiapkan pembayaran..." : label}
      </button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
