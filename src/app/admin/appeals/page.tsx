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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Appeals</h1>

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
      ) : appeals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/50">No appeals found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <div
              key={appeal.id}
              className="bg-vocl-surface-dark rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      appeal.status === "pending"
                        ? "bg-amber-500/20 text-amber-500"
                        : appeal.status === "approved"
                        ? "bg-green-500/20 text-green-500"
                        : appeal.status === "denied"
                        ? "bg-vocl-like/20 text-vocl-like"
                        : "bg-purple-500/20 text-purple-500"
                    }`}>
                      {appeal.status}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {formatDate(appeal.createdAt)}
                    </span>
                    {appeal.appealsBlocked && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500">
                        Appeals Blocked
                      </span>
                    )}
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-vocl-surface-dark overflow-hidden">
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
                      <div className="font-medium text-foreground">
                        @{appeal.user.username}
                      </div>
                      <div className="text-xs text-foreground/50">
                        Currently: {appeal.user.lockStatus}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-white/5 rounded-xl p-3 mb-3">
                    <p className="text-sm text-foreground">
                      {appeal.reason}
                    </p>
                  </div>

                  {/* Review notes if reviewed */}
                  {appeal.reviewNotes && (
                    <div className="text-sm text-foreground/60">
                      <span className="font-medium">Staff notes:</span>{" "}
                      {appeal.reviewNotes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {appeal.status === "pending" && (
                  <button
                    onClick={() => setSelectedAppeal(appeal)}
                    className="px-4 py-2 bg-vocl-accent text-white rounded-xl text-sm font-medium hover:bg-vocl-accent-hover transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedAppeal(null)}
          />
          <div className="relative w-full max-w-lg mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Review Appeal from @{selectedAppeal.user.username}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <label className="text-sm text-foreground/50 block mb-1">
                    Appeal Reason
                  </label>
                  <p className="text-foreground">{selectedAppeal.reason}</p>
                </div>

                <div>
                  <label className="text-sm text-foreground/50 block mb-2">
                    Your Response (will be sent to user)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Explain your decision..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-500/90 disabled:opacity-50"
                >
                  <IconCheck size={18} />
                  Approve
                </button>
                <button
                  onClick={() => handleReview("denied")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vocl-like text-white rounded-xl font-medium hover:bg-vocl-like/90 disabled:opacity-50"
                >
                  <IconX size={18} />
                  Deny
                </button>
                <button
                  onClick={() => handleReview("blocked")}
                  disabled={reviewing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-500/90 disabled:opacity-50"
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
