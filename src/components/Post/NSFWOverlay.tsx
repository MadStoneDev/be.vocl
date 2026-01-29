"use client";

import { useState } from "react";
import { IconEyeOff, IconEye } from "@tabler/icons-react";

interface NSFWOverlayProps {
  onReveal: () => void;
}

// Creative messages for the NSFW overlay
const overlayMessages = [
  { title: "Behind the curtain...", subtitle: "This content is for mature audiences" },
  { title: "Spicy content ahead", subtitle: "Viewer discretion advised" },
  { title: "Not for the faint of heart", subtitle: "Mature content inside" },
  { title: "Adults only zone", subtitle: "This post contains sensitive material" },
  { title: "Peek at your own risk", subtitle: "Content may be unsuitable for some" },
];

export function NSFWOverlay({ onReveal }: NSFWOverlayProps) {
  const [isHovering, setIsHovering] = useState(false);

  // Pick a random message (consistent per render)
  const [message] = useState(() =>
    overlayMessages[Math.floor(Math.random() * overlayMessages.length)]
  );

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-linear-to-br from-vocl-surface-dark/95 via-background/98 to-vocl-surface-dark/95 backdrop-blur-xl"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.03) 10px,
            rgba(255,255,255,0.03) 20px
          )`
        }} />
      </div>

      {/* Content */}
      <div className="relative text-center px-6">
        {/* Icon */}
        <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-vocl-like/20 flex items-center justify-center transition-transform duration-300 ${isHovering ? 'scale-110' : ''}`}>
          <IconEyeOff size={32} className="text-vocl-like" />
        </div>

        {/* Message */}
        <h3 className="text-xl font-semibold text-foreground mb-1">
          {message.title}
        </h3>
        <p className="text-foreground/50 text-sm mb-6">
          {message.subtitle}
        </p>

        {/* Reveal button */}
        <button
          type="button"
          onClick={onReveal}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            isHovering
              ? 'bg-vocl-accent text-white shadow-lg shadow-vocl-accent/30 scale-105'
              : 'bg-white/10 text-foreground hover:bg-white/20'
          }`}
        >
          <IconEye size={20} />
          <span>Show content</span>
        </button>

        {/* Settings hint */}
        <p className="mt-4 text-foreground/30 text-xs">
          You can change this in your settings
        </p>
      </div>
    </div>
  );
}
