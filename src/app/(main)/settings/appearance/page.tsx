"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconCheck,
  IconTextSize,
  IconPalette,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";
import { updateAccentColor, getCurrentProfile } from "@/actions/profile";

type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";
type AccentColor = "purple" | "blue" | "green" | "orange" | "pink";

interface AppearanceSettings {
  theme: Theme;
  fontSize: FontSize;
  accentColor: AccentColor;
  reducedMotion: boolean;
}

const defaultSettings: AppearanceSettings = {
  theme: "dark",
  fontSize: "medium",
  accentColor: "purple",
  reducedMotion: false,
};

const themeOptions: { value: Theme; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconDeviceDesktop },
];

const fontSizeOptions: { value: FontSize; label: string; sample: string }[] = [
  { value: "small", label: "Small", sample: "Aa" },
  { value: "medium", label: "Medium", sample: "Aa" },
  { value: "large", label: "Large", sample: "Aa" },
];

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: "purple", label: "Purple", color: "bg-violet-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "green", label: "Green", color: "bg-emerald-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "pink", label: "Pink", color: "bg-pink-500" },
];

// Per-profile blog accent presets (saved to the user's profile, not localStorage).
// Drives --vocl-primary / --vocl-accent within the profile page (Tumblr-style theming).
const profileAccentPresets: { label: string; color: string }[] = [
  { label: "Brand Pink", color: "#F20D5E" },
  { label: "Teal", color: "#5B9A8B" },
  { label: "Violet", color: "#8B5CF6" },
  { label: "Blue", color: "#3B82F6" },
  { label: "Amber", color: "#F59E0B" },
  { label: "Rose", color: "#F43F5E" },
];

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [profileAccent, setProfileAccent] = useState<string>("#F20D5E");
  const [savingAccent, setSavingAccent] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("appearance-settings");
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // Use defaults
      }
    }
  }, []);

  useEffect(() => {
    // Load the saved per-profile accent color
    getCurrentProfile().then((result) => {
      if (result.success && result.profile?.accentColor) {
        setProfileAccent(result.profile.accentColor);
      }
    });
  }, []);

  const saveProfileAccent = async (color: string) => {
    setProfileAccent(color);
    setSavingAccent(true);
    const result = await updateAccentColor(color);
    setSavingAccent(false);
    if (result.success) {
      toast.success("Profile accent saved");
    } else {
      toast.error(result.error || "Failed to save accent");
    }
  };

  const updateSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("appearance-settings", JSON.stringify(newSettings));

    // Apply theme immediately
    if (key === "theme") {
      applyTheme(value as Theme);
    }

    toast.success("Appearance updated");
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
      root.classList.toggle("light", theme === "light");
    }
  };

  return (
    <div className="py-6">
      <title>Settings — Appearance | be.vocl</title>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-vocl-border pb-5">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-xl hover:bg-vocl-hover transition-colors"
        >
          <IconArrowLeft size={22} className="text-foreground/70" />
        </Link>
        <div>
          <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
            Settings
          </span>
          <h1 className="type-display font-display text-foreground">Appearance</h1>
        </div>
      </div>

      {/* Theme Selection */}
      <section className="mb-10">
        <h2 className="type-heading font-display text-foreground mb-1">Theme</h2>
        <p className="text-sm text-foreground/50 mb-4">
          Choose how be.vocl looks to you
        </p>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = settings.theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updateSetting("theme", option.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-vocl-accent bg-vocl-accent/10"
                    : "border-vocl-border bg-vocl-surface-dark hover:border-vocl-border"
                }`}
              >
                <Icon
                  size={28}
                  className={isSelected ? "text-vocl-accent" : "text-foreground/70"}
                />
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-vocl-accent" : "text-foreground/70"
                  }`}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-vocl-accent flex items-center justify-center">
                    <IconCheck size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Font Size */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconTextSize size={20} className="text-foreground/70" />
          <h2 className="type-heading font-display text-foreground">Font Size</h2>
        </div>
        <p className="text-sm text-foreground/50 mb-4">
          Adjust text size for better readability
        </p>

        <div className="grid grid-cols-3 gap-3">
          {fontSizeOptions.map((option) => {
            const isSelected = settings.fontSize === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updateSetting("fontSize", option.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-vocl-accent bg-vocl-accent/10"
                    : "border-vocl-border bg-vocl-surface-dark hover:border-vocl-border"
                }`}
              >
                <span
                  className={`font-medium ${
                    option.value === "small"
                      ? "text-sm"
                      : option.value === "large"
                      ? "text-xl"
                      : "text-base"
                  } ${isSelected ? "text-vocl-accent" : "text-foreground/70"}`}
                >
                  {option.sample}
                </span>
                <span
                  className={`text-sm ${
                    isSelected ? "text-vocl-accent" : "text-foreground/70"
                  }`}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-vocl-accent flex items-center justify-center">
                    <IconCheck size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Color */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconPalette size={20} className="text-foreground/70" />
          <h2 className="type-heading font-display text-foreground">Accent Color</h2>
        </div>
        <p className="text-sm text-foreground/50 mb-4">
          Personalize buttons and highlights
        </p>

        <div className="flex gap-3">
          {accentColors.map((option) => {
            const isSelected = settings.accentColor === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updateSetting("accentColor", option.value)}
                className={`relative w-12 h-12 rounded-full ${option.color} transition-all ${
                  isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""
                }`}
                aria-label={option.label}
                title={option.label}
              >
                {isSelected && (
                  <IconCheck size={20} className="absolute inset-0 m-auto text-white" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Profile Accent Color (Tumblr-style blog theming, saved to profile) */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconPalette size={20} className="text-foreground/70" />
          <h2 className="type-heading font-display text-foreground">
            Profile Accent
          </h2>
        </div>
        <p className="text-sm text-foreground/50 mb-4">
          Theme your profile page. Buttons, links, and highlights on your profile
          use this color for everyone who visits.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {profileAccentPresets.map((preset) => {
            const isSelected =
              profileAccent.toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.color}
                type="button"
                onClick={() => saveProfileAccent(preset.color)}
                disabled={savingAccent}
                className={`relative w-12 h-12 rounded-full transition-all disabled:opacity-50 ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                    : ""
                }`}
                style={{ backgroundColor: preset.color }}
                aria-label={preset.label}
                title={preset.label}
              >
                {isSelected && (
                  <IconCheck
                    size={20}
                    className="absolute inset-0 m-auto text-white"
                  />
                )}
              </button>
            );
          })}

          <label className="flex items-center gap-2 ml-1 cursor-pointer">
            <input
              type="color"
              value={profileAccent}
              onChange={(e) => saveProfileAccent(e.target.value)}
              disabled={savingAccent}
              className="w-12 h-12 rounded-full border-0 bg-transparent cursor-pointer p-0"
              aria-label="Custom accent color"
              title="Custom color"
            />
            <span className="text-sm text-foreground/60">Custom</span>
          </label>
        </div>
      </section>

      {/* Reduced Motion */}
      <section className="mb-8">
        <div className="flex items-center justify-between p-4 rounded-xl bg-vocl-surface-dark">
          <div>
            <h3 className="font-medium text-foreground">Reduce Motion</h3>
            <p className="text-sm text-foreground/50">
              Minimize animations throughout the app
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.reducedMotion}
            onClick={() => updateSetting("reducedMotion", !settings.reducedMotion)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.reducedMotion ? "bg-vocl-accent" : "bg-vocl-hover-strong"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.reducedMotion ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Note */}
      <p className="text-sm text-foreground/40">
        Some appearance settings are currently in preview and may not affect all
        parts of the app yet.
      </p>
    </div>
  );
}
