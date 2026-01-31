"use client";

import { useState } from "react";
import { IconX, IconFlag, IconCheck } from "@tabler/icons-react";
import { reportUser } from "@/actions/reports";
import { flagPost } from "@/actions/flags";
import type { ReportSubject, FlagSubject } from "@/types/database";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId?: string;
  postId?: string;
  reportedUsername?: string;
}

// Subjects for user reports
const USER_REPORT_SUBJECTS = [
  {
    value: "minor_safety",
    label: "Harmful content involving minors",
    description: "Content that exploits or endangers children",
  },
  {
    value: "non_consensual",
    label: "Non-consensual content",
    description: "Content shared without the subject's consent",
  },
  {
    value: "harassment",
    label: "Harassment or bullying",
    description: "Targeted harassment, threats, or intimidation",
  },
  {
    value: "spam",
    label: "Spam or misleading",
    description: "Spam, scams, or intentionally misleading content",
  },
  {
    value: "illegal",
    label: "Illegal activity",
    description: "Content promoting illegal activities",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

// Subjects for post flags (includes additional options)
const POST_FLAG_SUBJECTS = [
  ...USER_REPORT_SUBJECTS.slice(0, -1), // All except "other"
  {
    value: "copyright",
    label: "Copyright infringement",
    description: "Content that violates intellectual property rights",
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "False or misleading information",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  postId,
  reportedUsername,
}: ReportModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a post flag or user report
  const isPostFlag = !!postId;
  const subjects = isPostFlag ? POST_FLAG_SUBJECTS : USER_REPORT_SUBJECTS;

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    setIsSubmitting(true);
    setError(null);

    let result;

    if (isPostFlag) {
      // Flag the post
      result = await flagPost(
        postId,
        selectedSubject as FlagSubject,
        comments.trim() || undefined
      );
    } else if (reportedUserId) {
      // Report the user
      result = await reportUser(
        reportedUserId,
        selectedSubject as ReportSubject,
        comments.trim() || undefined
      );
    } else {
      setError("No content to report");
      setIsSubmitting(false);
      return;
    }

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Failed to submit report");
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    setSelectedSubject(null);
    setComments("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconFlag size={20} className="text-vocl-like" />
            <h2 className="text-lg font-semibold text-foreground">
              {submitted
                ? isPostFlag
                  ? "Flag Submitted"
                  : "Report Submitted"
                : isPostFlag
                  ? "Flag Post"
                  : "Report User"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <IconCheck size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Thank you for reporting
              </h3>
              <p className="text-sm text-foreground/60">
                Our team will review this report and take appropriate action.
                Your report is anonymous to the reported user.
              </p>
            </div>
          ) : (
            <>
              {reportedUsername && (
                <p className="text-sm text-foreground/60 mb-4">
                  Reporting{" "}
                  <span className="font-medium text-foreground">
                    @{reportedUsername}
                  </span>
                  {postId && "'s post"}
                </p>
              )}

              {/* Subject selection */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-foreground">
                  What's the issue?
                </label>
                {subjects.map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => setSelectedSubject(subject.value)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedSubject === subject.value
                        ? "border-vocl-accent bg-vocl-accent/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium text-sm text-foreground">
                      {subject.label}
                    </div>
                    <div className="text-xs text-foreground/50 mt-0.5">
                      {subject.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Additional comments */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground block mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide any additional context..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-vocl-like mb-4">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex gap-3 p-4 border-t border-white/5">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedSubject || isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-vocl-like text-white font-medium hover:bg-vocl-like/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
