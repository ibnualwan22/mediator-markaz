"use client";

// Tabel estimasi biaya layanan per metode pembayaran.
// Fee harus sama dengan hitungFee() di src/lib/midtrans.ts.

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

const DAFTAR = [
  { id: "qris", label: "QRIS", ket: "0,7%" },
  { id: "gopay", label: "GoPay", ket: "2%" },
  { id: "bank_transfer", label: "Virtual Account Bank", ket: "Rp4.000 flat" },
];

export default function InfoFee({ nominal }: { nominal: number }) {
  if (nominal <= 0) return null;
  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
      <p className="text-text-secondary mb-2">
        Nominal di atas <span className="font-semibold">belum termasuk</span>{" "}
        biaya layanan pembayaran. Estimasi total per metode:
      </p>
      <div className="space-y-1">
        {DAFTAR.map((m) => {
          const fee = hitungFee(m.id, nominal);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between text-text-primary"
            >
              <span>
                {m.label} <span className="text-text-secondary">({m.ket})</span>
              </span>
              <span className="font-semibold">{rp(nominal + fee)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
