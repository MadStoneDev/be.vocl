"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconUserPlus,
  IconHeart,
  IconMessage,
  IconRefresh,
  IconAt,
  IconMail,
} from "@tabler/icons-react";

type NotificationType = "follow" | "like" | "comment" | "reblog" | "mention" | "message";

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  actor: {
    username: string;
    avatarUrl?: string;
  };
  content?: string;
  postPreview?: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
  onMarkAsRead?: (id: string) => void;
}

const notificationConfig: Record<
  NotificationType,
  { icon: typeof IconHeart; color: string; bgColor: string; getText: (username: string) => string }
> = {
  follow: {
    icon: IconUserPlus,
    color: "text-vocl-accent",
    bgColor: "bg-vocl-accent/20",
    getText: (username) => `${username} started following you`,
  },
  like: {
    icon: IconHeart,
    color: "text-vocl-like",
    bgColor: "bg-vocl-like/20",
    getText: (username) => `${username} liked your post`,
  },
  comment: {
    icon: IconMessage,
    color: "text-vocl-comment",
    bgColor: "bg-vocl-comment/20",
    getText: (username) => `${username} commented on your post`,
  },
  reblog: {
    icon: IconRefresh,
    color: "text-vocl-reblog",
    bgColor: "bg-vocl-reblog/20",
    getText: (username) => `${username} reblogged your post`,
  },
  mention: {
    icon: IconAt,
    color: "text-purple-400",
    bgColor: "bg-purple-400/20",
    getText: (username) => `${username} mentioned you`,
  },
  message: {
    icon: IconMail,
    color: "text-blue-400",
    bgColor: "bg-blue-400/20",
    getText: (username) => `${username} sent you a message`,
  },
};

export function NotificationItem({
  id,
  type,
  actor,
  content,
  postPreview,
  postId,
  isRead,
  createdAt,
  onMarkAsRead,
}: NotificationItemProps) {
  const config = notificationConfig[type];
  const Icon = config.icon;

  const handleClick = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  const baseClassName = `group flex items-start gap-3 p-4 rounded-2xl transition-all cursor-pointer ${
    isRead
      ? "bg-transparent hover:bg-white/5"
      : "bg-vocl-accent/5 hover:bg-vocl-accent/10"
  }`;

  const innerContent = (
    <>
      {/* Avatar with icon badge */}
      <div className="relative flex-shrink-0">
        <div className="relative w-12 h-12 rounded-full overflow-hidden">
          {actor.avatarUrl ? (
            <Image
              src={actor.avatarUrl}
              alt={actor.username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {actor.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {/* Type icon badge */}
        <div
          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center ring-2 ring-background`}
        >
          <Icon size={14} className={config.color} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold">@{actor.username}</span>{" "}
          <span className="text-foreground/70">
            {config.getText(actor.username).replace(actor.username, "").trim()}
          </span>
        </p>

        {/* Comment/message content */}
        {content && (
          <p className="mt-1 text-sm text-foreground/50 line-clamp-2">{content}</p>
        )}

        {/* Post preview */}
        {postPreview && !content && (
          <p className="mt-1 text-sm text-foreground/40 line-clamp-1 italic">
            &quot;{postPreview}&quot;
          </p>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-xs text-foreground/30">{createdAt}</p>
      </div>

      {/* Unread indicator */}
      {!isRead && (
        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-vocl-accent mt-1.5" />
      )}
    </>
  );

  if (postId) {
    return (
      <Link
        href={`/post/${postId}`}
        onClick={handleClick}
        className={baseClassName}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div onClick={handleClick} className={baseClassName}>
      {innerContent}
    </div>
  );
}

export type { NotificationType };
