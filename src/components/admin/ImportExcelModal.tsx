"use client";

import { useState, useRef } from "react";
import { X, Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ImportExcelModal({ 
  isOpen, 
  onClose, 
  gelombangList,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  gelombangList: any[];
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedGelombang, setSelectedGelombang] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        alert("Harap unggah file Excel (.xlsx atau .xls)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setSelectedGelombang("");
    setOverwriteExisting(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const downloadTemplate = () => {
    window.location.href = "/api/admin/santri/template";
  };

  const handleImport = async () => {
    if (!file) {
      alert("Pilih file Excel terlebih dahulu");
      return;
    }
    if (!selectedGelombang) {
      alert("Pilih gelombang penempatan santri");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("gelombangId", selectedGelombang);
    formData.append("overwriteExisting", overwriteExisting.toString());

    try {
      const res = await fetch("/api/admin/santri/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.summary.success > 0) {
        onSuccess();
      }
    } catch (error) {
      setResult({ error: "Terjadi kesalahan koneksi server" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-gray-800">Import Santri</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tambah data massal dari file Excel</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="text-sm text-primary font-medium">1. Unduh Template Excel</div>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary/20 hover:border-primary text-primary rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <Download size={14} /> Download
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">2. Pilih Gelombang</label>
                <select 
                  value={selectedGelombang}
                  onChange={(e) => setSelectedGelombang(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
                >
                  <option value="">-- Pilih Gelombang Penempatan --</option>
                  {gelombangList.map(g => (
                    <option key={g.id} value={g.id}>{g.periode.nama} - {g.nama}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">3. Upload File Data</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-primary/50 bg-gray-50 hover:bg-primary/5 rounded-2xl transition-all group group-hover:cursor-pointer"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-3">
                        <FileSpreadsheet size={24} />
                      </div>
                      <p className="font-semibold text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="mt-3 text-xs text-danger font-medium hover:underline cursor-pointer z-10 block relative"
                      >
                        Ganti File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-gray-200/50 text-gray-400 group-hover:text-primary rounded-full flex items-center justify-center mb-3 transition-colors">
                        <Upload size={24} />
                      </div>
                      <p className="font-semibold text-gray-700">Klik atau Drag & Drop file Excel</p>
                      <p className="text-xs text-gray-500 mt-1">Hanya mendukung format .xlsx</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="overwriteCheckbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary"
                />
                <label htmlFor="overwriteCheckbox" className="text-sm text-gray-700 cursor-pointer select-none">
                  Timpa data santri dengan Nama Lengkap yang sama (jika ada)
                </label>
              </div>
            </div>
          ) : (
             <div className="space-y-4">
               {result.success ? (
                 <div className="text-center p-6 border border-success/20 bg-success/5 rounded-2xl">
                   <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-800">Import Selesai!</h3>
                   <p className="text-sm text-gray-600 mt-2">
                     Berhasil memasukkan <strong className="text-success">{result.summary.success}</strong> data santri.
                   </p>
                   {result.summary.failed > 0 && (
                     <p className="text-sm text-danger mt-1">
                       Gagal: <strong>{result.summary.failed}</strong> baris (lihat log di bawah).
                     </p>
                   )}
                 </div>
               ) : (
                 <div className="text-center p-6 border border-danger/20 bg-danger/5 rounded-2xl">
                   <div className="w-16 h-16 bg-danger/20 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                     <AlertCircle size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-800">Import Gagal</h3>
                   <p className="text-sm text-gray-600 mt-2">{result.error}</p>
                 </div>
               )}

               {result.summary?.errors?.length > 0 && (
                 <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                   <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                     <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                       <AlertCircle size={14} className="text-warning"/> Log Error
                     </h4>
                   </div>
                   <div className="p-4 max-h-40 overflow-y-auto bg-white">
                     <ul className="text-xs text-danger space-y-1.5 font-mono">
                       {result.summary.errors.map((err: string, i: number) => (
                         <li key={i}>• {err}</li>
                       ))}
                     </ul>
                   </div>
                 </div>
               )}

               <button 
                 onClick={result.success ? handleClose : resetForm}
                 className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors mt-6"
               >
                 {result.success ? "Tutup & Refresh Tabel" : "Coba Lagi"}
               </button>
             </div>
          )}
        </div>

        {!result && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button 
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleImport}
              disabled={isLoading || !file || !selectedGelombang}
              className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-light transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Memproses...</>
              ) : (
                <><Upload size={18} /> Import Data</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
