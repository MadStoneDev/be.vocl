"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { toast, LoadingSpinner } from "@/components/ui";

const settingsLinks = [
  {
    href: "/settings/profile",
    title: "Profile",
    description: "Edit your profile, bio, and links",
    status: "EDIT",
  },
  {
    href: "/settings/password",
    title: "Password & security",
    description: "Update password and security settings",
    status: "EDIT",
  },
  {
    href: "/settings/security",
    title: "Two-factor auth",
    description: "Add an extra layer of security with 2FA",
    status: "OFF",
  },
  {
    href: "/settings/notifications",
    title: "Notifications",
    description: "Configure email and push notifications",
    status: "EDIT",
  },
  {
    href: "/settings/privacy",
    title: "Privacy & content",
    description: "Control who can see your content",
    status: "EDIT",
  },
  {
    href: "/settings/appearance",
    title: "Appearance",
    description: "Dark edition, newsprint edition, display",
    status: "EDITION",
  },
  {
    href: "/settings/invites",
    title: "Invite codes",
    description: "Generate codes to invite friends",
    status: "CODES",
  },
  {
    href: "/settings/account",
    title: "Account & data",
    description: "Export your data, delete your account",
    status: "EDIT",
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => setMounted(true), []);

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

  // Appearance row reflects the active edition once mounted (avoids SSR mismatch).
  const editionStatus = mounted
    ? resolvedTheme === "dark"
      ? "DARK"
      : "NEWSPRINT"
    : "EDITION";

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <title>Settings | be.vocl</title>

      {/* Editorial masthead */}
      <header className="mb-8 border-b border-rule pb-6">
        <p className="kicker kicker-accent">Your account</p>
        <h1 className="type-display-lg font-display text-ink mt-2">Settings</h1>
        <p className="editorial-deck text-meta mt-2">
          Manage your profile, privacy, and how be.vocl works for you.
        </p>
      </header>

      {showSuccess && (
        <div className="mb-6 p-4 border-l-2 border-accent bg-vocl-hover">
          <p className="editorial-body text-ink">
            Your email has been updated successfully.
          </p>
        </div>
      )}

      {/* Numbered rules list */}
      <nav className="rule-double rule-double-b">
        {settingsLinks.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-baseline justify-between gap-4 py-4 border-b border-rule last:border-b-0 text-ink"
          >
            <span className="flex-1 min-w-0">
              <span className="slug text-meta-dim mr-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base group-hover:text-accent transition-colors">
                {link.title}
              </span>
              <span className="block mt-1.5 ml-[38px] editorial-caption not-italic text-meta">
                {link.description}
              </span>
            </span>
            <span className="slug text-meta-dim flex-shrink-0">
              {link.href === "/settings/appearance" ? editionStatus : link.status}
            </span>
          </Link>
        ))}
      </nav>

      {/* Log out — plain text action */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-6 slug text-meta hover:text-vocl-like transition-colors disabled:opacity-50"
      >
        {isLoggingOut ? "Logging out…" : "Log out of your account"}
      </button>
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
