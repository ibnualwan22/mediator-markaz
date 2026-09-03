"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { deleteSantri } from "@/app/admin/(dashboard)/santri/actions";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function DeleteSantriButton({ santriId, namaLengkap }: { santriId: string, namaLengkap: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmName !== namaLengkap) return;

    setIsLoading(true);
    const result = await deleteSantri(santriId);
    
    if (result.success) {
      Swal.fire({ title: 'Terhapus!', text: 'Data camaba berhasil dihapus.', icon: 'success', timer: 1500, showConfirmButton: false });
      router.push("/admin/santri");
    } else {
      Swal.fire('Gagal Menghapus', result.error, 'error');
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg transition-colors font-semibold text-sm border border-danger/20"
      >
        <Trash2 size={16} />
        Hapus Data
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-danger/5">
              <div className="flex items-center gap-3 text-danger">
                <AlertTriangle size={24} />
                <h2 className="text-lg font-bold">Hapus Data Camaba</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Tindakan ini <strong>SANGAT FATAL</strong> dan tidak dapat dibatalkan. Semua data terkait pendaftaran, pembayaran, pemberkasan, dan progres camaba ini akan dihapus secara permanen dari sistem.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ketik nama lengkap <span className="font-bold text-danger">"{namaLengkap}"</span> untuk mengonfirmasi:
                </label>
                <input 
                  type="text" 
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Ketik persis nama lengkap di atas"
                  className="w-full px-4 py-2.5 outline-none border border-gray-300 dark:border-gray-600 focus:border-danger rounded-lg transition-colors text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 dark:bg-gray-800 flex gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 font-semibold rounded-xl text-gray-700 hover:bg-gray-50 dark:bg-gray-800 transition-colors"
                disabled={isLoading}
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={confirmName !== namaLengkap || isLoading}
                className="flex-1 py-2.5 bg-danger text-white font-bold rounded-xl hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
