"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconHeart,
  IconMessage,
  IconRefresh,
  IconUserPlus,
  IconAt,
  IconMail,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
  type EmailFrequency,
} from "@/actions/notification-settings";

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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
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
  onEmailChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function NotificationRow({
  icon: Icon,
  title,
  description,
  emailEnabled,
  onEmailChange,
  disabled,
}: NotificationRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-foreground/50">{description}</p>
      </div>
      <div className="shrink-0">
        <Toggle enabled={emailEnabled} onChange={onEmailChange} disabled={disabled} />
      </div>
    </div>
  );
}

const frequencyOptions: { value: EmailFrequency; label: string; description: string }[] = [
  {
    value: "immediate",
    label: "Immediate",
    description: "Get notified right away",
  },
  {
    value: "daily",
    label: "Daily Digest",
    description: "One summary email per day",
  },
  {
    value: "off",
    label: "Off",
    description: "No email notifications",
  },
];

export default function NotificationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailLikes: false,
    emailComments: true,
    emailReblogs: false,
    emailFollows: true,
    emailMentions: true,
    emailMessages: true,
    emailFrequency: "immediate",
  });

  useEffect(() => {
    const loadSettings = async () => {
      const result = await getNotificationSettings();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const updateSetting = async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaving(true);

    const result = await updateNotificationSettings({ [key]: value });
    if (!result.success) {
      // Revert on error
      setSettings(settings);
      toast.error(result.error || "Failed to save");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  const isEmailDisabled = settings.emailFrequency === "off";

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
          <h1 className="text-2xl font-bold text-foreground">Email Notifications</h1>
        </div>
        {isSaving && (
          <IconLoader2 size={20} className="animate-spin text-foreground/50" />
        )}
      </div>

      {/* Description */}
      <p className="text-foreground/60 mb-6">
        Choose which email notifications you want to receive.
      </p>

      {/* Email Frequency */}
      <div className="rounded-xl bg-vocl-surface-dark p-4 mb-6">
        <h2 className="font-semibold text-foreground mb-1">Email Frequency</h2>
        <p className="text-sm text-foreground/50 mb-4">
          How often do you want to receive notification emails?
        </p>
        <div className="space-y-2">
          {frequencyOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                settings.emailFrequency === option.value
                  ? "bg-vocl-accent/20 border border-vocl-accent/40"
                  : "bg-white/5 border border-transparent hover:bg-white/10"
              }`}
            >
              <input
                type="radio"
                name="emailFrequency"
                value={option.value}
                checked={settings.emailFrequency === option.value}
                onChange={() => updateSetting("emailFrequency", option.value)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  settings.emailFrequency === option.value
                    ? "border-vocl-accent"
                    : "border-white/30"
                }`}
              >
                {settings.emailFrequency === option.value && (
                  <div className="w-2 h-2 rounded-full bg-vocl-accent" />
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-foreground">{option.label}</span>
                <p className="text-sm text-foreground/50">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notification Types */}
      <div className={`rounded-xl bg-vocl-surface-dark p-4 ${isEmailDisabled ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Notification Types</h2>
          <div className="flex items-center gap-1 text-sm text-foreground/50">
            <IconMail size={16} />
            <span>Email</span>
          </div>
        </div>

        <NotificationRow
          icon={IconHeart}
          title="Likes"
          description="When someone likes your post"
          emailEnabled={settings.emailLikes}
          onEmailChange={(v) => updateSetting("emailLikes", v)}
          disabled={isEmailDisabled}
        />

        <NotificationRow
          icon={IconMessage}
          title="Comments"
          description="When someone comments on your post"
          emailEnabled={settings.emailComments}
          onEmailChange={(v) => updateSetting("emailComments", v)}
          disabled={isEmailDisabled}
        />

        <NotificationRow
          icon={IconRefresh}
          title="Reblogs"
          description="When someone reblogs your post"
          emailEnabled={settings.emailReblogs}
          onEmailChange={(v) => updateSetting("emailReblogs", v)}
          disabled={isEmailDisabled}
        />

        <NotificationRow
          icon={IconUserPlus}
          title="New Followers"
          description="When someone follows you"
          emailEnabled={settings.emailFollows}
          onEmailChange={(v) => updateSetting("emailFollows", v)}
          disabled={isEmailDisabled}
        />

        <NotificationRow
          icon={IconAt}
          title="Mentions"
          description="When someone mentions you in a post or comment"
          emailEnabled={settings.emailMentions}
          onEmailChange={(v) => updateSetting("emailMentions", v)}
          disabled={isEmailDisabled}
        />

        <NotificationRow
          icon={IconMail}
          title="Direct Messages"
          description="When you receive a new message (max 1 email per hour per person)"
          emailEnabled={settings.emailMessages}
          onEmailChange={(v) => updateSetting("emailMessages", v)}
          disabled={isEmailDisabled}
        />
      </div>

      {/* Note */}
      <p className="mt-4 text-sm text-foreground/40">
        {settings.emailFrequency === "daily"
          ? "Daily digest emails are sent at 6 PM in your timezone."
          : settings.emailFrequency === "off"
          ? "You won't receive any email notifications."
          : "Message notifications are limited to one email per hour per sender to reduce noise."}
      </p>
    </div>
  );
}
