"use client";

import { useEffect } from "react";

export const LS_KEY = "mediator:pendaftaran";

// Menyimpan nomor pendaftaran + tanggal lahir di localStorage agar halaman
// cek status bisa terbuka otomatis di perangkat yang sama.
export default function SimpanKodeLokal({
  noPendaftaran,
  tanggalLahir,
}: {
  noPendaftaran: string;
  tanggalLahir: string;
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ noPendaftaran, tanggalLahir })
      );
    } catch {
      // Abaikan bila localStorage tidak tersedia.
    }
  }, [noPendaftaran, tanggalLahir]);

  return null;
}

export function bacaKodeLokal(): {
  noPendaftaran: string;
  tanggalLahir: string;
} | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.noPendaftaran && parsed?.tanggalLahir) return parsed;
    return null;
  } catch {
    return null;
  }
}
