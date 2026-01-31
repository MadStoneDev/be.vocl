"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFlag,
  IconUsers,
  IconMessageReport,
  IconDashboard,
  IconArrowLeft,
  IconLoader2,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";

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
    { href: "/admin/users", icon: IconUsers, label: "Users" },
    { href: "/admin/appeals", icon: IconMessageReport, label: "Appeals" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <IconArrowLeft size={20} />
              <span className="text-sm">Back to feed</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <IconShieldCheck size={20} className="text-vocl-accent" />
              <span className="font-semibold text-foreground">Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-14 bottom-0 w-56 bg-background border-r border-white/5 z-40">
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

      {/* Main Content */}
      <main className="pt-14 pl-56">
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
