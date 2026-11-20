"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

// Tombol salin teks laporan ke clipboard, dengan umpan balik "Disalin ✓"
// selama 2 detik. Dipakai bersama oleh spreadsheet pemberkasan dan
// spreadsheet progres camaba. Fallback textarea dipakai bila Clipboard API
// tidak tersedia.
export default function SalinLaporanButton({ text, label, disabled, className, title }: {
  text: string;
  label: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (e?: React.MouseEvent) => {
    // Jangan sampai klik tombol salin ikut membuka modal kartu di belakangnya.
    e?.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API tidak tersedia");
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      title={title}
      className={className}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Disalin ✓" : label}
    </button>
  );
}
