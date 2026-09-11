"use client";

import { useState, useEffect } from "react";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconSettings,
  IconLoader2,
  IconClock,
} from "@tabler/icons-react";

interface QueueSettings {
  enabled: boolean;
  paused: boolean;
  postsPerDay: number;
  windowStart: string;
  windowEnd: string;
}

interface QueueControlsProps {
  settings: QueueSettings;
  queueCount: number;
  /** True until the real settings/queue have loaded — stats show "—" meanwhile. */
  loading?: boolean;
  onUpdateSettings: (settings: Partial<QueueSettings>) => Promise<void>;
}

export function QueueControls({
  settings,
  queueCount,
  loading = false,
  onUpdateSettings,
}: QueueControlsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  // Re-sync the editable copy whenever the saved settings load/change, so the
  // dialog never shows (or saves) a stale default over the real saved value.
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleTogglePause = async () => {
    setIsUpdating(true);
    try {
      await onUpdateSettings({ paused: !settings.paused });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsUpdating(true);
    try {
      await onUpdateSettings({
        postsPerDay: localSettings.postsPerDay,
        windowStart: localSettings.windowStart,
        windowEnd: localSettings.windowEnd,
      });
      setShowSettings(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseSettings = () => {
    setLocalSettings(settings);
    setShowSettings(false);
  };

  // Calculate estimated time to empty queue
  const daysToEmpty = Math.ceil(queueCount / settings.postsPerDay);

  const btnLabel =
    "text-[11px] font-sans font-medium uppercase tracking-[0.16em]";

  return (
    <div className="flex flex-col gap-5">
      {/* Stats + controls strip — big Gloock numbers over mono labels, cells
          split by hairlines, seated on a top rule + 3px double bottom rule. */}
      <div className="flex items-stretch flex-wrap gap-y-4 border-t border-rule rule-double-b">
        <div className="py-4 pr-8 border-r border-rule">
          <div className="font-display text-3xl leading-none text-ink">
            {loading ? "—" : queueCount}
          </div>
          <div className="slug text-meta mt-2">
            {queueCount === 1 ? "Post in queue" : "Posts in queue"}
          </div>
        </div>
        <div className="py-4 px-8 border-r border-rule">
          <div className="font-display text-3xl leading-none text-ink">
            {loading ? "—" : settings.postsPerDay}
          </div>
          <div className="slug text-meta mt-2">Posts per day</div>
        </div>
        <div className="py-4 px-8 border-r border-rule">
          <div className="font-display text-3xl leading-none text-ink">
            {loading ? "—" : daysToEmpty === 0 ? "—" : `~${daysToEmpty}d`}
          </div>
          <div className="slug text-meta mt-2">Until empty</div>
        </div>

        {/* Status + actions */}
        <div className="py-4 sm:pl-8 sm:ml-auto flex items-center gap-5">
          <span className={`${btnLabel} text-meta inline-flex items-center gap-2`}>
            <span className={`w-1.5 h-1.5 ${settings.paused ? "bg-meta" : "bg-accent"}`} />
            {settings.paused ? "Paused" : "Press · Active"}
          </span>
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isUpdating}
            className={`inline-flex items-center gap-2 border border-foreground text-ink px-4 py-2 ${btnLabel} hover:bg-vocl-hover transition-colors disabled:opacity-50`}
          >
            {isUpdating ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : settings.paused ? (
              <IconPlayerPlay size={14} />
            ) : (
              <IconPlayerPause size={14} />
            )}
            <span>{settings.paused ? "Resume queue" : "Pause queue"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Schedule settings"
            className="text-meta hover:text-ink transition-colors"
          >
            <IconSettings size={20} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-5 border border-rule space-y-4">
          <h3 className="slug text-meta flex items-center gap-2">
            <IconClock size={14} />
            Schedule settings
          </h3>

          {/* Posts per day */}
          <div>
            <label className="block byline text-meta mb-2">Posts per day</label>
            <input
              type="number"
              min={1}
              max={50}
              value={localSettings.postsPerDay}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  postsPerDay: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 bg-transparent border border-rule text-ink focus:outline-none focus:border-accent"
            />
          </div>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block byline text-meta mb-2">Start time</label>
              <input
                type="time"
                value={localSettings.windowStart}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, windowStart: e.target.value }))
                }
                className="w-full px-3 py-2 bg-transparent border border-rule text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block byline text-meta mb-2">End time</label>
              <input
                type="time"
                value={localSettings.windowEnd}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, windowEnd: e.target.value }))
                }
                className="w-full px-3 py-2 bg-transparent border border-rule text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <p className="font-serif italic text-sm text-meta">
            Posts will be published evenly between {localSettings.windowStart} and{" "}
            {localSettings.windowEnd} in your timezone.
          </p>

          {/* Actions */}
          <div className="flex justify-end items-center gap-5 pt-4 rule-double">
            <button
              type="button"
              onClick={handleCloseSettings}
              disabled={isUpdating}
              className={`${btnLabel} text-meta hover:text-ink transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className={`inline-flex items-center gap-2 bg-accent text-white px-4 py-2 ${btnLabel} hover:opacity-[0.88] transition-opacity disabled:opacity-50`}
            >
              {isUpdating && <IconLoader2 size={14} className="animate-spin" />}
              Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
