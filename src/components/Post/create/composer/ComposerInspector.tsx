"use client";

import {
  IconSend,
  IconClock,
  IconCalendar,
  IconAlertTriangle,
  IconWorld,
  IconUsers,
} from "@tabler/icons-react";
import { TagInput } from "../TagInput";
import type { ComposerState } from "./useComposerState";
import type { CommunitySummary } from "@/actions/communities";

interface ComposerInspectorProps {
  state: ComposerState;
  patch: (payload: Partial<ComposerState>) => void;
  mode: "create" | "edit";
  myCommunities: CommunitySummary[];
}

const SCHEDULE_PRESETS = [
  { label: "+1 week", days: 7 },
  { label: "+1 month", days: 30 },
  { label: "+6 months", days: 182 },
  { label: "+1 year", days: 365 },
];

export function ComposerInspector({
  state,
  patch,
  mode,
  myCommunities,
}: ComposerInspectorProps) {
  return (
    <div className="space-y-6 p-5">
      {/* Tags */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
        <TagInput tags={state.tags} onChange={(tags) => patch({ tags })} />
      </section>

      {/* Communities (create mode only — original behavior) */}
      {mode === "create" && myCommunities.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Also post to communities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {myCommunities.map((c) => {
              const selected = state.selectedCommunityIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    patch({
                      selectedCommunityIds: selected
                        ? state.selectedCommunityIds.filter((id) => id !== c.id)
                        : [...state.selectedCommunityIds, c.id],
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selected
                      ? "text-white"
                      : "bg-[var(--vocl-hover)] text-foreground/70 hover:bg-[var(--vocl-hover-strong)]"
                  }`}
                  style={selected ? { backgroundColor: "var(--vocl-primary)" } : undefined}
                >
                  /c/{c.slug}
                </button>
              );
            })}
          </div>
          {state.publishMode !== "now" && state.selectedCommunityIds.length > 0 && (
            <p className="text-xs text-foreground/50 mt-1.5">
              Will be cross-posted when this post publishes.
            </p>
          )}
        </section>
      )}

      {/* Publish mode (create mode only) */}
      {mode === "create" && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Publishing</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { m: "now" as const, icon: IconSend, label: "Now" },
              { m: "queue" as const, icon: IconClock, label: "Queue" },
              { m: "schedule" as const, icon: IconCalendar, label: "Schedule" },
            ].map(({ m, icon: Icon, label }) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  const patchObj: Partial<ComposerState> = { publishMode: m };
                  if (m === "schedule" && !state.scheduledDate) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    patchObj.scheduledDate = tomorrow.toISOString().split("T")[0];
                  }
                  patch(patchObj);
                }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  state.publishMode === m
                    ? "border-[var(--vocl-primary)] text-[var(--vocl-primary)]"
                    : "border-[var(--vocl-border)] text-foreground/60 hover:bg-[var(--vocl-hover)]"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {state.publishMode === "schedule" && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + preset.days);
                      patch({ scheduledDate: d.toISOString().split("T")[0] });
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--vocl-hover)] text-foreground/70 hover:bg-[var(--vocl-hover-strong)] transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-foreground/45 mb-1">Date</label>
                  <input
                    type="date"
                    value={state.scheduledDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => patch({ scheduledDate: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-[var(--vocl-hover)] border border-[var(--vocl-border)] text-foreground text-sm focus:outline-none focus:border-[var(--vocl-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/45 mb-1">Time</label>
                  <input
                    type="time"
                    value={state.scheduledTime}
                    onChange={(e) => patch({ scheduledTime: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-[var(--vocl-hover)] border border-[var(--vocl-border)] text-foreground text-sm focus:outline-none focus:border-[var(--vocl-primary)]"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sensitive toggle */}
      <section>
        <button
          type="button"
          role="switch"
          aria-checked={state.isSensitive}
          onClick={() => patch({ isSensitive: !state.isSensitive })}
          className="flex items-center gap-3 w-full text-left"
        >
          <div
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{
              backgroundColor: state.isSensitive
                ? "var(--vocl-like, #e0245e)"
                : "var(--vocl-border)",
            }}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                state.isSensitive ? "left-6" : "left-1"
              }`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-foreground text-sm font-medium">
              <IconAlertTriangle size={16} />
              Sensitive content
            </div>
            <p className="text-foreground/45 text-xs mt-0.5">
              Mark this post as containing mature content
            </p>
          </div>
        </button>
      </section>

      {/* Audience: who can see this post */}
      <section>
        {(() => {
          // Sensitive posts are NEVER public — the picker is forced to Members.
          const locked = state.isSensitive;
          const audience: "public" | "members" =
            !state.excludeFromPublic && !locked ? "public" : "members";
          const options: Array<{
            id: "public" | "members";
            icon: typeof IconWorld;
            label: string;
            desc: string;
          }> = [
            {
              id: "public",
              icon: IconWorld,
              label: "Public",
              desc: "Anyone on the web, including logged-out visitors",
            },
            {
              id: "members",
              icon: IconUsers,
              label: "Members",
              desc: "Only logged-in be.vocl members",
            },
          ];
          return (
            <>
              <h3 className="text-sm font-semibold text-foreground mb-2">Audience</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {options.map((opt) => {
                  const Icon = opt.icon;
                  const active = audience === opt.id;
                  const disabled = locked && opt.id === "public";
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => patch({ excludeFromPublic: opt.id === "members" })}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-colors ${
                        active
                          ? "border-[var(--vocl-primary)] text-[var(--vocl-primary)]"
                          : "border-[var(--vocl-border)] text-foreground/60 hover:bg-[var(--vocl-hover)]"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <Icon size={18} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-foreground/45 text-xs mt-1.5">
                {locked
                  ? "Sensitive posts are always Members-only — never shown to logged-out visitors."
                  : options.find((o) => o.id === audience)?.desc}
              </p>
            </>
          );
        })()}
      </section>

      {/* Content warning */}
      <section>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Content warning
        </label>
        <input
          type="text"
          value={state.contentWarning}
          onChange={(e) => patch({ contentWarning: e.target.value })}
          placeholder="e.g. spoilers, flashing images…"
          maxLength={200}
          className="w-full px-3 py-2 text-sm bg-[var(--vocl-hover)] rounded-xl border border-[var(--vocl-border)] text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-[var(--vocl-primary)]"
        />
        {state.contentWarning && (
          <span className="text-xs text-foreground/40 mt-1 block text-right">
            {state.contentWarning.length}/200
          </span>
        )}
      </section>
    </div>
  );
}
