"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconX, IconKeyboard } from "@tabler/icons-react";
import { OPEN_CHAT_EVENT } from "./CommandPalette";
import { useModKey } from "@/lib/platform";

// "g then X" go-to targets. Messages opens the chat sidebar (an action, not a route).
const GOTO_ROUTES: Record<string, string> = {
  h: "/feed",
  e: "/explore",
  n: "/notifications",
  q: "/queue",
  c: "/communities",
};

const ACTIVE_CLASS = "ring-2 ring-vocl-primary ring-offset-2 ring-offset-background rounded-xl";

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
  const { mod } = useModKey();
  // "g" was pressed and we're waiting for the second key of a go-to chord.
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Ctrl/Cmd+J → new post. Handled before the typing/modifier guards so it
      // works everywhere, and preventDefault overrides the browser's native
      // "open Downloads" shortcut.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        router.push("/create");
        return;
      }

      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Second key of a "g then X" go-to chord.
      if (gPending.current) {
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        const key = e.key.toLowerCase();
        if (key === "m") {
          window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
          e.preventDefault();
          return;
        }
        const dest = GOTO_ROUTES[key];
        if (dest) {
          router.push(dest);
          e.preventDefault();
          return;
        }
        // Not a go-to key — fall through to the normal shortcuts below.
      }

      // Start a go-to chord.
      if (e.key.toLowerCase() === "g") {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, 1200);
        e.preventDefault();
        return;
      }

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
            <IconKeyboard size={20} className="text-vocl-primary" />
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
            { keys: ["G", "H"], label: "Go to Home" },
            { keys: ["G", "E"], label: "Go to Explore" },
            { keys: ["G", "N"], label: "Go to Notifications" },
            { keys: ["G", "M"], label: "Go to Messages" },
            { keys: ["G", "Q"], label: "Go to Queue" },
            { keys: ["G", "C"], label: "Go to Communities" },
            { keys: [mod, "K"], label: "Search / command palette" },
            { keys: [mod, "J"], label: "New post" },
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
