"use client";

import { useState } from "react";
import { UserMinus, ArrowRightLeft, Loader2, X, UserCheck } from "lucide-react";
import { withdrawSantri, transferSantriToGelombang, reactivateSantri } from "@/app/admin/(dashboard)/santri/actions";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function WithdrawSantriButton({
  santriId,
  isWithdrawn,
  gelombangList,
  paketList
}: {
  santriId: string,
  isWithdrawn: boolean,
  gelombangList: any[],
  paketList: any[]
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [targetPeriodeId, setTargetPeriodeId] = useState("");
  const [targetGelombangId, setTargetGelombangId] = useState("");

  // Get unique Periodes from Gelombang list for the cascading dropdown
  const periodes = Array.from(new Set(gelombangList.map(g => g.periodeId))).map(pid => {
    return gelombangList.find(g => g.periodeId === pid).periode;
  });

  const filteredGelombang = gelombangList.filter(g => g.periodeId === targetPeriodeId);

  const handleWithdraw = async () => {
    const { value: text } = await Swal.fire({
      title: 'Konfirmasi Mundur',
      input: 'textarea',
      inputLabel: 'Tulis Catatan / Alasan (Opsional)',
      inputPlaceholder: 'Alasan mundur...',
      showCancelButton: true,
      confirmButtonText: 'Nonaktifkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e3342f'
    });

    if (text !== undefined) {
      setIsLoading(true);
      const res = await withdrawSantri(santriId, text);
      setIsLoading(false);
      if (res.success) {
        Swal.fire({ title: 'Telah Nonaktif', text: 'Santri telah ditandai mundur dari gelombang ini', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      } else {
        Swal.fire('Gagal', res.error, 'error');
      }
    }
  };

  const handleReactivate = async () => {
    const result = await Swal.fire({
      title: 'Aktifkan Kembali?',
      text: "Santri akan dikembalikan statusnya menjadi aktif tanpa mengubah gelombangnya.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Aktifkan',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      const res = await reactivateSantri(santriId);
      setIsLoading(false);
      if (res.success) {
        Swal.fire({ title: 'Berhasil', text: 'Santri telah aktif kembali', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      } else {
        Swal.fire('Gagal', res.error, 'error');
      }
    }
  };

  const handleTransfer = async () => {
    if (!targetPeriodeId || !targetGelombangId) {
      Swal.fire('Error', 'Harap pilih Periode dan Gelombang tujuan.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await transferSantriToGelombang(santriId, targetGelombangId);
    setIsLoading(false);

    if (res.success) {
      setIsTransferModalOpen(false);
      Swal.fire('Berhasil', 'Santri berhasil dipindahkan. Uang (saldo) pembayaran tahap telah didistribusikan ke tagihan paket periode baru (jika pindah periode). Data pemberkasan dan DL tetap dipertahankan.', 'success');
    } else {
      Swal.fire('Gagal', res.error, 'error');
    }
  };

  return (
    <>
      {!isWithdrawn ? (
        <button
          onClick={handleWithdraw}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg transition-colors text-sm font-semibold whitespace-nowrap"
        >
          <UserMinus size={16} /> Mengundurkan Diri
        </button>
      ) : (
        <>
          <button
            onClick={handleReactivate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg transition-colors text-sm font-semibold whitespace-nowrap shadow-sm border border-success/20 hover:shadow"
          >
            <UserCheck size={16} /> Aktifkan Kembali
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors text-sm font-semibold whitespace-nowrap shadow-sm border border-primary/20 hover:shadow"
          >
            <ArrowRightLeft size={16} /> Pindah Periode / Gelombang
          </button>
        </>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col my-auto mt-20">

            <div className="flex flex-shrink-0 items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-gray-800">Pindah Periode & Gelombang</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Pemindahan otomatis akumulasi pembayaran</p>
                </div>
              </div>
              <button disabled={isLoading} onClick={() => setIsTransferModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-left flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl">
                <h4 className="font-bold text-warning text-sm">Informasi Penting Migrasi:</h4>
                <ul className="text-xs text-warning/80 mt-1 list-disc pl-4 space-y-1">
                  <li>Nomor Induk Santri (NIS) <strong>AKAN DI-GENERATE ULANG</strong> sesuai dengan gelombang tujuan agar No. Urut tidak bertabrakan.</li>
                  <li>Progres Pemberkasan & Dauroh Lughoh santri akan di-keep utuh.</li>
                  <li>Jika Paket Pembayaran berbeda, total saldo tagihan tahap lama dicairkan dan otomatis didistribusikan urut sebagai pembayaran Lunas ke paket baru tujuan.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Periode Tujuan</label>
                <select
                  value={targetPeriodeId}
                  onChange={(e) => {
                    setTargetPeriodeId(e.target.value);
                    setTargetGelombangId("");
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all"
                >
                  <option value="" disabled>-- Pilih --</option>
                  {periodes.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Gelombang Tujuan</label>
                <select
                  value={targetGelombangId}
                  onChange={(e) => setTargetGelombangId(e.target.value)}
                  disabled={!targetPeriodeId}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all disabled:opacity-50"
                >
                  <option value="" disabled>-- Pilih --</option>
                  {filteredGelombang.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 flex-shrink-0 text-left">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                disabled={isLoading}
                className="w-28 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleTransfer}
                disabled={isLoading || !targetPeriodeId || !targetGelombangId}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-light transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-sm"
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Sedang Memigrasikan...</>
                ) : (
                  <><ArrowRightLeft size={16} /> Konfirmasi Pindah</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
