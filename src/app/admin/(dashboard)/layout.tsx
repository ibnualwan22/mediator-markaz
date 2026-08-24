import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  CreditCard,
  FolderCheck,
  LineChart,
  LayoutDashboard,
  LogOut
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { name: "Periode & Gelombang", href: "/admin/periode", icon: <CalendarDays size={20} /> },
    { name: "Data Santri", href: "/admin/santri", icon: <Users size={20} /> },
    { name: "Pembayaran", href: "/admin/pembayaran", icon: <CreditCard size={20} /> },
    { name: "Pemberkasan", href: "/admin/pemberkasan", icon: <FolderCheck size={20} /> },
    { name: "Daurah Lughoh", href: "/admin/darul-lughoh", icon: <LogOut size={20} /> }, // temporarily using LogOut icon since I need a generic one like BookOpen if available
    { name: "Progres Santri", href: "/admin/progres", icon: <LineChart size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-bg-cream flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-primary-light/20 flex flex-col fixed inset-y-0 z-10 transition-transform">
        <div className="h-16 flex items-center px-6 border-b border-primary-light/20">
          <div className="font-heading font-bold text-xl text-primary">Markaz Admin</div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-text-secondary rounded-xl hover:bg-primary/5 hover:text-primary transition-all font-medium"
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-primary-light/20">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold">
              {session.user?.name?.[0] || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-text-primary truncate">{session.user?.name}</p>
              <p className="text-xs text-text-secondary truncate">{session.user?.role}</p>
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
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
