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

interface NotificationActor {
  username: string;
  avatarUrl?: string;
}

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  actor: NotificationActor;
  /** Additional actors when this row groups several same-type notifications. */
  otherActors?: NotificationActor[];
  /** IDs of the grouped notifications (so all can be marked read together). */
  groupedIds?: string[];
  content?: string;
  postPreview?: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
  onMarkAsRead?: (id: string) => void;
}

function buildGroupedText(
  type: NotificationType,
  primary: string,
  othersCount: number
): { lead: string; rest: string } {
  // e.g. "Alice and 3 others liked your post"
  const action: Record<NotificationType, string> = {
    follow: "started following you",
    like: "liked your post",
    comment: "commented on your post",
    reblog: "echoed your post",
    mention: "mentioned you",
    message: "sent you a message",
  };
  const others =
    othersCount === 1 ? "1 other" : `${othersCount} others`;
  return {
    lead: `@${primary} and ${others}`,
    rest: action[type],
  };
}

const notificationConfig: Record<
  NotificationType,
  { icon: typeof IconHeart; color: string; bgColor: string; getText: (username: string) => string }
> = {
  follow: {
    icon: IconUserPlus,
    color: "text-vocl-primary",
    bgColor: "bg-vocl-primary/20",
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
    getText: (username) => `${username} echoed your post`,
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
  otherActors = [],
  groupedIds,
  content,
  postPreview,
  postId,
  isRead,
  createdAt,
  onMarkAsRead,
}: NotificationItemProps) {
  const config = notificationConfig[type];
  const Icon = config.icon;
  const isGrouped = otherActors.length > 0;
  // Show up to 3 stacked avatars (primary + 2 others).
  const stackedActors = [actor, ...otherActors].slice(0, 3);

  const handleClick = () => {
    if (isRead || !onMarkAsRead) return;
    // Mark every notification in the group as read.
    const ids = groupedIds && groupedIds.length > 0 ? groupedIds : [id];
    ids.forEach((nid) => onMarkAsRead(nid));
  };

  const grouped = isGrouped
    ? buildGroupedText(type, actor.username, otherActors.length)
    : null;

  const baseClassName = `group flex items-start gap-3 p-4 rounded-2xl transition-all cursor-pointer ${
    isRead
      ? "bg-transparent hover:bg-vocl-hover"
      : "bg-vocl-primary/5 hover:bg-vocl-primary/10"
  }`;

  const innerContent = (
    <>
      {/* Avatar(s) with icon badge */}
      <div className="relative flex-shrink-0">
        {isGrouped ? (
          <div className="flex items-center -space-x-3">
            {stackedActors.map((a, i) => (
              <div
                key={`${a.username}-${i}`}
                className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-background"
                style={{ zIndex: stackedActors.length - i }}
              >
                {a.avatarUrl ? (
                  <Image src={a.avatarUrl} alt={a.username} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {a.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div
              className={`relative w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center ring-2 ring-background`}
              style={{ zIndex: stackedActors.length + 1 }}
            >
              <Icon size={14} className={config.color} />
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-12 h-12 rounded-full overflow-hidden">
              {actor.avatarUrl ? (
                <Image
                  src={actor.avatarUrl}
                  alt={actor.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
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
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {grouped ? (
          <p className="text-sm text-foreground">
            <span className="font-semibold">{grouped.lead}</span>{" "}
            <span className="text-foreground/70">{grouped.rest}</span>
          </p>
        ) : (
          <p className="text-sm text-foreground">
            <span className="font-semibold">@{actor.username}</span>{" "}
            <span className="text-foreground/70">
              {config.getText(actor.username).replace(actor.username, "").trim()}
            </span>
          </p>
        )}

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
        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-vocl-primary mt-1.5" />
      )}
    </>
  );

  // Follow notifications link to the actor's profile.
  if (type === "follow") {
    return (
      <Link
        href={`/profile/${actor.username}`}
        onClick={handleClick}
        className={baseClassName}
      >
        {innerContent}
      </Link>
    );
  }

  // Post-based notifications (like/comment/reblog/mention) open the post.
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

  // Message notifications open the chat inbox. There's no per-conversation route,
  // so we dispatch the same global event the command palette / sidebar listen for.
  // (Keep in sync with OPEN_CHAT_EVENT in components/layout/CommandPalette.tsx.)
  if (type === "message") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          handleClick();
          window.dispatchEvent(new CustomEvent("vocl:open-chat"));
        }}
        className={baseClassName}
      >
        {innerContent}
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={baseClassName}>
      {innerContent}
    </div>
  );
}

export type { NotificationType };
