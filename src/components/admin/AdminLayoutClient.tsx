"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "./ThemeProvider";
import ThemeToggle from "./ThemeToggle";
import { Menu, X, LogOut, LayoutDashboard, CalendarDays, Users, CreditCard, FolderCheck, LineChart, BookOpen, UserPlus } from "lucide-react";

export default function AdminLayoutClient({ children, user }: { children: React.ReactNode; user: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { name: "Periode & Gelombang", href: "/admin/periode", icon: <CalendarDays size={20} /> },
    { name: "Pendaftaran Camaba", href: "/admin/pendaftaran", icon: <UserPlus size={20} /> },
    { name: "Data Camaba", href: "/admin/santri", icon: <Users size={20} /> },
    { name: "Pembayaran", href: "/admin/pembayaran", icon: <CreditCard size={20} /> },
    { name: "Pemberkasan", href: "/admin/pemberkasan", icon: <FolderCheck size={20} /> },
    { name: "Dauroh Lughoh & Ta'hili", href: "/admin/darul-lughoh", icon: <BookOpen size={20} /> },
    { name: "Progres Camaba", href: "/admin/progres", icon: <LineChart size={20} /> },
  ];

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-bg-cream dark:bg-gray-900 flex text-text-primary dark:text-gray-100 transition-colors">
        
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`w-64 bg-white dark:bg-gray-800 border-r border-primary-light/20 dark:border-gray-700 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-primary-light/20 dark:border-gray-700 shrink-0">
            <div className="font-heading font-bold text-xl text-primary dark:text-primary-light">Markaz Admin</div>
            <button className="lg:hidden text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary-light" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${pathname === item.href ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' : 'text-text-secondary dark:text-gray-400 hover:bg-primary/5 hover:text-primary dark:hover:bg-gray-700 dark:hover:text-gray-200'}`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-primary-light/20 dark:border-gray-700 shrink-0">
            <div className="mb-4">
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-primary-light/30 dark:bg-primary-light/20 flex items-center justify-center text-primary dark:text-primary-light font-bold shrink-0">
                {user?.name?.[0] || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-text-primary dark:text-gray-100 truncate">{user?.name}</p>
                <p className="text-xs text-text-secondary dark:text-gray-400 truncate">{user?.role}</p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-2 text-danger hover:bg-danger/10 w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Logout
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 lg:ml-64 w-full">
          <header className="lg:hidden h-16 flex items-center border-b border-primary-light/20 dark:border-gray-700 px-4 bg-white dark:bg-gray-800 shrink-0 sticky top-0 z-30 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary-light mr-4 p-1">
              <Menu size={24} />
            </button>
            <div className="font-heading font-bold text-lg text-primary dark:text-primary-light">Markaz Admin</div>
          </header>
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
