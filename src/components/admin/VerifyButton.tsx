"use client";

import { useState } from "react";
import { verifySantri } from "@/app/admin/(dashboard)/santri/actions";
import { CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";

export default function VerifyButton({ santriId, isVerified }: { santriId: string, isVerified: boolean }) {
  const [isLoading, setIsLoading] = useState(false);

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-xl font-bold text-sm">
        <CheckCircle2 size={18} />
        Telah Terverifikasi
      </div>
    );
  }

  const handleVerify = async () => {
    const confirmRes = await Swal.fire({
      title: 'Verifikasi Camaba?',
      text: "Tindakan ini akan membuat NIS baru untuk camaba ini.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Verifikasi!'
    });
    
    if (!confirmRes.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await verifySantri(santriId);
      if (!res.success) {
        Swal.fire('Gagal!', res.error, 'error');
      } else {
        Swal.fire({ title: 'Berhasil!', text: 'Camaba telah diverifikasi', icon: 'success', timer: 2000, showConfirmButton: false });
      }
    } catch (error) {
      Swal.fire('Error!', 'Terjadi kesalahan sistem saat verifikasi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleVerify}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 px-6 py-2 bg-success text-white rounded-xl font-bold shadow-md hover:bg-success/80 transition-all disabled:opacity-70 text-sm"
    >
      <CheckCircle2 size={18} />
      {isLoading ? "Memproses..." : "Verifikasi & Generate NIS"}
    </button>
  );
}
