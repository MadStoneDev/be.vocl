"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconCheck,
  IconTextSize,
  IconPalette,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";
import { updateAccentColor, getCurrentProfile } from "@/actions/profile";
import { ACCENTS, applyAccent } from "@/lib/accent";
import { EditionsSettings } from "@/components/settings/EditionsSettings";

type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

interface AppearanceSettings {
  theme: Theme;
  fontSize: FontSize;
  accentColor: string; // accent id from ACCENTS
  reducedMotion: boolean;
}

const defaultSettings: AppearanceSettings = {
  theme: "dark",
  fontSize: "medium",
  accentColor: "pink",
  reducedMotion: false,
};

const fontSizeOptions: { value: FontSize; label: string; sample: string }[] = [
  { value: "small", label: "Small", sample: "Aa" },
  { value: "medium", label: "Medium", sample: "Aa" },
  { value: "large", label: "Large", sample: "Aa" },
];

// Per-profile blog accent presets (saved to the user's profile, not localStorage).
// Drives --vocl-primary within the profile page (Tumblr-style theming).
const profileAccentPresets: { label: string; color: string }[] = [
  { label: "Brand Pink", color: "#F20D5E" },
  { label: "Rose", color: "#F43F5E" },
  { label: "Red", color: "#EF4444" },
  { label: "Orange", color: "#F97316" },
  { label: "Amber", color: "#F59E0B" },
  { label: "Yellow", color: "#EAB308" },
  { label: "Lime", color: "#84CC16" },
  { label: "Green", color: "#22C55E" },
  { label: "Emerald", color: "#10B981" },
  { label: "Brand Teal", color: "#5B9A8B" },
  { label: "Teal", color: "#14B8A6" },
  { label: "Cyan", color: "#06B6D4" },
  { label: "Sky", color: "#0EA5E9" },
  { label: "Blue", color: "#3B82F6" },
  { label: "Indigo", color: "#6366F1" },
  { label: "Violet", color: "#8B5CF6" },
  { label: "Purple", color: "#A855F7" },
  { label: "Fuchsia", color: "#D946EF" },
  { label: "Slate", color: "#64748B" },
];

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [profileAccent, setProfileAccent] = useState<string>("#F20D5E");
  const [savingAccent, setSavingAccent] = useState(false);
  useEffect(() => {
    // Load settings from localStorage and apply the saved UI accent.
    const saved = localStorage.getItem("appearance-settings");
    let next = defaultSettings;
    if (saved) {
      try {
        next = { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        // Use defaults
      }
    }
    setSettings(next);
    const opt = ACCENTS.find((a) => a.name === next.accentColor);
    applyAccent(opt ? opt.color : null);
  }, []);

  const selectAccent = (name: string) => {
    const opt = ACCENTS.find((a) => a.name === name);
    applyAccent(opt ? opt.color : null);
    updateSetting("accentColor", name);
  };

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
    toast.success("Appearance updated");
  };

  return (
    <div className="py-6">
      <title>Settings — Appearance | be.vocl</title>
      {/* Header */}
      <div className="mb-8 border-b border-rule pb-5">
        <Link href="/settings" className="slug text-meta hover:text-ink transition-colors">
          ← Settings
        </Link>
        <h1 className="type-display font-display text-ink mt-3">Appearance</h1>
      </div>

      {/* Editions — reading + profile edition pickers (33 editions; Plus paywall) */}
      <section className="mb-10">
        <h2 className="type-heading font-display text-ink mb-1">Editions</h2>
        <p className="editorial-caption not-italic text-meta mb-4">
          Each edition is a different printing of the same paper — colours, type
          and rules change; the layout never does.
        </p>
        <EditionsSettings />
      </section>

      {/* Font Size */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconTextSize size={18} className="text-meta" />
          <h2 className="type-heading font-display text-ink">Font Size</h2>
        </div>
        <p className="editorial-caption not-italic text-meta mb-4">
          Adjust text size for better readability
        </p>

        <div className="grid grid-cols-3 gap-3">
          {fontSizeOptions.map((option) => {
            const isSelected = settings.fontSize === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updateSetting("fontSize", option.value)}
                className={`relative flex flex-col items-center gap-2 p-4 border transition-colors ${
                  isSelected
                    ? "border-accent text-ink"
                    : "border-rule text-meta hover:text-ink"
                }`}
              >
                <span
                  className={`font-display ${
                    option.value === "small"
                      ? "text-base"
                      : option.value === "large"
                      ? "text-2xl"
                      : "text-xl"
                  } ${isSelected ? "text-accent" : "text-meta"}`}
                >
                  {option.sample}
                </span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Colour (site-wide UI accent, this device) */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconPalette size={18} className="text-meta" />
          <h2 className="type-heading font-display text-ink">Accent Colour</h2>
        </div>
        <p className="editorial-caption not-italic text-meta mb-4">
          Personalise buttons, links, and highlights across the app on this device.
        </p>

        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((option) => {
            const isSelected = settings.accentColor === option.name;

            return (
              <button
                key={option.name}
                onClick={() => selectAccent(option.name)}
                className={`relative w-12 h-12 transition-all ${
                  isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-accent" : ""
                }`}
                style={{ backgroundColor: option.color }}
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
          <IconPalette size={18} className="text-meta" />
          <h2 className="type-heading font-display text-ink">
            Profile Accent
          </h2>
        </div>
        <p className="editorial-caption not-italic text-meta mb-4">
          Theme your profile page. Buttons, links, and highlights on your profile
          use this colour for everyone who visits.
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
                className={`relative w-12 h-12 transition-all disabled:opacity-50 ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-offset-background ring-accent"
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
        </div>
      </section>

      {/* Reduced Motion */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-6 py-4 border-t border-b border-rule">
          <div>
            <h3 className="text-ink mb-1">Reduce motion</h3>
            <p className="editorial-caption not-italic text-meta">
              Minimise animations throughout the app
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.reducedMotion}
            onClick={() => updateSetting("reducedMotion", !settings.reducedMotion)}
            aria-label="Reduce motion"
            className={`relative inline-flex h-[22px] w-[44px] flex-shrink-0 items-center border transition-colors cursor-pointer ${
              settings.reducedMotion ? "border-accent bg-accent" : "border-rule bg-transparent"
            }`}
          >
            <span
              className={`absolute top-[3px] h-[14px] w-[14px] transition-all ${
                settings.reducedMotion ? "right-[3px] bg-white" : "left-[3px] bg-meta"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Note */}
      <p className="editorial-caption not-italic text-meta-dim">
        Font size and reduce motion are still in preview and may not affect all
        parts of the app yet.
      </p>
    </div>
  );
}
