"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  CreditCard,
  FolderCheck,
  LineChart,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import SantriLogoutButton from "@/components/santri/LogoutButton";

interface SantriSidebarProps {
  nama: string;
  nis: string;
}

const menuItems = [
  { name: "Profil Saya", href: "/santri", icon: <User size={20} /> },
  { name: "Pembayaran", href: "/santri/pembayaran", icon: <CreditCard size={20} /> },
  { name: "Pemberkasan", href: "/santri/pemberkasan", icon: <FolderCheck size={20} /> },
  { name: "Progres", href: "/santri/progres", icon: <LineChart size={20} /> },
  { name: "Darul Lughoh", href: "/santri/darul-lughoh", icon: <BookOpen size={20} /> },
];

export default function SantriSidebar({ nama, nis }: SantriSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-primary-light/20 flex items-center px-4 z-30">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-1 rounded-lg hover:bg-primary/5 text-text-primary transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={22} />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
            <BookOpen size={13} className="text-white" />
          </div>
          <span className="font-heading font-bold text-primary text-sm">Portal Santri</span>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-primary-light/20 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:z-10
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-14 lg:h-16 flex items-center px-6 border-b border-primary-light/20 gap-3 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="font-heading font-bold text-lg text-primary flex-1">Portal Santri</div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-primary/5 text-text-secondary transition-colors"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = item.href === pathname;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-primary-light/20 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {nama?.[0] || "S"}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{nama}</p>
              <p className="text-xs text-text-secondary font-mono truncate">{nis}</p>
            </div>
          </div>
          <SantriLogoutButton />
        </div>
      </aside>
    </>
  );
}
