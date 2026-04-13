"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconX, IconKeyboard } from "@tabler/icons-react";

const ACTIVE_CLASS = "ring-2 ring-vocl-accent ring-offset-2 ring-offset-background rounded-xl";

function getPostElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-post-id]"));
}

function clearActive() {
  document.querySelectorAll<HTMLElement>(`[data-post-id].${ACTIVE_CLASS.split(" ")[0]}`).forEach((el) => {
    ACTIVE_CLASS.split(" ").forEach((c) => el.classList.remove(c));
  });
}

function setActive(el: HTMLElement) {
  clearActive();
  ACTIVE_CLASS.split(" ").forEach((c) => el.classList.add(c));
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function findActiveIndex(posts: HTMLElement[]): number {
  const cls = ACTIVE_CLASS.split(" ")[0];
  return posts.findIndex((el) => el.classList.contains(cls));
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    function handler(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j": {
          const posts = getPostElements();
          if (posts.length === 0) return;
          const idx = findActiveIndex(posts);
          const next = posts[Math.min(posts.length - 1, idx + 1)] || posts[0];
          setActive(next);
          e.preventDefault();
          break;
        }
        case "k": {
          const posts = getPostElements();
          if (posts.length === 0) return;
          const idx = findActiveIndex(posts);
          const prev = posts[Math.max(0, idx - 1)] || posts[0];
          setActive(prev);
          e.preventDefault();
          break;
        }
        case "/": {
          if (pathname === "/search") {
            window.dispatchEvent(new CustomEvent("vocl:focus-search"));
          } else {
            router.push("/search");
          }
          e.preventDefault();
          break;
        }
        case "?": {
          setShowCheatSheet((v) => !v);
          e.preventDefault();
          break;
        }
        case "Escape": {
          if (showCheatSheet) {
            setShowCheatSheet(false);
            e.preventDefault();
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router, showCheatSheet]);

  if (!showCheatSheet) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={() => setShowCheatSheet(false)}
    >
      <div
        className="bg-vocl-surface-dark rounded-2xl p-6 max-w-md w-full border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconKeyboard size={20} className="text-vocl-accent" />
            <h2 className="text-lg font-semibold text-foreground">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={() => setShowCheatSheet(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>

        <ul className="space-y-2 text-sm">
          {[
            { keys: ["J"], label: "Next post" },
            { keys: ["K"], label: "Previous post" },
            { keys: ["/"], label: "Focus search" },
            { keys: ["?"], label: "Toggle this help" },
            { keys: ["Esc"], label: "Close dialog" },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between py-1">
              <span className="text-foreground/80">{row.label}</span>
              <div className="flex gap-1">
                {row.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-xs font-mono text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
