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
import { Portal, Avatar, ImageWithPlaceholder } from "@/components/ui";
import { searchUsers, searchPosts } from "@/actions/search";
import { searchCommunities } from "@/actions/communities";
import { scaleIn } from "@/lib/motion";
import { OPEN_CHAT_EVENT, OPEN_COMMAND_PALETTE_EVENT } from "./commandPaletteEvents";

interface CommandPaletteProps {
  username?: string;
  /** Called when the user picks the Messages command. */
  onOpenChat?: () => void;
  /** Open immediately on mount (used when the palette is lazy-loaded on first trigger). */
  initiallyOpen?: boolean;
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

interface PostResult {
  id: string;
  label: string;
  authorUsername: string;
  thumbnailUrl: string | null;
  postType: string;
}

/** First image/thumbnail for a post search result, or null for text/other. */
function postThumb(
  content:
    | {
        urls?: string[];
        thumbnail_url?: string;
        album_art_url?: string;
        spotify_data?: { album_art?: string };
      }
    | null
    | undefined,
): string | null {
  if (!content) return null;
  return (
    content.urls?.[0] ||
    content.thumbnail_url ||
    content.album_art_url ||
    content.spotify_data?.album_art ||
    null
  );
}

interface CommunityResult {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
}

type Row =
  | { kind: "action"; action: CommandAction }
  | { kind: "user"; user: UserResult }
  | { kind: "post"; post: PostResult }
  | { kind: "community"; community: CommunityResult };

/** Short, plain-text label for a post search result. */
function postLabel(
  content:
    | { plain?: string; html?: string; caption_html?: string; question?: string }
    | null
    | undefined,
  authorUsername: string,
): string {
  const raw =
    content?.plain ||
    content?.html ||
    content?.caption_html ||
    content?.question ||
    "";
  const text = String(raw).replace(/<[^>]*>/g, "").trim();
  return text ? text.slice(0, 70) : `Post by @${authorUsername}`;
}

/** Wrap the first case-insensitive match of `term` in `text` for emphasis. */
function highlightMatch(text: string, term: string): ReactNode {
  const t = term.trim();
  if (!t) return text;
  const idx = text.toLowerCase().indexOf(t.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-vocl-primary font-medium">
        {text.slice(idx, idx + t.length)}
      </mark>
      {text.slice(idx + t.length)}
    </>
  );
}

export function CommandPalette({ username, onOpenChat, initiallyOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(initiallyOpen ?? false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setUsers([]);
    setPosts([]);
    setCommunities([]);
    setActiveIndex(0);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setUsers([]);
    setPosts([]);
    setCommunities([]);
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
        setPosts([]);
        setCommunities([]);
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
      { id: "drafts", label: "Scheduled & queue", icon: <IconFileText size={18} />, run: () => go("/drafts") },
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
        label: resolvedTheme === "dark" ? "Switch to newsprint edition" : "Switch to late (dark) edition",
        icon: resolvedTheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />,
        keywords: "theme edition dark light newsprint late appearance",
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
      setPosts([]);
      setCommunities([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handle = window.setTimeout(async () => {
      const [userRes, postRes, communityRes] = await Promise.all([
        searchUsers(term, { limit: 5 }),
        searchPosts(term, { limit: 5 }),
        searchCommunities(term, 4),
      ]);

      setUsers(
        userRes.success && userRes.users
          ? userRes.users.map((u) => ({
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              avatarUrl: u.avatarUrl,
            }))
          : [],
      );
      setPosts(
        postRes.success && postRes.posts
          ? postRes.posts.map((p) => ({
              id: p.id,
              label: postLabel(p.content, p.author.username),
              authorUsername: p.author.username,
              thumbnailUrl: postThumb(p.content),
              postType: p.postType,
            }))
          : [],
      );
      setCommunities(
        communityRes.success && communityRes.communities
          ? communityRes.communities.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              iconUrl: c.iconUrl,
              memberCount: c.memberCount,
            }))
          : [],
      );
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
    posts.forEach((post) => r.push({ kind: "post", post }));
    communities.forEach((community) => r.push({ kind: "community", community }));
    return r;
  }, [filteredNav, filteredQuick, users, posts, communities]);

  // Keep activeIndex in range as the list changes.
  useEffect(() => {
    setActiveIndex((i) => (rows.length === 0 ? 0 : Math.min(i, rows.length - 1)));
  }, [rows.length]);

  const runRow = useCallback(
    (row: Row) => {
      if (row.kind === "action") row.action.run();
      else if (row.kind === "user") go(`/profile/${row.user.username}`);
      else if (row.kind === "post") go(`/post/${row.post.id}`);
      else go(`/c/${row.community.slug}`);
    },
    [go]
  );

  // Live refs so the focus-trap effect can read the current rows/activeIndex/runRow
  // without listing them as dependencies. Depending on them would re-run the effect
  // on every keystroke, and its cleanup (focus restore) would steal focus from the
  // input mid-type — the "only the first character registers" bug.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const runRowRef = useRef(runRow);
  runRowRef.current = runRow;

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
        const len = rowsRef.current.length;
        setActiveIndex((i) => (len === 0 ? 0 : (i + 1) % len));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const len = rowsRef.current.length;
        setActiveIndex((i) => (len === 0 ? 0 : (i - 1 + len) % len));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const row = rowsRef.current[activeIndexRef.current];
        if (row) runRowRef.current(row);
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
    // Only re-run on open/close — NOT on rows/activeIndex changes (see refs above),
    // otherwise the cleanup's focus-restore fires mid-type and drops keystrokes.
  }, [isOpen, close]);

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
                className="w-full max-w-xl bg-background border border-vocl-border rounded-sm shadow-2xl overflow-hidden"
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
                      {posts.length > 0 && (
                        <Section title="Posts">
                          {posts.map((post) => {
                            const idx = nextIndex();
                            return (
                              <PostRow
                                key={post.id}
                                index={idx}
                                post={post}
                                active={idx === activeIndex}
                                highlight={query.trim()}
                                onHover={() => setActiveIndex(idx)}
                                onSelect={() => runRow({ kind: "post", post })}
                              />
                            );
                          })}
                        </Section>
                      )}
                      {communities.length > 0 && (
                        <Section title="Communities">
                          {communities.map((community) => {
                            const idx = nextIndex();
                            return (
                              <CommunityRow
                                key={community.id}
                                index={idx}
                                community={community}
                                active={idx === activeIndex}
                                onHover={() => setActiveIndex(idx)}
                                onSelect={() => runRow({ kind: "community", community })}
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

function PostRow({
  index,
  post,
  active,
  highlight,
  onHover,
  onSelect,
}: {
  index: number;
  post: PostResult;
  active: boolean;
  highlight: string;
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
      {/* Thumbnail for media posts; a post-type icon otherwise so rows line up. */}
      <span className="relative w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg bg-vocl-hover flex items-center justify-center">
        {post.thumbnailUrl ? (
          <ImageWithPlaceholder
            src={post.thumbnailUrl}
            alt=""
            colorKey={post.id}
            fill
            sizes="48px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <IconFileText size={18} className="text-foreground/50" />
        )}
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm text-foreground truncate">
          {highlightMatch(post.label, highlight)}
        </span>
        <span className="text-xs text-foreground/50 truncate">@{post.authorUsername}</span>
      </span>
    </button>
  );
}

function CommunityRow({
  index,
  community,
  active,
  onHover,
  onSelect,
}: {
  index: number;
  community: CommunityResult;
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
        <IconUsersGroup size={18} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm text-foreground truncate">{community.name}</span>
        <span className="text-xs text-foreground/50 truncate">
          {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
        </span>
      </span>
    </button>
  );
}
