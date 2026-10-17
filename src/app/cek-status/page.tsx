"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Wallet, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import BayarButton from "@/components/midtrans/BayarButton";
import { bacaKodeLokal } from "@/components/midtrans/SimpanKodeLokal";

interface StatusData {
  nama: string;
  noPendaftaran: string;
  gelombang: string;
  periode: string;
  isVerified: boolean;
  midtransEnabled: boolean;
  tagihan: {
    nama: string;
    nominalHarus: number;
    nominalDibayar: number;
    sisa: number;
    isLunas: boolean;
  } | null;
}

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function CekStatusPage() {
  const [no, setNo] = useState("");
  const [tgl, setTgl] = useState("");
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Otomatis muat dari localStorage bila ada.
  useEffect(() => {
    if (autoTried) return;
    setAutoTried(true);
    const saved = bacaKodeLokal();
    if (saved) {
      setNo(saved.noPendaftaran);
      setTgl(saved.tanggalLahir);
      fetchStatus(saved.noPendaftaran, saved.tanggalLahir);
    }
  }, [autoTried, fetchStatus]);

  // Hentikan polling saat unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Polling status setelah aksi pembayaran (webhook adalah sumber kebenaran).
  const mulaiPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      if (count > 20) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      const savedNo = no || bacaKodeLokal()?.noPendaftaran || "";
      const savedTgl = tgl || bacaKodeLokal()?.tanggalLahir || "";
      if (!savedNo || !savedTgl) return;
      try {
        const res = await fetch(
          `/api/pendaftaran/status?no=${encodeURIComponent(savedNo)}&tgl=${encodeURIComponent(savedTgl)}`
        );
        const json = await res.json();
        if (res.ok) {
          setData(json);
          if (json?.tagihan?.isLunas && pollRef.current) {
            clearInterval(pollRef.current);
          }
        }
      } catch {
        // Abaikan error polling; pengguna bisa tekan "Cek Ulang".
      }
    }, 3000);
  }, [no, tgl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (no.trim() && tgl) fetchStatus(no.trim(), tgl);
  };

  return (
    <div className="min-h-screen bg-bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>

        <h1 className="text-2xl font-heading font-bold text-text-primary mb-1">
          Cek Status Pendaftaran
        </h1>
        <p className="text-text-secondary mb-8">
          Masukkan nomor pendaftaran dan tanggal lahir untuk melihat status
          pembayaran Anda.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-primary-light/20 p-6 mb-6"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Nomor Pendaftaran
              </label>
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder="MA-2026-0001"
                className="w-full px-4 py-2.5 rounded-xl border border-primary-light/40 focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tgl}
                onChange={(e) => setTgl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary-light/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            <Search size={18} /> {loading ? "Memuat..." : "Cek Status"}
          </button>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
        </form>

        {data && (
          <div className="bg-white rounded-2xl border border-primary-light/20 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-text-secondary">Nomor Pendaftaran</p>
                <p className="text-xl font-mono font-bold text-primary">
                  {data.noPendaftaran}
                </p>
                <p className="font-semibold text-text-primary mt-1">{data.nama}</p>
                <p className="text-sm text-text-secondary">
                  {data.gelombang} • {data.periode}
                </p>
              </div>
              {data.isVerified ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
                  <CheckCircle2 size={14} /> TERVERIFIKASI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full">
                  <Clock size={14} /> MENUNGGU VERIFIKASI
                </span>
              )}
            </div>

            {data.tagihan ? (
              <div className="bg-bg-cream rounded-2xl p-6 border border-primary-light/30">
                <div className="flex items-center gap-2 font-heading font-bold text-text-primary mb-4">
                  <Wallet className="text-primary" size={20} />
                  {data.tagihan.nama.toUpperCase()}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total tagihan</span>
                    <span className="font-semibold">
                      {formatRp(data.tagihan.nominalHarus)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Sudah dibayar</span>
                    <span className="font-semibold">
                      {formatRp(data.tagihan.nominalDibayar)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-primary-light/20">
                    <span className="text-text-secondary">Sisa</span>
                    <span className="font-bold text-lg text-primary">
                      {formatRp(Math.max(0, data.tagihan.sisa))}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {data.tagihan.isLunas ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
                      <CheckCircle2 size={14} /> LUNAS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-danger/10 text-danger text-xs font-bold rounded-full">
                      BELUM DIBAYAR
                    </span>
                  )}
                </div>

                {!data.tagihan.isLunas && data.midtransEnabled && (
                  <div className="mt-6">
                    <BayarButton
                      noPendaftaran={data.noPendaftaran}
                      label="Bayar Sekarang"
                      onStatusChange={mulaiPolling}
                    />
                    <button
                      onClick={() => fetchStatus(data.noPendaftaran, tgl)}
                      className="mt-3 text-sm text-text-secondary underline hover:text-text-primary"
                    >
                      Cek ulang status
                    </button>
                  </div>
                )}
                {!data.tagihan.isLunas && !data.midtransEnabled && (
                  <p className="mt-4 text-sm text-text-secondary">
                    Silakan transfer ke rekening yang tertera pada halaman
                    pendaftaran, lalu upload bukti transfer.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Tagihan belum tersedia. Hubungi admin.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
