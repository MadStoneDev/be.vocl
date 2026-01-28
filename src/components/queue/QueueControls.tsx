"use client";

import { useState } from "react";
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
  onUpdateSettings: (settings: Partial<QueueSettings>) => Promise<void>;
}

export function QueueControls({
  settings,
  queueCount,
  onUpdateSettings,
}: QueueControlsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

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

  // Calculate estimated time to empty queue
  const daysToEmpty = Math.ceil(queueCount / settings.postsPerDay);

  return (
    <div className="space-y-4">
      {/* Main controls */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
        <div className="flex items-center gap-4">
          {/* Pause/Resume button */}
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              settings.paused
                ? "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
                : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
            }`}
          >
            {isUpdating ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : settings.paused ? (
              <IconPlayerPlay size={18} />
            ) : (
              <IconPlayerPause size={18} />
            )}
            <span>{settings.paused ? "Resume queue" : "Pause queue"}</span>
          </button>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <div
              className={`w-2 h-2 rounded-full ${
                settings.paused ? "bg-amber-500" : "bg-green-500"
              }`}
            />
            <span>{settings.paused ? "Paused" : "Active"}</span>
          </div>
        </div>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <IconSettings size={20} />
        </button>
      </div>

      {/* Queue info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <p className="text-2xl font-bold text-foreground">{queueCount}</p>
          <p className="text-sm text-foreground/50">Posts in queue</p>
        </div>
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <p className="text-2xl font-bold text-foreground">
            {settings.postsPerDay}
          </p>
          <p className="text-sm text-foreground/50">Posts per day</p>
        </div>
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <p className="text-2xl font-bold text-foreground">
            {daysToEmpty === 0 ? "-" : `~${daysToEmpty}d`}
          </p>
          <p className="text-sm text-foreground/50">Until empty</p>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5 space-y-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <IconClock size={18} />
            Queue Settings
          </h3>

          {/* Posts per day */}
          <div>
            <label className="block text-sm text-foreground/60 mb-2">
              Posts per day
            </label>
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
              className="w-full px-4 py-2 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
            />
          </div>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground/60 mb-2">
                Start time
              </label>
              <input
                type="time"
                value={localSettings.windowStart}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    windowStart: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-2">
                End time
              </label>
              <input
                type="time"
                value={localSettings.windowEnd}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    windowEnd: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
              />
            </div>
          </div>

          <p className="text-xs text-foreground/40">
            Posts will be published evenly between {localSettings.windowStart}{" "}
            and {localSettings.windowEnd} in your timezone.
          </p>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdating && <IconLoader2 size={16} className="animate-spin" />}
              Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
