"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IconCheck,
  IconChecks,
  IconDots,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";

interface MessageBubbleProps {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  senderId: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
}

export function MessageBubble({
  id,
  content,
  mediaUrl,
  mediaType,
  isOwn,
  isRead,
  isEdited,
  isDeleted,
  createdAt,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit?.(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(id);
    setShowMenu(false);
  };

  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
        <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-sm text-foreground/30 italic">Message deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div className="relative max-w-[80%]">
        {/* Message bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl ${
            isOwn
              ? "bg-vocl-accent text-white rounded-br-md"
              : "bg-vocl-surface-dark text-foreground rounded-bl-md"
          }`}
        >
          {/* Media content */}
          {mediaUrl && mediaType === "image" && (
            <div className="relative w-full max-w-xs rounded-lg overflow-hidden mb-2">
              <Image
                src={mediaUrl}
                alt=""
                width={300}
                height={200}
                className="object-cover"
              />
            </div>
          )}

          {/* Text content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/10 text-white text-sm resize-none focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          )}

          {/* Timestamp and status */}
          <div
            className={`flex items-center gap-1.5 mt-1 ${
              isOwn ? "justify-end" : "justify-start"
            }`}
          >
            <span
              className={`text-[10px] ${
                isOwn ? "text-white/60" : "text-foreground/40"
              }`}
            >
              {createdAt}
              {isEdited && " (edited)"}
            </span>
            {isOwn && (
              <span className="text-white/60">
                {isRead ? <IconChecks size={14} /> : <IconCheck size={14} />}
              </span>
            )}
          </div>
        </div>

        {/* Action menu (own messages only) */}
        {isOwn && !isEditing && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full bg-vocl-surface-dark hover:bg-white/10 transition-colors"
            >
              <IconDots size={14} className="text-foreground/50" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-0 top-8 w-32 py-1 rounded-xl bg-vocl-surface-dark border border-white/10 shadow-xl z-50">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconPencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
                  >
                    <IconTrash size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
