// Pembentuk teks laporan "belum mengumpulkan / belum selesai" yang disalin
// admin ke clipboard (mis. untuk dikirim lewat WhatsApp). Dipakai bersama
// oleh spreadsheet pemberkasan dan spreadsheet progres camaba.

// Laporan per item: judul + daftar nama bernomor.
// Contoh:
//   Belum mengumpulkan: Scan Akte Kelahiran (3 santri)
//   1. Ahmad Fulan
//   2. Siti Aminah
export function formatLaporanPerItem(header: string, names: string[]): string {
  const lines = [header];
  names.forEach((nama, i) => lines.push(`${i + 1}. ${nama}`));
  return lines.join("\n");
}

// Laporan global: nama santri dulu, lalu item-item yang belum di bawahnya.
// Contoh:
//   Laporan Dokumen Belum Terkumpul — Gelombang 1, 2026/2027
//   1. Ahmad Fulan
//      - Scan Akte Kelahiran
//      - Scan Paspor
export function formatLaporanGlobal(
  header: string,
  entries: { nama: string; items: string[] }[]
): string {
  const lines = [header];
  entries.forEach((entry, i) => {
    lines.push(`${i + 1}. ${entry.nama}`);
    entry.items.forEach((item) => lines.push(`   - ${item}`));
  });
  return lines.join("\n");
}

// Label konteks laporan dari filter yang aktif di spreadsheet
// ("Gelombang 1, 2026/2027" atau "Semua Gelombang, 2026/2027").
export function labelKonteksLaporan(
  gelombangs: any[],
  periodes: any[],
  selectedGelombangId: string,
  selectedPeriodeId: string
): string {
  const gelombangLabel =
    selectedGelombangId === "all"
      ? "Semua Gelombang"
      : (gelombangs.find((g: any) => g.id === selectedGelombangId)?.nama ??
        "Semua Gelombang");
  const periodeLabel =
    periodes.find((p: any) => p.id === selectedPeriodeId)?.nama ?? "";
  return [gelombangLabel, periodeLabel].filter(Boolean).join(", ");
}
