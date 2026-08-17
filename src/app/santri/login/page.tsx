"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, BookOpen, Sparkles } from "lucide-react";

export default function SantriLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ nis: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/santri/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
      } else {
        router.push("/santri");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-primary-light/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary-light px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="none">
                <circle cx="150" cy="30" r="80" fill="currentColor" />
                <circle cx="30" cy="170" r="60" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute top-4 right-4 text-white/20">
              <Sparkles size={24} />
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20 shadow-lg">
              <BookOpen size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white relative z-10">Portal Santri</h1>
            <p className="text-white/80 mt-1.5 text-sm relative z-10">
              Markaz Arabiyah
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">NIS (Nomor Induk Santri)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary/50">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData((f) => ({ ...f, nis: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-bg-cream/30"
                    placeholder="Masukkan NIS"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary/50">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-bg-cream/30"
                    placeholder="Masukkan password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-primary to-primary-light text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all shadow-md disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Portal"
                )}
              </button>
            </form>

            <p className="text-center text-xs text-text-secondary/60 mt-6">
              Password default: NIS Anda
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
