"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { IconX, IconLoader2 } from "@tabler/icons-react";
import { searchUsers } from "@/actions/search";
import { sharePostToUser } from "@/actions/messages";
import { Portal, toast } from "@/components/ui";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  currentUserId?: string;
}

/**
 * Send a post into a DM. Broadsheet flat: a ruled correspondent list + an
 * optional note. Reuses the user search + the sharePostToUser action (which
 * honours blocks / DM-privacy and routes to the recipient's requests inbox when
 * they don't follow the sender).
 */
export function SharePostModal({ isOpen, onClose, postId, currentUserId }: SharePostModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [note, setNote] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setUsers([]);
      setNote("");
      setSendingTo(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchUsers(query, { limit: 8 });
      if (!cancelled) {
        if (res.success && res.users) {
          setUsers(res.users.filter((u) => u.id !== currentUserId));
        }
        setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, currentUserId]);

  const handleSend = useCallback(
    async (user: User) => {
      setSendingTo(user.id);
      const res = await sharePostToUser(user.id, postId, note);
      setSendingTo(null);
      if (res.success) {
        toast.success(`Sent to @${user.username}`);
        onClose();
      } else {
        toast.error(res.error || "Couldn't send the post");
      }
    },
    [postId, note, onClose]
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

        <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-rule bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <div>
              <p className="kicker kicker-accent">Send in a message</p>
              <h2 className="font-display text-2xl text-ink">Share this post</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-meta hover:text-ink transition-colors"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Optional note */}
          <div className="border-b border-rule px-5 py-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              maxLength={500}
              className="w-full border-b border-rule bg-transparent pb-1.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>

          {/* Search */}
          <div className="border-b border-rule px-5 py-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH CORRESPONDENTS…"
              autoFocus
              className="w-full border-b border-rule bg-transparent pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-10">
                <IconLoader2 size={22} className="animate-spin text-accent" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSend(user)}
                  disabled={sendingTo !== null}
                  className="flex w-full items-center gap-3 border-b border-rule px-5 py-3 text-left transition-colors hover:bg-vocl-hover disabled:opacity-50"
                >
                  <span className="relative h-10 w-10 flex-none overflow-hidden bg-panel">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.username} fill className="object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-display text-ink">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-medium text-ink">
                      {user.displayName || user.username}
                    </span>
                    <span className="byline block truncate text-meta">@{user.username}</span>
                  </span>
                  {sendingTo === user.id && (
                    <IconLoader2 size={18} className="animate-spin text-accent" />
                  )}
                </button>
              ))
            ) : (
              <p className="editorial-body px-5 py-10 text-center text-meta">
                {query.trim() ? "No one by that name." : "Search for someone to send this to."}
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
