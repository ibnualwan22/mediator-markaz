"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchSantriGlobal } from "@/app/admin/(dashboard)/progres/actions";
import { Search, Loader2 } from "lucide-react";

type SearchResult = {
  id: string;
  namaLengkap: string;
  nis: string | null;
  gelombangId: string;
  gelombangNama: string;
};

export default function SearchAutocomplete({ 
  periodeId, 
  currentQuery 
}: { 
  periodeId: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query || query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const matches = await searchSantriGlobal(query, periodeId);
        setResults(matches);
        setIsOpen(true);
      } catch (err: any) {
        console.error("Search error:", err);
        setError("Gagal mencari data");
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, periodeId]);

  const handleSelect = (santri: SearchResult) => {
    setQuery(santri.namaLengkap);
    setIsOpen(false);
    
    // Update URL to apply both query and correct gelombang filter
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", santri.namaLengkap);
    params.set("gelombangId", santri.gelombangId);
    
    router.push(`/admin/progres?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      
      router.push(`/admin/progres?${params.toString()}`);
    }
  };

  return (
    <div className="relative flex-1 max-w-sm" ref={dropdownRef}>
      <div className="relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Cari NIC atau Nama..." 
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-primary-light/30 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-sm shadow-sm transition-colors"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 text-gray-400 animate-spin" size={16} />
        )}
      </div>

      {isOpen && (results.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
          {error ? (
            <div className="p-3 text-sm text-red-500 text-center">{error}</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((santri) => (
                <li 
                  key={santri.id}
                  onClick={() => handleSelect(santri)}
                  className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {santri.namaLengkap}
                      </div>
                      {santri.nis && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {santri.nis}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                        {santri.gelombangNama}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
