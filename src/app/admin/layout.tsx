"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { IconLoader2 } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin shell — direction 1B "The Worklist". The back desk lives inside the
 * app's own chrome: a 248px broadsheet rail (same geometry as the product
 * SectionsRail), grouped DESK / RECORDS, with a masthead + user footer. Rules,
 * radius 0, accent for the active item only.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const checkAccess = async () => {
      if (!profile) {
        router.replace("/login");
        return;
      }
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
        <IconLoader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }
  if (!isAuthorized) return null;

  const groups: { label: string; items: { href: string; label: string; exact?: boolean }[] }[] = [
    {
      label: "Desk",
      items: [
        { href: "/admin", label: "The queue", exact: true },
        { href: "/admin/reports", label: "Reports" },
        { href: "/admin/flags", label: "Flags" },
        { href: "/admin/appeals", label: "Appeals" },
      ],
    },
    {
      label: "Records",
      items: [
        { href: "/admin/users", label: "Users" },
        { href: "/admin/invites", label: "Invites" },
        { href: "/admin/email", label: "Email" },
        { href: "/admin/audit", label: "Audit trail" },
      ],
    },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navRow = (item: { href: string; label: string; exact?: boolean }) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item.href, item.exact) ? "page" : undefined}
      className={`block border-l-2 px-6 py-2.5 text-[13.5px] transition-colors ${
        isActive(item.href, item.exact)
          ? "border-accent text-ink"
          : "border-transparent text-meta hover:text-ink hover:bg-vocl-hover"
      }`}
    >
      {item.label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop rail */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[248px] flex-col border-r border-rule bg-background">
        <div className="border-b border-rule px-6 pb-5 pt-6">
          <Link href="/admin" className="font-display text-[28px] leading-none text-ink">
            be<span className="text-accent">.</span>vocl
          </Link>
          <div className="slug mt-2 text-meta-dim">Back desk · Admin</div>
        </div>

        <div className="flex-1 overflow-y-auto py-5">
          {groups.map((g) => (
            <div key={g.label} className="mb-6 last:mb-0">
              <div className="slug px-6 pb-3 text-meta-dim">{g.label}</div>
              {g.items.map(navRow)}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-rule px-6 py-5">
          <Link href="/feed" className="slug text-meta hover:text-accent transition-colors">
            ← Back to front page
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="ph-image h-[26px] w-[26px] flex-none" aria-hidden="true" />
            <span className="text-[12.5px] text-ink truncate">@{profile?.username ?? "admin"}</span>
            <span className="slug ml-auto text-accent">Admin</span>
          </div>
          <div className="flex gap-4">
            <Link href="/settings" className="slug text-meta hover:text-ink transition-colors">Settings</Link>
            <button onClick={handleLogout} className="slug text-meta hover:text-vocl-like transition-colors">Sign out</button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar + scrollable section nav */}
      <div className="md:hidden sticky top-0 z-40 bg-background border-b border-rule">
        <div className="flex items-center justify-between px-5 py-3">
          <Link href="/admin" className="font-display text-xl leading-none text-ink">
            be<span className="text-accent">.</span>vocl <span className="slug text-meta-dim ml-1">Back desk</span>
          </Link>
          <button onClick={handleLogout} className="slug text-meta hover:text-vocl-like transition-colors">Sign out</button>
        </div>
        <nav className="flex gap-5 overflow-x-auto px-5 pb-2.5">
          {groups.flatMap((g) => g.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive(item.href, item.exact)}
              className="section-tab whitespace-nowrap hover:text-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="md:pl-[248px]">
        <div className="px-5 pb-16 pt-4 md:px-10 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
