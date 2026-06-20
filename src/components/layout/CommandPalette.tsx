"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  IconHome,
  IconCompass,
  IconSearch,
  IconBell,
  IconMessage,
  IconBookmark,
  IconFileText,
  IconStack2,
  IconUsersGroup,
  IconSettings,
  IconUser,
  IconPencilPlus,
  IconSun,
  IconMoon,
  IconCommand,
  IconCornerDownLeft,
  IconLoader2,
} from "@tabler/icons-react";
import { Portal, Avatar } from "@/components/ui";
import { searchUsers } from "@/actions/search";
import { scaleIn } from "@/lib/motion";

/** Dispatch this to open the messages chat sidebar (handled in (main)/layout.tsx). */
export const OPEN_CHAT_EVENT = "vocl:open-chat";
/** Dispatch this to open the command palette from anywhere. */
export const OPEN_COMMAND_PALETTE_EVENT = "vocl:open-command-palette";

interface CommandPaletteProps {
  username?: string;
  /** Called when the user picks the Messages command. */
  onOpenChat?: () => void;
}

interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

type Row =
  | { kind: "action"; action: CommandAction }
  | { kind: "user"; user: UserResult };

export function CommandPalette({ username, onOpenChat }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setUsers([]);
    setActiveIndex(0);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setUsers([]);
    setActiveIndex(0);
  }, []);

  // Global open triggers: Cmd/Ctrl+K, and a custom event (sidebar "Search" affordance).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsOpen((v) => !v);
        setQuery("");
        setUsers([]);
        setActiveIndex(0);
      }
    };
    const onOpenEvent = () => open();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
  }, [open]);

  const go = useCallback(
    (path: string) => {
      router.push(path);
      close();
    },
    [router, close]
  );

  const openChat = useCallback(() => {
    if (onOpenChat) onOpenChat();
    else window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
    close();
  }, [onOpenChat, close]);

  const toggleTheme = useCallback(() => {
    document.documentElement.classList.add("theme-transition");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.setTimeout(
      () => document.documentElement.classList.remove("theme-transition"),
      300
    );
    close();
  }, [resolvedTheme, setTheme, close]);

  // All available commands.
  const navActions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [
      { id: "home", label: "Home", hint: "Feed", icon: <IconHome size={18} />, keywords: "feed timeline", run: () => go("/feed") },
      { id: "explore", label: "Explore", icon: <IconCompass size={18} />, keywords: "discover trending", run: () => go("/explore") },
      { id: "search", label: "Search", icon: <IconSearch size={18} />, keywords: "find posts tags people", run: () => go("/search") },
      { id: "notifications", label: "Notifications", icon: <IconBell size={18} />, keywords: "alerts activity", run: () => go("/notifications") },
      { id: "messages", label: "Messages", icon: <IconMessage size={18} />, keywords: "chat dm inbox", run: openChat },
      { id: "bookmarks", label: "Bookmarks", icon: <IconBookmark size={18} />, keywords: "saved", run: () => go("/bookmarks") },
      { id: "drafts", label: "Drafts", icon: <IconFileText size={18} />, run: () => go("/drafts") },
      { id: "queue", label: "Queue", icon: <IconStack2 size={18} />, keywords: "scheduled", run: () => go("/queue") },
      { id: "communities", label: "Communities", icon: <IconUsersGroup size={18} />, keywords: "groups", run: () => go("/communities") },
      { id: "settings", label: "Settings", icon: <IconSettings size={18} />, keywords: "preferences account", run: () => go("/settings") },
    ];
    if (username) {
      items.push({
        id: "profile",
        label: "Profile",
        hint: `@${username}`,
        icon: <IconUser size={18} />,
        keywords: "me account",
        run: () => go(`/profile/${username}`),
      });
    }
    return items;
  }, [go, openChat, username]);

  const quickActions = useMemo<CommandAction[]>(
    () => [
      { id: "new-post", label: "New post", hint: "Create", icon: <IconPencilPlus size={18} />, keywords: "write compose create", run: () => go("/create") },
      {
        id: "toggle-theme",
        label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: resolvedTheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />,
        keywords: "theme dark light appearance",
        run: toggleTheme,
      },
    ],
    [go, resolvedTheme, toggleTheme]
  );

  // Filter actions by query.
  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (a: CommandAction) =>
      !q ||
      a.label.toLowerCase().includes(q) ||
      (a.keywords?.toLowerCase().includes(q) ?? false),
    [q]
  );

  const filteredNav = useMemo(() => navActions.filter(matches), [navActions, matches]);
  const filteredQuick = useMemo(() => quickActions.filter(matches), [quickActions, matches]);

  // Debounced people search.
  useEffect(() => {
    if (!isOpen) return;
    const term = query.trim();
    if (term.length < 2) {
      setUsers([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handle = window.setTimeout(async () => {
      const result = await searchUsers(term, { limit: 6 });
      if (result.success && result.users) {
        setUsers(
          result.users.map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
          }))
        );
      } else {
        setUsers([]);
      }
      setIsSearching(false);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, isOpen]);

  // Flattened, navigable list of rows (actions first, then users).
  const rows = useMemo<Row[]>(() => {
    const r: Row[] = [];
    filteredNav.forEach((action) => r.push({ kind: "action", action }));
    filteredQuick.forEach((action) => r.push({ kind: "action", action }));
    users.forEach((user) => r.push({ kind: "user", user }));
    return r;
  }, [filteredNav, filteredQuick, users]);

  // Keep activeIndex in range as the list changes.
  useEffect(() => {
    setActiveIndex((i) => (rows.length === 0 ? 0 : Math.min(i, rows.length - 1)));
  }, [rows.length]);

  const runRow = useCallback(
    (row: Row) => {
      if (row.kind === "action") row.action.run();
      else go(`/profile/${row.user.username}`);
    },
    [go]
  );

  // A11y: focus management + focus trap while open.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer to after the input mounts.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[activeIndex];
        if (row) runRow(row);
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, rows, activeIndex, runRow, close]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  let rowIndex = -1;
  const nextIndex = () => ++rowIndex;

  return (
    <Portal>
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="command-palette"
              className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                variants={scaleIn}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="w-full max-w-xl bg-background border border-vocl-border rounded-2xl shadow-2xl overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 h-14 border-b border-vocl-border">
                  <IconSearch size={20} className="text-foreground/40 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder="Search or jump to..."
                    aria-label="Command palette search"
                    className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-base"
                  />
                  {isSearching && (
                    <IconLoader2 size={16} className="animate-spin text-foreground/40" />
                  )}
                  <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-vocl-hover border border-vocl-border text-[10px] font-mono text-foreground/50">
                    Esc
                  </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
                  {rows.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-foreground/40">
                      No results found
                    </p>
                  ) : (
                    <>
                      {filteredNav.length > 0 && (
                        <Section title="Navigation">
                          {filteredNav.map((action) => {
                            const idx = nextIndex();
                            return (
                              <ActionRow
                                key={action.id}
                                index={idx}
                                action={action}
                                active={idx === activeIndex}
                                onHover={() => setActiveIndex(idx)}
                                onSelect={() => runRow({ kind: "action", action })}
                              />
                            );
                          })}
                        </Section>
                      )}
                      {filteredQuick.length > 0 && (
                        <Section title="Quick actions">
                          {filteredQuick.map((action) => {
                            const idx = nextIndex();
                            return (
                              <ActionRow
                                key={action.id}
                                index={idx}
                                action={action}
                                active={idx === activeIndex}
                                onHover={() => setActiveIndex(idx)}
                                onSelect={() => runRow({ kind: "action", action })}
                              />
                            );
                          })}
                        </Section>
                      )}
                      {users.length > 0 && (
                        <Section title="People">
                          {users.map((user) => {
                            const idx = nextIndex();
                            return (
                              <UserRow
                                key={user.id}
                                index={idx}
                                user={user}
                                active={idx === activeIndex}
                                onHover={() => setActiveIndex(idx)}
                                onSelect={() => runRow({ kind: "user", user })}
                              />
                            );
                          })}
                        </Section>
                      )}
                    </>
                  )}
                </div>

                {/* Footer hints */}
                <div className="hidden sm:flex items-center gap-4 px-4 h-10 border-t border-vocl-border text-[11px] text-foreground/40">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-vocl-hover border border-vocl-border font-mono">↑</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-vocl-hover border border-vocl-border font-mono">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-vocl-hover border border-vocl-border font-mono">
                      <IconCornerDownLeft size={11} />
                    </kbd>
                    to select
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-vocl-hover border border-vocl-border font-mono flex items-center gap-0.5">
                      <IconCommand size={11} /> K
                    </kbd>
                    to toggle
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </Portal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
        {title}
      </p>
      <div className="px-2">{children}</div>
    </div>
  );
}

function rowClass(active: boolean) {
  return `w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors ${
    active ? "bg-vocl-hover-strong" : "hover:bg-vocl-hover"
  }`;
}

function ActionRow({
  index,
  action,
  active,
  onHover,
  onSelect,
}: {
  index: number;
  action: CommandAction;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-row-index={index}
      onMouseMove={onHover}
      onClick={onSelect}
      aria-selected={active}
      className={rowClass(active)}
    >
      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-vocl-hover text-foreground/70 flex-shrink-0">
        {action.icon}
      </span>
      <span className="text-sm text-foreground">{action.label}</span>
      {action.hint && (
        <span className="ml-auto text-xs text-foreground/40">{action.hint}</span>
      )}
    </button>
  );
}

function UserRow({
  index,
  user,
  active,
  onHover,
  onSelect,
}: {
  index: number;
  user: UserResult;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-row-index={index}
      onMouseMove={onHover}
      onClick={onSelect}
      aria-selected={active}
      className={rowClass(active)}
    >
      <Avatar src={user.avatarUrl} username={user.username} size="sm" />
      <span className="flex flex-col min-w-0">
        {user.displayName && (
          <span className="text-sm text-foreground truncate">{user.displayName}</span>
        )}
        <span className="text-xs text-foreground/50 truncate">@{user.username}</span>
      </span>
    </button>
  );
}
