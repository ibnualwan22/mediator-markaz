"use client";

import { useState } from "react";
import { X, Save, Edit3, Loader2 } from "lucide-react";
import { updateSantriData } from "@/app/admin/(dashboard)/santri/actions";
import Swal from "sweetalert2";

export default function EditSantriModal({ santri }: { santri: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    namaLengkap: santri.namaLengkap || "",
    namaArab: santri.namaArab || "",
    email: santri.email || "",
    asalProvinsi: santri.asalProvinsi || "",
    noWaSantri: santri.noWaSantri || "",
    namaWali: santri.namaWali || "",
    noWaWali: santri.noWaWali || "",
    nomorPaspor: santri.nomorPaspor || "",
    nis: santri.nis || "",
    nomorUrut: santri.nomorUrut || "",
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await updateSantriData(santri.id, formData);
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } else {
      Swal.fire('Gagal Menyimpan', res.error, 'error');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-black dark:hover:bg-white transition-colors"
      >
        <Edit3 size={16} /> Edit Data Pribadi
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
            <div className="flex flex-shrink-0 items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-gray-800">Edit Data Pribadi</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi profil {santri.namaLengkap}</p>
                </div>
              </div>
              <button disabled={isLoading} onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="editSantriForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                    <input required type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Arab</label>
                    <input type="text" name="namaArab" value={formData.namaArab} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">NIC Lengkap</label>
                    <input type="text" name="nis" value={formData.nis} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all font-mono text-primary font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Urut Pendaftaran</label>
                    <input type="text" name="nomorUrut" value={formData.nomorUrut} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all font-mono text-purple-600 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Asal Provinsi</label>
                    <input type="text" name="asalProvinsi" value={formData.asalProvinsi} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No WA Camaba</label>
                    <input type="text" name="noWaSantri" value={formData.noWaSantri} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Paspor</label>
                    <input type="text" name="nomorPaspor" value={formData.nomorPaspor} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all font-mono" />
                  </div>
                  
                  <div className="sm:col-span-2 pt-4 pb-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Wali</h4>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Wali</label>
                    <input type="text" name="namaWali" value={formData.namaWali} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No WA Wali</label>
                    <input type="text" name="noWaWali" value={formData.noWaWali} onChange={handleChange} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-lg outline-none focus:border-primary text-sm transition-all" />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 dark:bg-gray-800 flex gap-3 flex-shrink-0">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="w-28 py-3 bg-white dark:bg-gray-900 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="editSantriForm"
                disabled={isLoading || !formData.namaLengkap}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-light transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save size={18} /> Simpan Perubahan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
