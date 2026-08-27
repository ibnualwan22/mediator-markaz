"use client";

import { useState } from "react";
import { FileText, X, Download } from "lucide-react";

export default function DocumentViewer({ url, label = "Dokumen" }: { url: string, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const isImage = url.startsWith("data:image") || url.match(/\.(jpeg|jpg|gif|png)$/i);
  
  return (
    <>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); setIsOpen(true); }}
        className="text-primary underline flex items-center gap-1 hover:text-primary-light transition-colors"
      >
        <FileText size={16} /> Lihat Dokumen
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-primary-light/20 dark:border-gray-700 bg-bg-cream dark:bg-gray-800 rounded-t-2xl">
              <h3 className="font-bold text-text-primary dark:text-gray-100 text-lg flex items-center gap-2">
                <FileText size={20} className="text-primary" /> Preview {label}
              </h3>
              <div className="flex items-center gap-2">
                <a 
                  href={url} 
                  download={`File_Santri_${label.replace(/\s+/g, "_")}`}
                  title="Unduh Dokumen"
                  className="p-1.5 hover:bg-black dark:hover:bg-white/10 rounded-full transition-colors text-primary"
                >
                  <Download size={20} />
                </a>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-black dark:hover:bg-white/10 rounded-full transition-colors text-text-secondary dark:text-gray-400"
                  title="Tutup"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-x border-b border-primary-light/10 dark:border-gray-700 rounded-b-2xl min-h-[50vh]">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={label} className="max-w-full max-h-full object-contain rounded drop-shadow-md" />
              ) : (
                <div className="text-center p-8">
                  <FileText size={64} className="mx-auto text-primary-light mb-4" />
                  <p className="text-text-primary dark:text-gray-100 font-medium mb-4">File ini berupa Dokumen (Bukan Gambar).</p>
                  <a 
                    href={url} 
                    download={`File_Santri_${label.replace(/\s+/g, "_")}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors shadow-sm"
                  >
                    <Download size={18} /> Unduh File Saja
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
