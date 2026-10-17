"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  generateBuktiPendaftaranPdf,
  BuktiPendaftaranData,
} from "@/lib/buktiPendaftaranPdf";

export type BuktiDataInput = Omit<BuktiPendaftaranData, "cekStatusUrl">;

// Tombol unduh Bukti Pendaftaran (PDF). Jika `auto`, PDF otomatis
// diunduh sekali saat komponen tampil (dipakai di halaman sukses).
export default function UnduhBuktiButton({
  data,
  auto = false,
  className = "",
}: {
  data: BuktiDataInput | null;
  auto?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const autoDone = useRef(false);

  const unduh = async (input: BuktiDataInput) => {
    setBusy(true);
    try {
      await generateBuktiPendaftaranPdf({
        ...input,
        cekStatusUrl: `${window.location.origin}/cek-status`,
      });
    } catch (e) {
      console.error("Gagal membuat PDF:", e);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (auto && data && !autoDone.current) {
      autoDone.current = true;
      // Beri jeda agar halaman selesai render dulu.
      const t = setTimeout(() => unduh(data), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, data]);

  return (
    <button
      onClick={() => data && unduh(data)}
      disabled={busy || !data}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-primary-light/50 text-text-primary font-medium hover:bg-bg-cream transition-colors disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      {busy ? "Membuat PDF..." : "Unduh Bukti Pendaftaran (PDF)"}
    </button>
  );
}
