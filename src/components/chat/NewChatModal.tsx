"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconX,
  IconLoader2,
  IconMessagePlus,
  IconUsersGroup,
  IconCheck,
} from "@tabler/icons-react";
import { searchUsers } from "@/actions/search";
import { startConversation, createGroup } from "@/actions/messages";
import { Portal } from "@/components/ui";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  currentUserId?: string;
}

export function NewChatModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
}: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group mode
  const [groupMode, setGroupMode] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      const result = await searchUsers(searchQuery, { limit: 10 });

      if (result.success && result.users) {
        setUsers(result.users.filter((u) => u.id !== currentUserId));
      } else {
        setError("Failed to search users");
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  const resetAndClose = useCallback(() => {
    setSearchQuery("");
    setUsers([]);
    setError(null);
    setGroupMode(false);
    setSelected([]);
    setGroupName("");
    onClose();
  }, [onClose]);

  const handleStartConversation = useCallback(
    async (userId: string) => {
      setIsCreating(userId);
      setError(null);

      const result = await startConversation(userId);

      if (result.success && result.conversationId) {
        onConversationCreated(result.conversationId);
        resetAndClose();
      } else {
        setError(result.error || "Failed to start conversation");
      }

      setIsCreating(null);
    },
    [onConversationCreated, resetAndClose]
  );

  const toggleSelected = useCallback((user: User) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const handleCreateGroup = useCallback(async () => {
    setIsCreatingGroup(true);
    setError(null);

    const result = await createGroup(
      groupName,
      selected.map((u) => u.id)
    );

    if (result.success && result.conversationId) {
      onConversationCreated(result.conversationId);
      resetAndClose();
    } else {
      setError(result.error || "Failed to create group");
    }

    setIsCreatingGroup(false);
  }, [groupName, selected, onConversationCreated, resetAndClose]);

  if (!isOpen) return null;

  const canCreateGroup = groupName.trim().length > 0 && selected.length >= 2;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={resetAndClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative w-full max-w-md overflow-hidden border border-rule bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <div className="flex items-center gap-3">
              {groupMode ? (
                <IconUsersGroup size={20} className="text-accent" />
              ) : (
                <IconMessagePlus size={20} className="text-accent" />
              )}
              <div>
                <p className="kicker kicker-accent">
                  {groupMode ? "Group chat" : "Direct message"}
                </p>
                <h2 className="font-display text-2xl text-ink">
                  {groupMode ? "New group" : "New message"}
                </h2>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              aria-label="Close"
              className="text-meta hover:text-ink transition-colors"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => {
                setGroupMode((g) => !g);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-[0.16em] text-meta hover:text-ink transition-colors"
            >
              <IconUsersGroup size={15} />
              {groupMode ? "Start a direct message instead" : "New group chat"}
            </button>
          </div>

          {/* Group name + selected chips (group mode) */}
          {groupMode && (
            <div className="px-5 pt-3 space-y-3">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                maxLength={80}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full border border-rule bg-transparent px-3 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
              />
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleSelected(u)}
                      className="inline-flex items-center gap-1 border border-rule px-2 py-1 font-sans text-xs text-ink hover:bg-vocl-hover transition-colors"
                    >
                      @{u.username}
                      <IconX size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="border-b border-rule px-5 py-3">
            <input
              type="text"
              placeholder={groupMode ? "ADD PEOPLE…" : "SEARCH CORRESPONDENTS…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-b border-rule bg-transparent pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 py-2">
              <p className="editorial-body text-vocl-like">{error}</p>
            </div>
          )}

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-10">
                <IconLoader2 size={22} className="animate-spin text-accent" />
              </div>
            ) : users.length > 0 ? (
              <div>
                {users.map((user) => {
                  const isSelected = selected.some((u) => u.id === user.id);
                  const onClick = () =>
                    groupMode ? toggleSelected(user) : handleStartConversation(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={onClick}
                      disabled={isCreating === user.id}
                      className={`flex w-full items-center gap-3 border-b border-rule px-5 py-3 text-left transition-colors hover:bg-vocl-hover disabled:opacity-50 ${
                        isSelected ? "bg-vocl-hover" : ""
                      }`}
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-panel">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center font-display text-lg text-ink">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="truncate font-sans text-sm font-medium text-ink">
                          {user.displayName || user.username}
                        </p>
                        <p className="byline truncate text-meta">
                          @{user.username}
                        </p>
                      </div>
                      {isCreating === user.id ? (
                        <IconLoader2 size={20} className="animate-spin text-accent" />
                      ) : groupMode ? (
                        <span
                          className={`flex h-6 w-6 items-center justify-center border ${
                            isSelected
                              ? "border-accent bg-accent text-white"
                              : "border-rule text-transparent"
                          }`}
                        >
                          <IconCheck size={16} />
                        </span>
                      ) : (
                        <IconMessagePlus size={20} className="text-meta-dim" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              <p className="editorial-body px-5 py-10 text-center text-meta">
                No users found for &quot;{searchQuery}&quot;
              </p>
            ) : (
              <p className="editorial-body px-5 py-10 text-center text-meta">
                {groupMode
                  ? "Add at least two people and name your group"
                  : "Search for someone to start a conversation"}
              </p>
            )}
          </div>

          {/* Create group CTA (group mode) */}
          {groupMode && (
            <div className="border-t border-rule px-5 py-4">
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!canCreateGroup || isCreatingGroup}
                className="inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingGroup ? (
                  <IconLoader2 size={18} className="animate-spin" />
                ) : (
                  <IconUsersGroup size={18} />
                )}
                {selected.length >= 2
                  ? `Create group · ${selected.length + 1} people`
                  : "Create group"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
