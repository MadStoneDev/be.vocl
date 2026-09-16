"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  IconLoader2,
  IconUser,
  IconRobot,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconArrowUp,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileText,
} from "@tabler/icons-react";
import { getFlags, resolveFlag, escalateFlag, claimFlag } from "@/actions/flags";
import { ROLES, ROLE_NAMES, getEscalationTargets } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import type { FlagStatus } from "@/types/database";

interface FlagWithPost {
  id: string;
  flagger_id: string | null;
  post_id: string;
  subject: string;
  comments: string | null;
  status: FlagStatus;
  assigned_to: string | null;
  assigned_role: number;
  escalated_at: string | null;
  escalation_reason: string | null;
  created_at: string;
  flagger?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    post_type: string;
    content: any;
    author: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  assigned_moderator?: {
    id: string;
    username: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved_removed", label: "Removed" },
  { value: "resolved_flagged", label: "Flagged" },
  { value: "resolved_dismissed", label: "Dismissed" },
];

const SUBJECT_LABELS: Record<string, string> = {
  minor_safety: "Minor Safety",
  non_consensual: "Non-consensual",
  harassment: "Harassment",
  spam: "Spam",
  illegal: "Illegal",
  copyright: "Copyright",
  misinformation: "Misinformation",
  other: "Other",
};

const POST_TYPE_ICONS: Record<string, typeof IconPhoto> = {
  image: IconPhoto,
  video: IconVideo,
  audio: IconMusic,
  text: IconFileText,
  gallery: IconPhoto,
};

export default function AdminFlagsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending";
  const { profile } = useAuth();

  const [flags, setFlags] = useState<FlagWithPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedFlag, setSelectedFlag] = useState<FlagWithPost | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalationTarget, setEscalationTarget] = useState<number | null>(null);

  const userRole = profile?.role || 0;
  const escalationTargets = getEscalationTargets(userRole);

  const loadFlags = async () => {
    setIsLoading(true);
    const result = await getFlags(
      statusFilter === "all" ? undefined : statusFilter as FlagStatus
    );
    if (result.success && result.flags) {
      setFlags(result.flags);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadFlags();
  }, [statusFilter]);

  const handleClaim = async (flagId: string) => {
    const result = await claimFlag(flagId);
    if (result.success) {
      loadFlags();
    }
  };

  const handleResolve = async (resolution: "resolved_removed" | "resolved_flagged" | "resolved_dismissed") => {
    if (!selectedFlag) return;

    setResolving(true);
    const result = await resolveFlag(selectedFlag.id, resolution, resolutionNotes);
    if (result.success) {
      setSelectedFlag(null);
      setResolutionNotes("");
      loadFlags();
    }
    setResolving(false);
  };

  const handleEscalate = async () => {
    if (!selectedFlag || !escalationTarget || !escalationReason.trim()) return;

    setResolving(true);
    const result = await escalateFlag(selectedFlag.id, escalationTarget, escalationReason);
    if (result.success) {
      setSelectedFlag(null);
      setEscalationReason("");
      setEscalationTarget(null);
      setShowEscalate(false);
      loadFlags();
    }
    setResolving(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPostPreview = (post: FlagWithPost["post"]) => {
    const content = post.content;
    if (post.post_type === "text") {
      return content?.plain?.substring(0, 100) || content?.html?.substring(0, 100) || "Text post";
    }
    if (post.post_type === "image") {
      return `Image post (${content?.urls?.length || 1} image${content?.urls?.length > 1 ? "s" : ""})`;
    }
    return `${post.post_type} post`;
  };

  const PostTypeIcon = (type: string) => {
    const Icon = POST_TYPE_ICONS[type] || IconFileText;
    return <Icon size={14} />;
  };

  return (
    <div>
      <title>Admin — Flags | be.vocl</title>
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">Moderation</div>
          <h1 className="type-display text-ink">Flags</h1>
          <p className="editorial-deck text-body mt-2">Post content flags from users</p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-b border-rule bg-transparent pb-1.5 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-secondary focus:border-foreground focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : flags.length === 0 ? (
        <p className="editorial-body text-meta py-16 text-center">No flags found.</p>
      ) : (
        <div>
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="border-b border-rule py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`slug ${
                      !flag.flagger_id
                        ? "text-amber-500"
                        : "text-accent"
                    }`}>
                      {!flag.flagger_id ? (
                        <span className="flex items-center gap-1">
                          <IconRobot size={12} />
                          Auto
                        </span>
                      ) : (
                        "User Flag"
                      )}
                    </span>
                    <span className="slug text-meta-dim">
                      {formatDate(flag.created_at)}
                    </span>
                    <span className={`slug ${
                      flag.status === "pending"
                        ? "text-amber-500"
                        : flag.status === "reviewing"
                        ? "text-blue-500"
                        : flag.status === "escalated"
                        ? "text-red-500"
                        : flag.status.startsWith("resolved")
                        ? "text-green-500"
                        : "text-meta-dim"
                    }`}>
                      {flag.status.replace("resolved_", "")}
                    </span>
                    {flag.assigned_role > ROLES.JUNIOR_MOD && (
                      <span className="slug text-purple-500">
                        {ROLE_NAMES[flag.assigned_role as keyof typeof ROLE_NAMES] || `Role ${flag.assigned_role}`}+
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <h3 className="type-heading text-ink mb-1">
                    {SUBJECT_LABELS[flag.subject] || flag.subject}
                  </h3>

                  {/* Post Info */}
                  <div className="flex items-center gap-2 byline text-meta mb-2">
                    <span>Post by:</span>
                    <Link
                      href={`/@${flag.post.author.username}`}
                      className="flex items-center gap-1.5 hover:text-accent"
                    >
                      <div className="w-5 h-5 overflow-hidden ph-image">
                        {flag.post.author.avatar_url ? (
                          <Image
                            src={flag.post.author.avatar_url}
                            alt=""
                            width={20}
                            height={20}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconUser size={12} />
                          </div>
                        )}
                      </div>
                      <span className="text-ink">@{flag.post.author.username}</span>
                    </Link>
                    <span className="flex items-center gap-1 text-meta-dim">
                      {PostTypeIcon(flag.post.post_type)}
                      {flag.post.post_type}
                    </span>
                  </div>

                  {/* Post Preview */}
                  <p className="editorial-body text-meta line-clamp-2 mb-2">
                    {getPostPreview(flag.post)}
                  </p>

                  {/* Comments */}
                  {flag.comments && (
                    <p className="editorial-body italic text-ink-secondary">
                      "{flag.comments}"
                    </p>
                  )}

                  {/* Escalation info */}
                  {flag.escalated_at && (
                    <div className="mt-2 slug text-red-500">
                      Escalated: {flag.escalation_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2.5 byline">
                  {flag.status === "pending" && (
                    <button
                      onClick={() => handleClaim(flag.id)}
                      className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink hover:text-accent transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {(flag.status === "pending" || flag.status === "reviewing" || flag.status === "escalated") && (
                    <button
                      onClick={() => setSelectedFlag(flag)}
                      className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink hover:text-accent transition-colors"
                    >
                      Review
                    </button>
                  )}
                  <Link
                    href={`/post/${flag.post_id}`}
                    target="_blank"
                    className="font-sans text-[11px] uppercase tracking-[0.16em] text-meta hover:text-ink transition-colors"
                  >
                    View Post
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setSelectedFlag(null);
              setShowEscalate(false);
            }}
          />
          <div className="relative w-full max-w-lg bg-background border border-rule max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="kicker kicker-accent mb-2.5">{showEscalate ? "Escalate · higher review" : "Review · decision logged"}</div>
              <h2 className="type-heading text-ink mb-4">
                {showEscalate ? "Escalate Flag" : "Review Flag"}
              </h2>

              {showEscalate ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="slug text-meta-dim block mb-2">
                      Escalate to
                    </label>
                    <select
                      value={escalationTarget || ""}
                      onChange={(e) => setEscalationTarget(Number(e.target.value))}
                      className="w-full border border-rule bg-transparent p-3 font-sans text-sm text-ink focus:border-foreground focus:outline-none"
                    >
                      <option value="">Select role level...</option>
                      {escalationTargets.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_NAMES[role as keyof typeof ROLE_NAMES]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="slug text-meta-dim block mb-2">
                      Reason for escalation
                    </label>
                    <textarea
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      placeholder="Explain why this needs higher-level review..."
                      rows={3}
                      className="w-full border border-rule bg-transparent p-3 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEscalate(false)}
                      className="flex-1 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleEscalate}
                      disabled={resolving || !escalationTarget || !escalationReason.trim()}
                      className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-red-500 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                    >
                      <IconArrowUp size={18} />
                      Escalate
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="slug text-meta-dim">Subject</label>
                      <p className="editorial-body text-ink">
                        {SUBJECT_LABELS[selectedFlag.subject] || selectedFlag.subject}
                      </p>
                    </div>

                    <div>
                      <label className="slug text-meta-dim">Post Author</label>
                      <p className="editorial-body text-ink">
                        @{selectedFlag.post.author.username}
                      </p>
                    </div>

                    <div>
                      <label className="slug text-meta-dim">Post Type</label>
                      <p className="editorial-body text-ink capitalize">
                        {selectedFlag.post.post_type}
                      </p>
                    </div>

                    {selectedFlag.comments && (
                      <div>
                        <label className="slug text-meta-dim">Flagger Comments</label>
                        <p className="editorial-body text-ink">{selectedFlag.comments}</p>
                      </div>
                    )}

                    <div>
                      <label className="slug text-meta-dim block mb-2">
                        Resolution Notes
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add notes about this decision..."
                        rows={3}
                        className="w-full border border-rule bg-transparent p-3 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <button
                      onClick={() => handleResolve("resolved_removed")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-vocl-like hover:bg-vocl-hover transition-colors disabled:opacity-50"
                    >
                      <IconX size={18} />
                      Remove Post
                    </button>
                    <button
                      onClick={() => handleResolve("resolved_flagged")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-amber-500 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                    >
                      <IconAlertTriangle size={18} />
                      Mark Sensitive
                    </button>
                    <button
                      onClick={() => handleResolve("resolved_dismissed")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors disabled:opacity-50"
                    >
                      <IconCheck size={18} />
                      Dismiss
                    </button>
                  </div>

                  {escalationTargets.length > 0 && (
                    <button
                      onClick={() => setShowEscalate(true)}
                      className="w-full flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-red-500 hover:bg-vocl-hover transition-colors"
                    >
                      <IconArrowUp size={18} />
                      Escalate to Higher Level
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
