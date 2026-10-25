"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface TagihanItem {
  tahap: number;
  tahapNama: string;
  poin: string;
  nominalHarus: number;
  nominalDibayar: number;
  sisa: number;
  isLunas: boolean;
  tanggalLunas: string | null;
}

interface StatusData {
  nama: string;
  noPendaftaran: string;
  nis: string | null;
  tanggalLahir: string | null;
  tempatLahir: string | null;
  gender: string;
  noWaSantri: string;
  email: string;
  tanggalDaftar: string;
  gelombang: string;
  periode: string;
  isVerified: boolean;
  isWithdrawn: boolean;
  withdrawnNote: string | null;
  tagihan: {
    items: TagihanItem[];
    totalHarus: number;
    totalDibayar: number;
    totalSisa: number;
    semuaLunas: boolean;
  } | null;
  legacy: {
    tahap: number;
    nominal: number;
    status: string;
    tanggalBayar: string | null;
  }[];
}

interface EmailHasil {
  noPendaftaran: string;
  namaLengkap: string;
}

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

const formatTanggal = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const labelLegacy = (s: string) =>
  s === "LUNAS"
    ? "LUNAS"
    : s === "MENUNGGU_VERIFIKASI"
      ? "MENUNGGU VERIFIKASI"
      : "BELUM BAYAR";

export default function CekStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-cream py-8 px-2 sm:py-10 sm:px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-text-secondary">Memuat...</p>
          </div>
        </div>
      }
    >
      <CekStatusInner />
    </Suspense>
  );
}

function CekStatusInner() {
  const searchParams = useSearchParams();
  const [no, setNo] = useState("");
  const [tgl, setTgl] = useState("");
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailHasil, setEmailHasil] = useState<EmailHasil[] | null>(null);
  const [emailCari, setEmailCari] = useState("");
  const autoTried = useRef(false);

  const fetchStatus = useCallback(async (noP: string, tglP: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/pendaftaran/status?no=${encodeURIComponent(noP)}&tgl=${encodeURIComponent(tglP)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat status.");
      setData(json);
      setEmailHasil(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByEmail = useCallback(async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/pendaftaran/status?email=${encodeURIComponent(email)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencari email.");
      const hasil: EmailHasil[] = json.hasil || [];
      setEmailHasil(hasil);
      if (hasil.length === 1) {
        setNo(hasil[0].noPendaftaran);
      }
      setData(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setEmailHasil(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Prefill dari URL: ?no=...&tgl=... langsung cek,
  // ?email=... (tombol dari halaman sukses) cari nomornya dulu.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const qNo = searchParams.get("no") || "";
    const qTgl = searchParams.get("tgl") || "";
    const qEmail = searchParams.get("email") || "";
    if (qNo && qTgl) {
      setNo(qNo);
      setTgl(qTgl);
      fetchStatus(qNo, qTgl);
    } else if (qEmail) {
      setEmailCari(qEmail);
      fetchByEmail(qEmail);
    }
  }, [searchParams, fetchStatus, fetchByEmail]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (no.trim() && tgl) fetchStatus(no.trim(), tgl);
  };

  return (
    <div className="min-h-screen bg-bg-cream py-8 px-2 sm:py-10 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary mb-5"
        >
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>

        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
          Cek Status Pendaftaran
        </h1>
        <p className="text-sm text-text-secondary mt-2 mb-6">
          Masukkan nomor pendaftaran dan tanggal lahir untuk melihat status
          pendaftaran, verifikasi, dan pembayaran Anda.
        </p>

        <form
          onSubmit={submit}
          className="bg-white rounded-3xl shadow-lg border border-primary-light/20 p-5 sm:p-6 mb-6"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Nomor Pendaftaran
              </label>
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder="MA-2026-0001"
                className="w-full border border-primary-light/50 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tgl}
                onChange={(e) => setTgl(e.target.value)}
                className="w-full border border-primary-light/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !no.trim() || !tgl}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            <Search size={18} /> {loading ? "Mencari..." : "Cek Status"}
          </button>
          {emailHasil && emailHasil.length > 1 && (
            <div className="mt-4 p-4 bg-bg-cream rounded-xl border border-primary-light/30">
              <p className="text-sm text-text-secondary mb-2">
                Email {emailCari} terdaftar untuk beberapa nomor. Pilih salah
                satu, lalu masukkan tanggal lahir:
              </p>
              <div className="flex flex-wrap gap-2">
                {emailHasil.map((h) => (
                  <button
                    key={h.noPendaftaran}
                    type="button"
                    onClick={() => setNo(h.noPendaftaran)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold border ${
                      no === h.noPendaftaran
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text-primary border-primary-light/50 hover:border-primary"
                    }`}
                  >
                    {h.noPendaftaran} — {h.namaLengkap}
                  </button>
                ))}
              </div>
            </div>
          )}
          {emailHasil && emailHasil.length === 1 && !data && (
            <p className="mt-4 text-sm text-text-secondary">
              Nomor ditemukan untuk{" "}
              <span className="font-semibold text-text-primary">
                {emailHasil[0].namaLengkap}
              </span>
              . Masukkan tanggal lahir lalu tekan Cek Status.
            </p>
          )}
        </form>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-2xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {data.isWithdrawn && (
              <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 text-sm text-danger flex gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Pendaftaran ini berstatus mengundurkan diri.
                  </p>
                  {data.withdrawnNote && <p>{data.withdrawnNote}</p>}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-lg border border-primary-light/20 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-heading font-bold text-text-primary">
                    {data.nama}
                  </h2>
                  <p className="text-sm font-mono text-text-secondary mt-1">
                    {data.noPendaftaran}
                  </p>
                </div>
                {data.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
                    <CheckCircle2 size={14} /> TERVERIFIKASI
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full">
                    <Clock size={14} /> MENUNGGU VERIFIKASI
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">NIS</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {data.nis || "Belum terbit (terbit setelah verifikasi)"}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">Gelombang</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {data.gelombang} — {data.periode}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">Tanggal Daftar</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {formatTanggal(data.tanggalDaftar)}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">Tempat, Tanggal Lahir</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {data.tempatLahir || "-"}, {formatTanggal(data.tanggalLahir)}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">Jenis Kelamin</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {data.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-text-secondary">No. WA</span>
                  <span className="font-semibold block sm:mt-0.5">
                    {data.noWaSantri}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-primary-light/20 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-heading font-bold text-text-primary mb-4">
                <Wallet className="text-primary" /> Tagihan Pembayaran
              </div>
              {data.tagihan ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="text-left text-text-secondary border-b border-primary-light/20">
                          <th className="py-2 pr-3 font-medium">Tahap</th>
                          <th className="py-2 pr-3 font-medium">Poin</th>
                          <th className="py-2 pr-3 font-medium text-right">
                            Harus
                          </th>
                          <th className="py-2 pr-3 font-medium text-right">
                            Dibayar
                          </th>
                          <th className="py-2 pr-3 font-medium text-right">
                            Sisa
                          </th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.tagihan.items.map((it, i) => (
                          <tr
                            key={i}
                            className="border-b border-primary-light/10 last:border-0"
                          >
                            <td className="py-2.5 pr-3">
                              {it.tahap} — {it.tahapNama}
                            </td>
                            <td className="py-2.5 pr-3">{it.poin}</td>
                            <td className="py-2.5 pr-3 text-right">
                              {formatRp(it.nominalHarus)}
                            </td>
                            <td className="py-2.5 pr-3 text-right">
                              {formatRp(it.nominalDibayar)}
                            </td>
                            <td className="py-2.5 pr-3 text-right">
                              {formatRp(it.sisa)}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                  it.isLunas
                                    ? "bg-success/10 text-success"
                                    : "bg-danger/10 text-danger"
                                }`}
                              >
                                {it.isLunas ? "LUNAS" : "BELUM LUNAS"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary-light/20 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total harus dibayar</span>
                      <span className="font-semibold">
                        {formatRp(data.tagihan.totalHarus)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total sudah dibayar</span>
                      <span className="font-semibold">
                        {formatRp(data.tagihan.totalDibayar)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-primary font-medium">
                        Total sisa
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatRp(data.tagihan.totalSisa)}
                      </span>
                    </div>
                    {data.tagihan.semuaLunas && (
                      <p className="pt-2 text-success font-semibold inline-flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Semua tagihan sudah lunas.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary text-sm">
                      Tahap 1 — Investasi Fiksasi/Booking Kuota
                    </span>
                    <span className="px-3 py-1 bg-danger/10 text-danger text-xs font-bold rounded-full">
                      BELUM DIBAYAR
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between items-end">
                    <span className="text-text-primary font-medium text-sm">
                      Total Tagihan
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      Rp 1.000.000
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">
                    Rincian tagihan lengkap akan tampil setelah admin
                    memverifikasi pendaftaran Anda.
                  </p>
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-text-secondary mb-2">
                      Silakan transfer biaya pendaftaran ke rekening berikut:
                    </p>
                    <div className="text-xl font-bold text-text-primary tracking-wide">
                      BRI 055501049030500
                    </div>
                    <div className="text-sm font-medium text-text-primary">
                      a.n. Markaz Arabiyah
                    </div>
                    <p className="text-sm text-text-secondary mt-2">
                      Setelah transfer, konfirmasi ke admin agar pembayaran
                      dicatat dan diverifikasi.
                    </p>
                  </div>
                </>
              )}
            </div>

            {data.legacy.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg border border-primary-light/20 p-5 sm:p-6">
                <h3 className="font-heading font-bold text-text-primary mb-3">
                  Riwayat Pembayaran Lama
                </h3>
                <div className="space-y-2 text-sm">
                  {data.legacy.map((l, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center border-b border-primary-light/10 last:border-0 pb-2 last:pb-0"
                    >
                      <span className="text-text-secondary">
                        Tahap {l.tahap}
                      </span>
                      <span className="font-semibold">
                        {formatRp(l.nominal)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          l.status === "LUNAS"
                            ? "bg-success/10 text-success"
                            : l.status === "MENUNGGU_VERIFIKASI"
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                        }`}
                      >
                        {labelLegacy(l.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => no.trim() && tgl && fetchStatus(no.trim(), tgl)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary-light/50 text-text-primary font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} /> Perbarui Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
