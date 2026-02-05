"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IconUser,
  IconLock,
  IconBell,
  IconEye,
  IconPalette,
  IconChevronRight,
  IconCheck,
  IconLogout,
  IconTicket,
} from "@tabler/icons-react";
import Link from "next/link";
import { toast, LoadingSpinner } from "@/components/ui";

const settingsLinks = [
  {
    href: "/settings/profile",
    icon: IconUser,
    title: "Profile",
    description: "Edit your profile, bio, and links",
  },
  {
    href: "/settings/password",
    icon: IconLock,
    title: "Password & Security",
    description: "Update password and security settings",
  },
  {
    href: "/settings/notifications",
    icon: IconBell,
    title: "Notifications",
    description: "Configure email and push notifications",
  },
  {
    href: "/settings/privacy",
    icon: IconEye,
    title: "Privacy",
    description: "Control who can see your content",
  },
  {
    href: "/settings/appearance",
    icon: IconPalette,
    title: "Appearance",
    description: "Theme and display preferences",
  },
  {
    href: "/settings/invites",
    icon: IconTicket,
    title: "Invite Codes",
    description: "Generate codes to invite friends",
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
    <div className="py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      {showSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-vocl-accent/10 border border-vocl-accent/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vocl-accent/20 flex items-center justify-center">
            <IconCheck className="w-4 h-4 text-vocl-accent" />
          </div>
          <p className="text-sm text-foreground">Your email has been updated successfully.</p>
        </div>
      )}

      <div className="space-y-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 p-4 rounded-xl bg-vocl-surface-dark hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <link.icon className="w-5 h-5 text-foreground/70" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{link.title}</h3>
              <p className="text-sm text-foreground/50">{link.description}</p>
            </div>
            <IconChevronRight className="w-5 h-5 text-foreground/30" />
          </Link>
        ))}
      </div>

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-4 p-4 w-full rounded-xl bg-vocl-like/10 hover:bg-vocl-like/20 transition-colors disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-vocl-like/20 flex items-center justify-center">
            <IconLogout className="w-5 h-5 text-vocl-like" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-medium text-vocl-like">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </h3>
            <p className="text-sm text-vocl-like/70">Sign out of your account</p>
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
