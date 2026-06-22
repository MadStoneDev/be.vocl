"use client";

import { useRef, useState } from "react";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VoiceClipPlayerProps {
  src: string;
  /** Known duration in seconds (shown until metadata loads). */
  duration?: number | null;
  /** Visual theme: "light" for light card surfaces, "dark" for dark surfaces. */
  variant?: "light" | "dark";
  label?: string;
}

/**
 * Compact play/pause + progress audio player. Reuses the play/pause + progress
 * pattern from Post.tsx's CommentAudioPlayer, made theme-aware and shareable so
 * asks (light surface) and audio reactions (dark surface) can both use it.
 */
export function VoiceClipPlayer({
  src,
  duration,
  variant = "light",
  label,
}: VoiceClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState<number>(duration ?? 0);

  const isDark = variant === "dark";

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = Math.max(0, Math.min(1, pct)) * total;
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-full max-w-full ${
        isDark ? "bg-vocl-hover-strong" : "bg-neutral-200"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice clip" : "Play voice clip"}
        className="shrink-0 w-8 h-8 rounded-full bg-vocl-primary text-white flex items-center justify-center hover:bg-vocl-primary-hover transition-colors"
      >
        {playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
      </button>

      {label && (
        <span
          className={`text-xs font-medium shrink-0 ${
            isDark ? "text-foreground/70" : "text-neutral-600"
          }`}
        >
          {label}
        </span>
      )}

      <div
        onClick={handleSeek}
        className={`relative h-1.5 w-24 sm:w-32 rounded-full overflow-hidden cursor-pointer ${
          isDark ? "bg-vocl-border" : "bg-neutral-300"
        }`}
      >
        <div
          className="h-full bg-vocl-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span
        className={`text-xs font-mono shrink-0 tabular-nums ${
          isDark ? "text-foreground/60" : "text-neutral-500"
        }`}
      >
        {playing || current > 0 ? formatTime(current) : formatTime(total)}
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrent(a.currentTime);
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
      />
    </div>
  );
}
