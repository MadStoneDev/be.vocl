"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFlag,
  IconFlagExclamation,
  IconUsers,
  IconMessageReport,
  IconDashboard,
  IconArrowLeft,
  IconLoader2,
  IconShieldCheck,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Check if user is admin (role >= 10) or moderator (role >= 5)
    const checkAccess = async () => {
      if (!profile) {
        router.replace("/login");
        return;
      }

      // Fetch role from database
      const response = await fetch("/api/admin/check-access");
      const data = await response.json();

      if (!data.authorized) {
        router.replace("/feed");
        return;
      }

      setIsAuthorized(true);
    };

    checkAccess();
  }, [profile, isLoading, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const navItems = [
    { href: "/admin", icon: IconDashboard, label: "Overview", exact: true },
    { href: "/admin/reports", icon: IconFlag, label: "Reports" },
    { href: "/admin/flags", icon: IconFlagExclamation, label: "Flags" },
    { href: "/admin/users", icon: IconUsers, label: "Users" },
    { href: "/admin/appeals", icon: IconMessageReport, label: "Appeals" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <IconArrowLeft size={20} />
              <span className="text-sm hidden sm:inline">Back to feed</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <IconShieldCheck size={20} className="text-vocl-accent" />
              <span className="font-semibold text-foreground">Admin</span>
            </div>
          </div>

          {/* Header actions - visible on mobile */}
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <IconSettings size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-foreground/60 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
              title="Logout"
            >
              <IconLogout size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-14 bottom-0 w-56 bg-background border-r border-white/5 z-40">
        <nav className="p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-vocl-accent/10 text-vocl-accent font-medium"
                        : "text-foreground/60 hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? "text-vocl-accent"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 pb-20 md:pb-0 md:pl-56">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
