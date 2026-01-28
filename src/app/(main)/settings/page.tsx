"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  IconUser,
  IconLock,
  IconBell,
  IconEye,
  IconPalette,
  IconChevronRight,
  IconCheck,
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
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("email_changed") === "true") {
      toast.success("Email updated successfully!");
      setShowSuccess(true);
    }
  }, [searchParams]);

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
