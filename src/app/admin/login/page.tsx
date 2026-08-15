"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Username atau password salah");
      } else {
        router.push("/admin");
        router.refresh(); // Force refresh to get session state
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-primary-light/20 overflow-hidden">
        <div className="bg-primary px-8 py-10 text-center relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 L 100 0 L 100 50 L 50 100 Z" fill="currentColor" />
            </svg>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white relative z-10">Portal Admin</h1>
          <p className="text-primary-bg/90 mt-1 text-sm relative z-10">
            Markaz Arabiyah
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary/50">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData(f => ({ ...f, username: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-primary-light/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary/50">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-primary-light/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Masukkan password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 mt-4 bg-primary text-white font-medium rounded-xl hover:bg-primary-light transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isLoading ? "Memverifikasi..." : "Login ke Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
