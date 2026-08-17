"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function SantriLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/santri/auth/logout", { method: "POST" });
    router.push("/santri/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 text-danger hover:bg-danger/10 w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
    >
      <LogOut size={18} />
      {loading ? "Keluar..." : "Logout"}
    </button>
  );
}
