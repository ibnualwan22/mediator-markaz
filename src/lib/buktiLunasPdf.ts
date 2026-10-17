import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import {
  formatRupiah,
  formatTanggal,
  terbilang,
  WARNA,
  PAGE,
  contentW,
  gambarKop,
  gambarFooter,
} from "./pdfAset";

// ─── Tipe data ────────────────────────────────────────────────────────────
export interface BuktiLunasData {
  noPendaftaran: string;
  nis?: string | null;
  namaLengkap: string;
  orderId: string;
  metodeLabel: string;
  waktuBayar: Date | string;
  biayaPendaftaran: number;
  biayaLayanan: number;
  cekStatusUrl: string;
}

// Label metode pembayaran Midtrans ke bahasa yang dimengerti user.
export function labelMetodePembayaran(
  paymentType?: string | null,
  raw?: any
): string {
  switch ((paymentType || "").toLowerCase()) {
    case "bank_transfer": {
      const bank = raw?.va_numbers?.[0]?.bank;
      return bank ? `Virtual Account — ${String(bank).toUpperCase()}` : "Virtual Account Bank";
    }
    case "echannel":
      return "Mandiri Bill Payment";
    case "qris":
      return "QRIS";
    case "gopay":
      return "GoPay";
    case "shopeepay":
      return "ShopeePay";
    case "credit_card":
      return "Kartu Kredit";
    case "cstore":
      return `Gerai Retail${raw?.store ? ` — ${raw.store}` : ""}`;
    default:
      return paymentType || "Payment Gateway";
  }
}

// ─── Pembangun dokumen (isomorphic: jalan di browser & server/Node) ───────
const buildBuktiLunasDoc = async (data: BuktiLunasData): Promise<jsPDF> => {
  const qrDataUrl = await QRCode.toDataURL(data.cekStatusUrl, {
    width: 132, // 22mm @ ~150dpi — cukup tajam untuk pindai, hemat ukuran PDF
    margin: 1,
  }).catch(() => null);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { w: pageW, marginL, marginR } = PAGE;
  const { gold, dark, brown } = WARNA;

  const total = data.biayaPendaftaran + data.biayaLayanan;
  const terbilangText = terbilang(total).trim().replace(/\s+/g, " ") + " Rupiah";
  const waktuBayar =
    data.waktuBayar instanceof Date ? data.waktuBayar : new Date(data.waktuBayar);

  // ── Kop ──
  gambarKop(doc);

  // ── Judul ──
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...gold);
  doc.text("BUKTI PEMBAYARAN LUNAS", pageW / 2, y, { align: "center" });
  y += 7;

  // ── Cap LUNAS ──
  doc.setDrawColor(0, 150, 80);
  doc.setLineWidth(0.8);
  doc.setFillColor(230, 250, 240);
  doc.rect(pageW / 2 - 30, y - 6, 60, 12, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 150, 80);
  doc.text("LUNAS", pageW / 2, y + 2.5, { align: "center" });
  y += 14;

  // ── Nomor pendaftaran & NIS ──
  doc.setFillColor(253, 250, 240);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.rect(marginL, y - 6, contentW, data.nis ? 26 : 18, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brown);
  doc.text("Nomor Pendaftaran", pageW / 2, y, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.setFont("courier", "bold");
  doc.text(data.noPendaftaran, pageW / 2, y + 7, { align: "center" });
  if (data.nis) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("NIS", pageW / 2, y + 13, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.setFont("courier", "bold");
    doc.text(data.nis, pageW / 2, y + 19, { align: "center" });
  }
  doc.setFont("helvetica", "normal");
  y += data.nis ? 32 : 24;

  // ── Data camaba & transaksi ──
  const rows: [string, string][] = [
    ["Nama Camaba", data.namaLengkap],
    ["No. Order", data.orderId],
    ["Metode Pembayaran", data.metodeLabel],
    ["Waktu Pembayaran", formatTanggal(waktuBayar)],
  ];
  doc.setFillColor(253, 250, 240);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.rect(marginL - 2, y - 5, contentW + 4, rows.length * 6 + 6, "FD");
  doc.setFontSize(9);
  for (const [label, val] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brown);
    doc.text(label, marginL, y);
    doc.setTextColor(...dark);
    doc.text(":", marginL + 38, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(val, contentW - 45);
    doc.text(wrapped, marginL + 41, y);
    y += 5.5 * (wrapped.length > 1 ? wrapped.length * 0.85 : 1);
  }
  y += 4;

  // ── Rincian ──
  autoTable(doc, {
    startY: y,
    theme: "grid",
    tableWidth: contentW,
    margin: { left: marginL, right: marginR },
    headStyles: {
      fillColor: gold,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: { fontSize: 9, textColor: dark },
    alternateRowStyles: { fillColor: [252, 248, 238] },
    columnStyles: {
      0: { cellWidth: contentW * 0.65 },
      1: { cellWidth: contentW * 0.35, halign: "right" },
    },
    head: [["Rincian Pembayaran", "Nominal"]],
    body: [
      ["Biaya Pendaftaran (Tahap 1)", formatRupiah(data.biayaPendaftaran)],
      ["Biaya Layanan Pembayaran", formatRupiah(data.biayaLayanan)],
    ],
    foot: [
      [
        {
          content: "TOTAL DIBAYAR",
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [230, 250, 240] as [number, number, number],
          },
        },
        {
          content: formatRupiah(total),
          styles: {
            fontStyle: "bold",
            halign: "right",
            textColor: [0, 150, 80],
            fillColor: [230, 250, 240] as [number, number, number],
          },
        },
      ],
    ],
    footStyles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...brown);
  doc.text(`Terbilang: ${terbilangText}`, marginL, y);
  doc.setTextColor(...dark);
  y += 8;

  // ── Catatan ──
  doc.setDrawColor(...gold);
  doc.setFillColor(253, 250, 240);
  doc.setLineWidth(0.4);
  const note =
    "Terima kasih. Pembayaran Biaya Pendaftaran (Tahap 1) telah diterima dan terverifikasi otomatis. Simpan bukti ini sebagai arsip pembayaran yang sah.";
  const noteLines = doc.splitTextToSize(note, contentW - 6);
  const noteH = noteLines.length * 5 + 6;
  doc.rect(marginL, y, contentW, noteH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text(noteLines, marginL + 3, y + 4.5);

  // ── Footer ──
  gambarFooter(doc, qrDataUrl);

  return doc;
};

// ─── Generator utama (client: unduh via browser) ──────────────────────────
export const generateBuktiLunasPdf = async (
  data: BuktiLunasData
): Promise<void> => {
  const doc = await buildBuktiLunasDoc(data);
  doc.save(`Bukti-Lunas-${data.noPendaftaran}.pdf`);
};

// ─── Versi bytes (server: untuk dikirim sebagai dokumen WA) ────────────────
// Isomorphic — tidak memakai API browser apa pun.
export const generateBuktiLunasPdfBytes = async (
  data: BuktiLunasData
): Promise<Uint8Array> => {
  const doc = await buildBuktiLunasDoc(data);
  return new Uint8Array(doc.output("arraybuffer"));
};
