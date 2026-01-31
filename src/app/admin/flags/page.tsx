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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flags</h1>
          <p className="text-sm text-foreground/50 mt-1">Post content flags from users</p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
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
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/50">No flags found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="bg-vocl-surface-dark rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      !flag.flagger_id
                        ? "bg-amber-500/20 text-amber-500"
                        : "bg-vocl-accent/20 text-vocl-accent"
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
                    <span className="text-xs text-foreground/50">
                      {formatDate(flag.created_at)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      flag.status === "pending"
                        ? "bg-amber-500/20 text-amber-500"
                        : flag.status === "reviewing"
                        ? "bg-blue-500/20 text-blue-500"
                        : flag.status === "escalated"
                        ? "bg-red-500/20 text-red-500"
                        : flag.status.startsWith("resolved")
                        ? "bg-green-500/20 text-green-500"
                        : "bg-white/10 text-foreground/50"
                    }`}>
                      {flag.status.replace("resolved_", "")}
                    </span>
                    {flag.assigned_role > ROLES.JUNIOR_MOD && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500">
                        {ROLE_NAMES[flag.assigned_role as keyof typeof ROLE_NAMES] || `Role ${flag.assigned_role}`}+
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="font-semibold text-foreground mb-1">
                    {SUBJECT_LABELS[flag.subject] || flag.subject}
                  </div>

                  {/* Post Info */}
                  <div className="flex items-center gap-2 text-sm text-foreground/70 mb-2">
                    <span>Post by:</span>
                    <Link
                      href={`/@${flag.post.author.username}`}
                      className="flex items-center gap-1.5 hover:text-vocl-accent"
                    >
                      <div className="w-5 h-5 rounded-full bg-vocl-surface-dark overflow-hidden">
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
                      <span className="font-medium">@{flag.post.author.username}</span>
                    </Link>
                    <span className="flex items-center gap-1 text-foreground/50">
                      {PostTypeIcon(flag.post.post_type)}
                      {flag.post.post_type}
                    </span>
                  </div>

                  {/* Post Preview */}
                  <p className="text-sm text-foreground/60 line-clamp-2 mb-2">
                    {getPostPreview(flag.post)}
                  </p>

                  {/* Comments */}
                  {flag.comments && (
                    <p className="text-sm text-foreground/50 italic">
                      "{flag.comments}"
                    </p>
                  )}

                  {/* Escalation info */}
                  {flag.escalated_at && (
                    <div className="mt-2 text-xs text-red-400">
                      Escalated: {flag.escalation_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {flag.status === "pending" && (
                    <button
                      onClick={() => handleClaim(flag.id)}
                      className="px-4 py-2 bg-vocl-accent text-white rounded-xl text-sm font-medium hover:bg-vocl-accent-hover transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {(flag.status === "pending" || flag.status === "reviewing" || flag.status === "escalated") && (
                    <button
                      onClick={() => setSelectedFlag(flag)}
                      className="px-4 py-2 bg-white/10 text-foreground rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                      Review
                    </button>
                  )}
                  <Link
                    href={`/post/${flag.post_id}`}
                    target="_blank"
                    className="px-4 py-2 bg-white/5 text-foreground/70 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setSelectedFlag(null);
              setShowEscalate(false);
            }}
          />
          <div className="relative w-full max-w-lg mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {showEscalate ? "Escalate Flag" : "Review Flag"}
              </h2>

              {showEscalate ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm text-foreground/50 block mb-2">
                      Escalate to
                    </label>
                    <select
                      value={escalationTarget || ""}
                      onChange={(e) => setEscalationTarget(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
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
                    <label className="text-sm text-foreground/50 block mb-2">
                      Reason for escalation
                    </label>
                    <textarea
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      placeholder="Explain why this needs higher-level review..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEscalate(false)}
                      className="flex-1 px-4 py-2.5 bg-white/10 text-foreground rounded-xl font-medium hover:bg-white/20"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleEscalate}
                      disabled={resolving || !escalationTarget || !escalationReason.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-500/90 disabled:opacity-50"
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
                      <label className="text-sm text-foreground/50">Subject</label>
                      <p className="text-foreground font-medium">
                        {SUBJECT_LABELS[selectedFlag.subject] || selectedFlag.subject}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-foreground/50">Post Author</label>
                      <p className="text-foreground font-medium">
                        @{selectedFlag.post.author.username}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-foreground/50">Post Type</label>
                      <p className="text-foreground font-medium capitalize">
                        {selectedFlag.post.post_type}
                      </p>
                    </div>

                    {selectedFlag.comments && (
                      <div>
                        <label className="text-sm text-foreground/50">Flagger Comments</label>
                        <p className="text-foreground">{selectedFlag.comments}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm text-foreground/50 block mb-2">
                        Resolution Notes
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add notes about this decision..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <button
                      onClick={() => handleResolve("resolved_removed")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vocl-like text-white rounded-xl font-medium hover:bg-vocl-like/90 disabled:opacity-50"
                    >
                      <IconX size={18} />
                      Remove Post
                    </button>
                    <button
                      onClick={() => handleResolve("resolved_flagged")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-500/90 disabled:opacity-50"
                    >
                      <IconAlertTriangle size={18} />
                      Mark Sensitive
                    </button>
                    <button
                      onClick={() => handleResolve("resolved_dismissed")}
                      disabled={resolving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-foreground rounded-xl font-medium hover:bg-white/20 disabled:opacity-50"
                    >
                      <IconCheck size={18} />
                      Dismiss
                    </button>
                  </div>

                  {escalationTargets.length > 0 && (
                    <button
                      onClick={() => setShowEscalate(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
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
