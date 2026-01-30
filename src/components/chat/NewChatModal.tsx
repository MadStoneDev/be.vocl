"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconX,
  IconSearch,
  IconLoader2,
  IconMessagePlus,
} from "@tabler/icons-react";
import { searchUsers } from "@/actions/search";
import { startConversation } from "@/actions/messages";

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
        // Filter out current user
        const filteredUsers = result.users.filter(
          (u) => u.id !== currentUserId
        );
        setUsers(filteredUsers);
      } else {
        setError("Failed to search users");
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  const handleStartConversation = useCallback(
    async (userId: string) => {
      setIsCreating(userId);
      setError(null);

      const result = await startConversation(userId);

      if (result.success && result.conversationId) {
        onConversationCreated(result.conversationId);
        onClose();
        setSearchQuery("");
        setUsers([]);
      } else {
        setError(result.error || "Failed to start conversation");
      }

      setIsCreating(null);
    },
    [onConversationCreated, onClose]
  );

  const handleClose = () => {
    setSearchQuery("");
    setUsers([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconMessagePlus size={20} className="text-vocl-accent" />
            <h2 className="font-semibold text-foreground">New Message</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <IconX size={20} className="text-foreground/60" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <IconSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              type="text"
              placeholder="Search for a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pl-10 pr-4 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-2">
            <p className="text-sm text-vocl-like">{error}</p>
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={24} className="animate-spin text-vocl-accent" />
            </div>
          ) : users.length > 0 ? (
            <div className="p-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartConversation(user.id)}
                  disabled={isCreating === user.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
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
                      <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-foreground truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-sm text-foreground/50 truncate">
                      @{user.username}
                    </p>
                  </div>
                  {isCreating === user.id ? (
                    <IconLoader2
                      size={20}
                      className="animate-spin text-vocl-accent"
                    />
                  ) : (
                    <IconMessagePlus
                      size={20}
                      className="text-foreground/30 group-hover:text-vocl-accent"
                    />
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-center py-8 px-4">
              <p className="text-foreground/50 text-sm">
                No users found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-foreground/50 text-sm">
                Search for someone to start a conversation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
