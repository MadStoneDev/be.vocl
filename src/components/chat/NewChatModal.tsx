"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconX,
  IconSearch,
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={resetAndClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md bg-background border border-vocl-border rounded-sm shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-vocl-border">
            <div className="flex items-center gap-2">
              {groupMode ? (
                <IconUsersGroup size={20} className="text-vocl-primary" />
              ) : (
                <IconMessagePlus size={20} className="text-vocl-primary" />
              )}
              <h2 className="type-display text-xl text-foreground">
                {groupMode ? "New Group" : "New Message"}
              </h2>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 rounded-full hover:bg-vocl-hover transition-colors"
            >
              <IconX size={20} className="text-foreground/60" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => {
                setGroupMode((g) => !g);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 type-meta font-semibold text-vocl-primary hover:opacity-80 transition-opacity"
            >
              <IconUsersGroup size={15} />
              {groupMode ? "Start a direct message instead" : "New group chat"}
            </button>
          </div>

          {/* Group name + selected chips (group mode) */}
          {groupMode && (
            <div className="px-4 pt-3 space-y-3">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                maxLength={80}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full py-2.5 px-3 rounded-sm bg-vocl-hover text-foreground type-body border border-vocl-border placeholder:text-foreground/40 focus:outline-none focus:border-vocl-primary transition-colors"
              />
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleSelected(u)}
                      className="inline-flex items-center gap-1 rounded-sm bg-vocl-primary/15 px-2 py-1 type-meta font-semibold text-vocl-primary hover:bg-vocl-primary/25 transition-colors"
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
          <div className="p-4">
            <div className="relative">
              <IconSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                placeholder={groupMode ? "Add people…" : "Search for a user..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 pl-10 pr-4 rounded-sm bg-vocl-surface-muted text-foreground type-body border border-vocl-border placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent dark:bg-vocl-surface-dark dark:text-foreground dark:placeholder:text-foreground/40"
                autoFocus
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 pb-2">
              <p className="type-body text-vocl-like">{error}</p>
            </div>
          )}

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 size={24} className="animate-spin text-vocl-primary" />
              </div>
            ) : users.length > 0 ? (
              <div className="p-2">
                {users.map((user) => {
                  const isSelected = selected.some((u) => u.id === user.id);
                  const onClick = () =>
                    groupMode ? toggleSelected(user) : handleStartConversation(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={onClick}
                      disabled={isCreating === user.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-sm transition-colors disabled:opacity-50 ${
                        isSelected ? "bg-vocl-primary/10" : "hover:bg-vocl-hover"
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="type-body font-semibold text-foreground truncate">
                          {user.displayName || user.username}
                        </p>
                        <p className="type-meta text-foreground/50 truncate">
                          @{user.username}
                        </p>
                      </div>
                      {isCreating === user.id ? (
                        <IconLoader2 size={20} className="animate-spin text-vocl-primary" />
                      ) : groupMode ? (
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-sm border ${
                            isSelected
                              ? "border-vocl-primary bg-vocl-primary text-white"
                              : "border-vocl-border text-transparent"
                          }`}
                        >
                          <IconCheck size={16} />
                        </span>
                      ) : (
                        <IconMessagePlus size={20} className="text-foreground/30" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              <div className="text-center py-8 px-4">
                <p className="text-foreground/50 type-body">
                  No users found for &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-foreground/50 type-body">
                  {groupMode
                    ? "Add at least two people and name your group"
                    : "Search for someone to start a conversation"}
                </p>
              </div>
            )}
          </div>

          {/* Create group CTA (group mode) */}
          {groupMode && (
            <div className="border-t border-vocl-border p-4">
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!canCreateGroup || isCreatingGroup}
                className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-vocl-primary px-4 py-2.5 type-meta font-semibold text-white transition-colors hover:bg-vocl-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
