"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { PICKER_EDITIONS, EDITIONS_PAYWALL_ENABLED } from "@/editions/registry";
import type { Edition } from "@/editions/types";
import {
  applyReadingEdition,
  applyPaperTexture,
  isDarkEdition,
} from "@/editions/client";
import {
  getMyAppearance,
  updateReadingEdition,
  updateProfileEdition,
  updatePaperTexture,
  updateAlwaysReadInMyEdition,
} from "@/actions/editions";
import { EditionSpecimen } from "@/components/settings/EditionSpecimen";
import { PlusUpgradeSheet } from "@/components/payments/PlusUpgradeSheet";
import { toast } from "@/components/ui";

type FilterKey = "all" | "free" | "house" | "genre" | "scene" | "communities";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "house", label: "House" },
  { key: "genre", label: "Genre" },
  { key: "scene", label: "Scene" },
  { key: "communities", label: "Communities" },
];

function matchesFilter(ed: Edition, f: FilterKey): boolean {
  switch (f) {
    case "all":
      return true;
    case "free":
      return ed.tier === "free";
    case "house":
      return ed.group === "house";
    case "genre":
      return ed.group === "genre";
    case "scene":
      return ed.group === "scene";
    case "communities":
      return ed.group === "audience" || ed.group === "community";
  }
}

/** Requires Plus to Apply? Always false while the paywall is off (everything free). */
function isGated(ed: Edition): boolean {
  return EDITIONS_PAYWALL_ENABLED && ed.tier === "plus";
}

interface Viewer {
  name?: string | null;
  handle?: string | null;
}

function EditionTile({
  ed,
  variant,
  viewer,
  selected,
  onSelect,
}: {
  ed: Edition;
  variant: "feed" | "profile";
  viewer: Viewer;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(ed.id)}
      aria-pressed={selected}
      title={ed.description}
      className={`group text-left border transition-colors ${
        selected ? "border-accent" : "border-rule hover:border-meta"
      }`}
    >
      {/* Fixed window onto the top-left of the (wider/taller) page mock — the
          specimen overflows right (~horizontal middle) and bottom, clipped here. */}
      <div
        className={`overflow-hidden border-b ${
          selected ? "border-accent" : "border-rule"
        }`}
        style={{ height: 168 }}
      >
        <EditionSpecimen edition={ed} variant={variant} viewer={viewer} />
      </div>
      {/* Caption row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span
          className="truncate text-ink"
          style={{ fontFamily: ed.fonts.nameplate, fontSize: "19px" }}
        >
          {ed.name}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {EDITIONS_PAYWALL_ENABLED && ed.tier === "plus" && (
            <span className="stamp-21">PLUS</span>
          )}
          <span
            className="text-base leading-none"
            style={{ color: selected ? "var(--accent)" : "var(--meta)" }}
          >
            {selected ? "●" : "○"}
          </span>
        </span>
      </div>
    </button>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (f: FilterKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 border-b border-rule pb-2">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className="section-tab"
          data-active={value === f.key}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function Gallery({
  editions,
  variant,
  viewer,
  selectedId,
  onSelect,
}: {
  editions: Edition[];
  variant: "feed" | "profile";
  viewer: Viewer;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      {editions.map((ed) => (
        <EditionTile
          key={ed.id}
          ed={ed}
          variant={variant}
          viewer={viewer}
          selected={selectedId === ed.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function EditionsSettings() {
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isPlus, setIsPlus] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({});

  const [savedReading, setSavedReading] = useState("late-edition");
  const [savedProfile, setSavedProfile] = useState("late-edition");
  const [pendingReading, setPendingReading] = useState("late-edition");
  const [pendingProfile, setPendingProfile] = useState("late-edition");

  const [paperTexture, setPaperTextureState] = useState(true);
  const [alwaysMine, setAlwaysMine] = useState(false);

  const [readingFilter, setReadingFilter] = useState<FilterKey>("all");
  const [profileFilter, setProfileFilter] = useState<FilterKey>("all");

  const [upgrade, setUpgrade] = useState<{ id: string; target: "reading" | "profile" } | null>(null);
  const [savingReading, setSavingReading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    getMyAppearance().then((res) => {
      if (res.success && res.appearance) {
        const a = res.appearance;
        setIsPlus(a.isPlus);
        setViewer({ name: a.displayName, handle: a.username });
        setSavedReading(a.readingEdition);
        setSavedProfile(a.profileEdition);
        setPendingReading(a.readingEdition);
        setPendingProfile(a.profileEdition);
        setPaperTextureState(a.paperTexture);
        setAlwaysMine(a.alwaysReadInMyEdition);
      }
      setLoading(false);
    });
  }, []);

  const readingList = useMemo(
    () => PICKER_EDITIONS.filter((e) => matchesFilter(e, readingFilter)),
    [readingFilter],
  );
  const profileList = useMemo(
    () => PICKER_EDITIONS.filter((e) => matchesFilter(e, profileFilter)),
    [profileFilter],
  );

  const applyReading = async (id: string) => {
    setSavingReading(true);
    const res = await updateReadingEdition(id);
    setSavingReading(false);
    if (res.plusRequired) {
      setUpgrade({ id, target: "reading" });
      return;
    }
    if (!res.success) {
      toast.error(res.error || "Could not apply edition");
      return;
    }
    applyReadingEdition(id);
    setTheme(isDarkEdition(id) ? "dark" : "light");
    setSavedReading(id);
    toast.success("Reading edition applied");
  };

  const applyProfile = async (id: string) => {
    setSavingProfile(true);
    const res = await updateProfileEdition(id);
    setSavingProfile(false);
    if (res.plusRequired) {
      setUpgrade({ id, target: "profile" });
      return;
    }
    if (!res.success) {
      toast.error(res.error || "Could not apply edition");
      return;
    }
    setSavedProfile(id);
    toast.success("Profile edition applied");
  };

  const onUpgraded = async () => {
    const target = upgrade?.target;
    const id = upgrade?.id;
    setUpgrade(null);
    const res = await getMyAppearance();
    if (res.success && res.appearance) setIsPlus(res.appearance.isPlus);
    if (id && target === "reading") await applyReading(id);
    if (id && target === "profile") await applyProfile(id);
  };

  const toggleTexture = async (on: boolean) => {
    setPaperTextureState(on);
    applyPaperTexture(on);
    const res = await updatePaperTexture(on);
    if (!res.success) toast.error("Could not save texture setting");
  };

  const toggleAlwaysMine = async (on: boolean) => {
    setAlwaysMine(on);
    const res = await updateAlwaysReadInMyEdition(on);
    if (!res.success) toast.error("Could not save setting");
  };

  if (loading) {
    return <p className="editorial-caption not-italic text-meta">Loading editions…</p>;
  }

  return (
    <div>
      {/* Section A — reading edition */}
      <section className="mb-10">
        <span className="kicker text-meta">Reading edition</span>
        <p className="editorial-caption not-italic text-meta mt-1 mb-4">
          How be.vocl looks to you — each tile is a live sample of your feed in
          that edition.
        </p>
        <FilterTabs value={readingFilter} onChange={setReadingFilter} />
        <Gallery
          editions={readingList}
          variant="feed"
          viewer={viewer}
          selectedId={pendingReading}
          onSelect={setPendingReading}
        />
        <ApplyBar
          pending={pendingReading}
          saved={savedReading}
          entitled={isPlus}
          saving={savingReading}
          onApply={() => applyReading(pendingReading)}
        />

        <div className="mt-6">
          <ToggleRow label="Paper texture" checked={paperTexture} onChange={toggleTexture} />
          <ToggleRow
            label="Always read in my edition"
            help="Show everyone's profile in your reading edition instead of theirs."
            checked={alwaysMine}
            onChange={toggleAlwaysMine}
          />
        </div>
      </section>

      <div className="rule-double-b mb-10" />

      {/* Section B — profile edition */}
      <section className="mb-4">
        <span className="kicker text-meta">Profile edition</span>
        <p className="editorial-caption not-italic text-meta mt-1 mb-4">
          How your public profile looks to visitors — each tile shows your
          profile in that edition. Your sidebar and settings are unaffected.
        </p>
        <button
          type="button"
          className="slug text-accent-text hover:text-ink transition-colors mb-3"
          onClick={() => setPendingProfile(pendingReading)}
        >
          Same as my reading edition
        </button>
        <FilterTabs value={profileFilter} onChange={setProfileFilter} />
        <Gallery
          editions={profileList}
          variant="profile"
          viewer={viewer}
          selectedId={pendingProfile}
          onSelect={setPendingProfile}
        />
        <ApplyBar
          pending={pendingProfile}
          saved={savedProfile}
          entitled={isPlus}
          saving={savingProfile}
          onApply={() => applyProfile(pendingProfile)}
        />
      </section>

      {upgrade && (
        <PlusUpgradeSheet
          isOpen
          editionId={upgrade.id}
          onClose={() => setUpgrade(null)}
          onSuccess={onUpgraded}
        />
      )}
    </div>
  );
}

function ApplyBar({
  pending,
  saved,
  entitled,
  saving,
  onApply,
}: {
  pending: string;
  saved: string;
  entitled: boolean;
  saving: boolean;
  onApply: () => void;
}) {
  const ed = PICKER_EDITIONS.find((e) => e.id === pending);
  const gated = !!ed && isGated(ed) && !entitled;
  const changed = pending !== saved;
  const disabled = saving || (!changed && !gated);
  return (
    <button
      type="button"
      onClick={onApply}
      disabled={disabled}
      className="mt-4 px-5 py-2.5 bg-accent text-on-accent byline hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {saving ? "SAVING…" : gated ? "UPGRADE TO APPLY" : "APPLY EDITION"}
    </button>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-t border-rule">
      <div>
        <h3 className="text-ink mb-1">{label}</h3>
        {help && <p className="editorial-caption not-italic text-meta">{help}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-[22px] w-[44px] shrink-0 items-center border transition-colors cursor-pointer ${
          checked ? "border-accent bg-accent" : "border-rule bg-transparent"
        }`}
      >
        <span
          className={`absolute top-[3px] h-[14px] w-[14px] transition-all ${
            checked ? "right-[3px] bg-white" : "left-[3px] bg-meta"
          }`}
        />
      </button>
    </div>
  );
}
