"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OPEN_COMMAND_PALETTE_EVENT } from "./commandPaletteEvents";

// The palette (and its framer-motion dependency) only loads the first time the
// user reaches for it — ⌘/Ctrl+K or the sidebar "Search" — instead of shipping
// in every authenticated page's base bundle.
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);

interface CommandPaletteHostProps {
  username?: string;
  onOpenChat?: () => void;
}

export function CommandPaletteHost({ username, onOpenChat }: CommandPaletteHostProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Once mounted, CommandPalette owns its own ⌘K / event handling.
    if (active) return;
    const trigger = () => setActive(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setActive(true);
      }
    };
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, trigger);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, trigger);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (!active) return null;
  return <CommandPalette username={username} onOpenChat={onOpenChat} initiallyOpen />;
}
