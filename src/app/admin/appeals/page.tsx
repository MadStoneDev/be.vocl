"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  IconLoader2,
  IconUser,
  IconCheck,
  IconX,
  IconBan,
} from "@tabler/icons-react";
import {
  getAppeals,
  reviewAppeal,
  type AppealWithDetails,
} from "@/actions/admin";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "blocked", label: "Blocked" },
];

export default function AdminAppealsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending";

  const [appeals, setAppeals] = useState<AppealWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealWithDetails | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const loadAppeals = async () => {
    setIsLoading(true);
    const result = await getAppeals({ status: statusFilter });
    if (result.success && result.appeals) {
      setAppeals(result.appeals);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAppeals();
  }, [statusFilter]);

  const handleReview = async (decision: "approved" | "denied" | "blocked") => {
    if (!selectedAppeal) return;

    setReviewing(true);
    const result = await reviewAppeal(selectedAppeal.id, decision, reviewNotes);
    if (result.success) {
      setSelectedAppeal(null);
      setReviewNotes("");
      loadAppeals();
    }
    setReviewing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <title>Admin — Appeals | be.vocl</title>
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">Moderation</div>
          <h1 className="type-display text-ink">Appeals</h1>
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
      ) : appeals.length === 0 ? (
        <p className="editorial-body text-meta py-16 text-center">No appeals found.</p>
      ) : (
        <div>
          {appeals.map((appeal) => (
            <div
              key={appeal.id}
              className="border-b border-rule py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`slug ${
                      appeal.status === "pending"
                        ? "text-amber-500"
                        : appeal.status === "approved"
                        ? "text-green-500"
                        : appeal.status === "denied"
                        ? "text-vocl-like"
                        : "text-purple-500"
                    }`}>
                      {appeal.status}
                    </span>
                    <span className="slug text-meta-dim">
                      {formatDate(appeal.createdAt)}
                    </span>
                    {appeal.appealsBlocked && (
                      <span className="slug text-purple-500">
                        Appeals Blocked
                      </span>
                    )}
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 overflow-hidden ph-image">
                      {appeal.user.avatarUrl ? (
                        <Image
                          src={appeal.user.avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconUser size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-sans text-sm font-medium text-ink">
                        @{appeal.user.username}
                      </div>
                      <div className="byline text-meta">
                        Currently: {appeal.user.lockStatus}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="border border-rule p-3 mb-3">
                    <p className="editorial-body text-ink">
                      {appeal.reason}
                    </p>
                  </div>

                  {/* Review notes if reviewed */}
                  {appeal.reviewNotes && (
                    <div className="editorial-body text-meta">
                      <span className="text-ink">Staff notes:</span>{" "}
                      {appeal.reviewNotes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {appeal.status === "pending" && (
                  <button
                    onClick={() => setSelectedAppeal(appeal)}
                    className="flex-none font-sans text-[11px] uppercase tracking-[0.16em] text-ink hover:text-accent transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedAppeal(null)}
          />
          <div className="relative w-full max-w-lg bg-background border border-rule">
            <div className="p-6">
              <div className="kicker kicker-accent mb-2.5">Review · response sent to user</div>
              <h2 className="type-heading text-ink mb-4">
                Review Appeal from @{selectedAppeal.user.username}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="border border-rule p-4">
                  <label className="slug text-meta-dim block mb-1">
                    Appeal Reason
                  </label>
                  <p className="editorial-body text-ink">{selectedAppeal.reason}</p>
                </div>

                <div>
                  <label className="slug text-meta-dim block mb-2">
                    Your Response (will be sent to user)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Explain your decision..."
                    rows={3}
                    className="w-full border border-rule bg-transparent p-3 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-green-500 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconCheck size={18} />
                  Approve
                </button>
                <button
                  onClick={() => handleReview("denied")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-vocl-like hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconX size={18} />
                  Deny
                </button>
                <button
                  onClick={() => handleReview("blocked")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-purple-500 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconBan size={18} />
                  Block Appeals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
