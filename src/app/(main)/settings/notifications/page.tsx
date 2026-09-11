"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconHeart,
  IconAt,
  IconMail,
  IconMessageCircle,
  IconRefresh,
  IconUserPlus,
  IconMessage,
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
      className={`relative inline-flex h-[22px] w-[44px] shrink-0 border transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "border-accent bg-accent" : "border-rule bg-transparent"}`}
    >
      <span
        className={`absolute top-[3px] h-[14px] w-[14px] transition-all ${
          enabled ? "right-[3px] bg-white" : "left-[3px] bg-meta"
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
    <div className="flex items-start gap-4 py-4 border-b border-vocl-border last:border-0">
      <div className="w-10 h-10  bg-vocl-hover flex items-center justify-center shrink-0">
        <Icon size={20} className="text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-meta">{description}</p>
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
        <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  const isEmailDisabled = settings.emailFrequency === "off";

  return (
    <div className="py-6">
      <title>Settings — Notifications | be.vocl</title>
      {/* Header */}
      <div className="mb-8 border-b border-rule pb-5">
        <Link
          href="/settings"
          className="slug text-meta hover:text-accent transition-colors"
        >
          ← Settings
        </Link>
        <div className="mt-3">
          <span className="kicker kicker-accent">
            Settings
          </span>
          <h1 className="type-display font-display text-ink">Email Notifications</h1>
          <p className="type-body text-meta mt-1">
            Choose which email notifications you want to receive.
          </p>
        </div>
        {isSaving && (
          <IconLoader2 size={20} className="animate-spin text-meta shrink-0" />
        )}
      </div>

      {/* Email Frequency */}
      <div className="border border-rule p-4 mb-6">
        <h2 className="type-heading font-display text-ink mb-1">Email Frequency</h2>
        <p className="text-sm text-meta mb-4">
          How often do you want to receive notification emails?
        </p>
        <div className="space-y-2">
          {frequencyOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3  cursor-pointer transition-colors ${
                settings.emailFrequency === option.value
                  ? "bg-accent/20 border border-vocl-primary/40"
                  : "bg-vocl-hover border border-transparent hover:bg-vocl-hover-strong"
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
                className={`w-3.5 h-3.5 border flex items-center justify-center ${
                  settings.emailFrequency === option.value
                    ? "border-accent"
                    : "border-rule"
                }`}
              >
                {settings.emailFrequency === option.value && (
                  <div className="w-2 h-2 bg-accent" />
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-foreground">{option.label}</span>
                <p className="text-sm text-meta">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notification Types */}
      <div className={`border border-rule p-4 ${isEmailDisabled ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="type-heading font-display text-ink">Notification Types</h2>
          <div className="flex items-center gap-1 text-sm text-meta">
            <IconMail size={16} />
            <span>Email</span>
          </div>
        </div>

        <NotificationRow
          icon={IconAt}
          title="Mentions"
          description="When someone mentions you in a post or comment"
          emailEnabled={settings.emailMentions}
          onEmailChange={(v) => updateSetting("emailMentions", v)}
          disabled={isEmailDisabled}
        />
        <NotificationRow
          icon={IconMessageCircle}
          title="Comments"
          description="When someone comments on your post"
          emailEnabled={settings.emailComments}
          onEmailChange={(v) => updateSetting("emailComments", v)}
          disabled={isEmailDisabled}
        />
        <NotificationRow
          icon={IconUserPlus}
          title="Follows"
          description="When someone starts following you"
          emailEnabled={settings.emailFollows}
          onEmailChange={(v) => updateSetting("emailFollows", v)}
          disabled={isEmailDisabled}
        />
        <NotificationRow
          icon={IconMessage}
          title="Messages"
          description="When someone sends you a direct message"
          emailEnabled={settings.emailMessages}
          onEmailChange={(v) => updateSetting("emailMessages", v)}
          disabled={isEmailDisabled}
        />
        <NotificationRow
          icon={IconHeart}
          title="Likes"
          description="When someone likes your post"
          emailEnabled={settings.emailLikes}
          onEmailChange={(v) => updateSetting("emailLikes", v)}
          disabled={isEmailDisabled}
        />
        <NotificationRow
          icon={IconRefresh}
          title="Echoes"
          description="When someone reblogs (echoes) your post"
          emailEnabled={settings.emailReblogs}
          onEmailChange={(v) => updateSetting("emailReblogs", v)}
          disabled={isEmailDisabled}
        />

        <p className="text-xs text-foreground/45 mt-4 leading-relaxed">
          Asks currently notify you in-app only.
        </p>
      </div>

      {/* Note */}
      <p className="mt-4 text-sm text-meta-dim">
        {settings.emailFrequency === "daily" ? (
          <>
            Daily digest emails are sent at 6 PM in your{" "}
            <Link
              href="/settings/profile#timezone"
              className="text-vocl-primary hover:underline"
            >
              timezone
            </Link>
            .
          </>
        ) : settings.emailFrequency === "off" ? (
          "You won't receive any email notifications."
        ) : (
          "Message notifications are limited to one email per hour per sender to reduce noise."
        )}
      </p>
    </div>
  );
}
