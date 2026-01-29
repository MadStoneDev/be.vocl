"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconBell,
  IconMail,
  IconHeart,
  IconMessage,
  IconRefresh,
  IconUserPlus,
  IconAt,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";

interface NotificationSettings {
  emailLikes: boolean;
  emailComments: boolean;
  emailReblogs: boolean;
  emailFollows: boolean;
  emailMentions: boolean;
  emailMessages: boolean;
  pushLikes: boolean;
  pushComments: boolean;
  pushReblogs: boolean;
  pushFollows: boolean;
  pushMentions: boolean;
  pushMessages: boolean;
}

const defaultSettings: NotificationSettings = {
  emailLikes: false,
  emailComments: true,
  emailReblogs: false,
  emailFollows: true,
  emailMentions: true,
  emailMessages: true,
  pushLikes: true,
  pushComments: true,
  pushReblogs: true,
  pushFollows: true,
  pushMentions: true,
  pushMessages: true,
};

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-vocl-accent" : "bg-white/20"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

interface NotificationRowProps {
  icon: typeof IconHeart;
  title: string;
  description: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  onEmailChange: (enabled: boolean) => void;
  onPushChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function NotificationRow({
  icon: Icon,
  title,
  description,
  emailEnabled,
  pushEnabled,
  onEmailChange,
  onPushChange,
  disabled,
}: NotificationRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={20} className="text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-foreground/50">{description}</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex flex-col items-center gap-1">
          <Toggle enabled={emailEnabled} onChange={onEmailChange} disabled={disabled} />
          <span className="text-xs text-foreground/40">Email</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Toggle enabled={pushEnabled} onChange={onPushChange} disabled={disabled} />
          <span className="text-xs text-foreground/40">Push</span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("notification-settings");
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // Use defaults
      }
    }
    setIsLoading(false);
  }, []);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaving(true);

    // Save to localStorage
    localStorage.setItem("notification-settings", JSON.stringify(newSettings));

    // Simulate save delay
    setTimeout(() => {
      setIsSaving(false);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <IconArrowLeft size={24} className="text-foreground/70" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
        {isSaving && (
          <IconLoader2 size={20} className="animate-spin text-foreground/50" />
        )}
      </div>

      {/* Description */}
      <p className="text-foreground/60 mb-6">
        Choose how you want to be notified about activity on your account.
      </p>

      {/* Email/Push Headers */}
      <div className="flex items-center justify-end gap-4 mb-2 pr-1">
        <div className="flex items-center gap-1 text-sm text-foreground/50">
          <IconMail size={16} />
          <span>Email</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-foreground/50">
          <IconBell size={16} />
          <span>Push</span>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-xl bg-vocl-surface-dark p-4">
        <NotificationRow
          icon={IconHeart}
          title="Likes"
          description="When someone likes your post"
          emailEnabled={settings.emailLikes}
          pushEnabled={settings.pushLikes}
          onEmailChange={(v) => updateSetting("emailLikes", v)}
          onPushChange={(v) => updateSetting("pushLikes", v)}
        />

        <NotificationRow
          icon={IconMessage}
          title="Comments"
          description="When someone comments on your post"
          emailEnabled={settings.emailComments}
          pushEnabled={settings.pushComments}
          onEmailChange={(v) => updateSetting("emailComments", v)}
          onPushChange={(v) => updateSetting("pushComments", v)}
        />

        <NotificationRow
          icon={IconRefresh}
          title="Reblogs"
          description="When someone reblogs your post"
          emailEnabled={settings.emailReblogs}
          pushEnabled={settings.pushReblogs}
          onEmailChange={(v) => updateSetting("emailReblogs", v)}
          onPushChange={(v) => updateSetting("pushReblogs", v)}
        />

        <NotificationRow
          icon={IconUserPlus}
          title="New Followers"
          description="When someone follows you"
          emailEnabled={settings.emailFollows}
          pushEnabled={settings.pushFollows}
          onEmailChange={(v) => updateSetting("emailFollows", v)}
          onPushChange={(v) => updateSetting("pushFollows", v)}
        />

        <NotificationRow
          icon={IconAt}
          title="Mentions"
          description="When someone mentions you in a post"
          emailEnabled={settings.emailMentions}
          pushEnabled={settings.pushMentions}
          onEmailChange={(v) => updateSetting("emailMentions", v)}
          onPushChange={(v) => updateSetting("pushMentions", v)}
        />

        <NotificationRow
          icon={IconMail}
          title="Direct Messages"
          description="When you receive a new message"
          emailEnabled={settings.emailMessages}
          pushEnabled={settings.pushMessages}
          onEmailChange={(v) => updateSetting("emailMessages", v)}
          onPushChange={(v) => updateSetting("pushMessages", v)}
        />
      </div>

      {/* Note */}
      <p className="mt-4 text-sm text-foreground/40">
        Push notifications require browser permissions. Email notifications are
        sent to your registered email address.
      </p>
    </div>
  );
}
