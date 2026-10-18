# Plan: Pembayaran Multi-Tahap + Cicilan via Midtrans

**Status:** Rencana (belum ada gas) — dibuat 2026-10-18
**Konteks:** Saat ini integrasi Midtrans hanya untuk Tahap 1 (Biaya Pendaftaran).
Fondasi pembayaran kumulatif sudah ada (commit e2a9091).

---

## 1. Tujuan

- Semua tahap pembayaran di Mediator bisa dibayar via Midtrans (tidak hanya Tahap 1).
- Mendukung mode cicilan: user bayar bertahap dengan nominal per cicilan yang
  ditentukan sendiri (Mode B), mengacu pada nominal tiap tahap di database.

## 2. Fondasi yang Sudah Ada

- `hitungTotalDibayar()` — total neto kumulatif per `PembayaranSantri`.
- `prosesPembayaranSukses()` — atomic claim + logika LUNAS bila total >= nominalHarus.
- `/api/pendaftaran/bayar` — hitung sisa otomatis, fee exact per metode.
- `InfoFee` — tabel estimasi fee per metode di UI.

## 3. Perubahan yang Diperlukan

### 3.1 Generalisasi resolver tagihan
- `resolveBiayaPendaftaran()` saat ini hardcoded ke Tahap 1
  (`tahapPaket.urutan === 1`, `poinTahap[0]`).
- Ubah menjadi `resolveTagihan(santriId, poinTahapId)` — terima ID poin tahap
  yang mau dibayar sebagai parameter.

### 3.2 Parameter nominal cicilan (Mode B)
- `POST /api/pendaftaran/bayar` terima `poinTahapId` + opsional `nominal`.
- Validasi: `0 < nominal <= sisa` (sisa = nominalHarus - totalDibayar).
- Patokan nominal tetap dari database per tahap/poin (tidak bisa diubah user
  melebihi sisa).

### 3.3 Konfigurasi cicilan per poin tahap
Kolom baru di `PoinTahap` (atau tabel konfigurasi):
- `bolehCicil: boolean` — apakah poin ini mendukung cicilan.
- `minCicilan: int` — nominal minimal per cicilan (mis. Rp100.000).
- `maksCicilan: int?` — batas jumlah cicilan (opsional).
- `tenggatCicilanHari: int?` — tenggat pelunasan sejak cicilan pertama (opsional).

### 3.4 UI
- Halaman daftar tagihan per tahap (bukan hanya Tahap 1), masing-masing dengan
  tombol bayar + tampilan `InfoFee`.
- Untuk poin yang `bolehCicil`: input nominal cicilan + tombol "Bayar Cicilan".
- Tampilkan riwayat cicilan: "Cicilan ke-X, sudah Rp___, sisa Rp___".

### 3.5 Regulasi (relevan di konteks cicilan)
- Kelebihan bayar: jadi kredit tahap berikutnya atau refund 1-3 hari kerja.
- Kekurangan: tidak ada — sistem hanya izinkan nominal <= sisa.
- Fee dibebankan per transaksi (bayar 3x = fee 3x) — wajib diinformasikan di UI.

## 4. Urutan Pengerjaan (usulan)

1. Generalisasi `resolveTagihan` + parameter `poinTahapId` di `/bayar`.
2. Tambah parameter `nominal` + validasi untuk Mode B.
3. Migrasi kolom konfigurasi cicilan di `PoinTahap`.
4. UI daftar tagihan multi-tahap.
5. UI input cicilan + riwayat.
6. Testing sandbox per skenario.

## 5. Catatan Keamanan

- Validasi `nominal <= sisa` harus di server (jangan percaya input client).
- Fee tetap dihitung server-side via `hitungFee()`.
- Verifikasi `gross_amount` webhook tetap berlaku per transaksi.
- Rate limit tetap berlaku.
