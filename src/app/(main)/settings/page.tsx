"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IconUser,
  IconLock,
  IconShieldLock,
  IconBell,
  IconEye,
  IconPalette,
  IconChevronRight,
  IconCheck,
  IconLogout,
  IconTicket,
  IconAlertOctagon,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { toast, LoadingSpinner } from "@/components/ui";

const settingsLinks = [
  {
    href: "/settings/profile",
    icon: IconUser,
    title: "Profile",
    description: "Edit your profile, bio, and links",
    color: "text-rose-400",
  },
  {
    href: "/settings/password",
    icon: IconLock,
    title: "Password & Security",
    description: "Update password and security settings",
    color: "text-sky-400",
  },
  {
    href: "/settings/security",
    icon: IconShieldLock,
    title: "Two-Factor Auth",
    description: "Add an extra layer of security with 2FA",
    color: "text-emerald-400",
  },
  {
    href: "/settings/notifications",
    icon: IconBell,
    title: "Notifications",
    description: "Configure email and push notifications",
    color: "text-amber-400",
  },
  {
    href: "/settings/privacy",
    icon: IconEye,
    title: "Privacy",
    description: "Control who can see your content",
    color: "text-violet-400",
  },
  {
    href: "/settings/appearance",
    icon: IconPalette,
    title: "Appearance",
    description: "Theme and display preferences",
    color: "text-pink-400",
  },
  {
    href: "/settings/invites",
    icon: IconTicket,
    title: "Invite Codes",
    description: "Generate codes to invite friends",
    color: "text-indigo-400",
  },
  {
    href: "/settings/account",
    icon: IconAlertOctagon,
    title: "Account & Data",
    description: "Export your data, delete your account",
    color: "text-orange-400",
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (searchParams.get("email_changed") === "true") {
      toast.success("Email updated successfully!");
      setShowSuccess(true);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      toast.error("Failed to log out");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <title>Settings | be.vocl</title>

      {/* Editorial masthead */}
      <header className="mb-8 border-b border-vocl-border pb-6">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          Your account
        </span>
        <h1 className="type-display-lg font-display text-foreground mt-1 flex items-center gap-3">
          <IconSettings size={30} className="text-vocl-primary flex-shrink-0" />
          Settings
        </h1>
        <p className="type-body text-foreground/55 mt-1">
          Manage your profile, privacy, and how be.vocl works for you.
        </p>
      </header>

      {showSuccess && (
        <div className="mb-6 p-4 rounded-sm bg-vocl-primary/10 border border-vocl-primary/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vocl-primary/20 flex items-center justify-center">
            <IconCheck className="w-4 h-4 text-vocl-primary" />
          </div>
          <p className="text-sm text-foreground">Your email has been updated successfully.</p>
        </div>
      )}

      <nav className="rounded-sm border border-vocl-border bg-vocl-surface-dark overflow-hidden divide-y divide-vocl-border">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-4 px-4 py-4 hover:bg-vocl-hover transition-colors"
          >
            <div className="w-10 h-10 rounded-sm bg-vocl-hover flex items-center justify-center">
              <link.icon className={`w-5 h-5 ${link.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="type-heading text-foreground group-hover:text-vocl-primary transition-colors">
                {link.title}
              </h3>
              <p className="type-meta text-foreground/50 mt-0.5">{link.description}</p>
            </div>
            <IconChevronRight className="w-5 h-5 text-foreground/30 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t border-vocl-border">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-4 p-4 w-full rounded-sm bg-vocl-like/10 hover:bg-vocl-like/20 transition-colors disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-sm bg-vocl-like/20 flex items-center justify-center">
            <IconLogout className="w-5 h-5 text-vocl-like" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="type-heading text-vocl-like">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </h3>
            <p className="type-meta text-vocl-like/70 mt-0.5">Sign out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="py-6 flex justify-center"><LoadingSpinner size="lg" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
