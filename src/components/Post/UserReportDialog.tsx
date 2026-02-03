"use client";

import { useState, useTransition } from "react";
import {
  IconX,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { reportUser } from "@/actions/reports";
import type { ReportSubject } from "@/types/database";

interface UserReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSuccess?: () => void;
}

const reportReasons: { value: ReportSubject; label: string; description: string }[] = [
  {
    value: "harassment",
    label: "Harassment or bullying",
    description: "Targeting someone with harmful behavior",
  },
  {
    value: "spam",
    label: "Spam or scam",
    description: "Fake accounts, misleading content, or scams",
  },
  {
    value: "minor_safety",
    label: "Child safety concern",
    description: "Content or behavior that may harm minors",
  },
  {
    value: "non_consensual",
    label: "Non-consensual content",
    description: "Sharing intimate content without consent",
  },
  {
    value: "illegal",
    label: "Illegal activity",
    description: "Threats, violence, or illegal behavior",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export function UserReportDialog({
  isOpen,
  onClose,
  userId,
  username,
  onSuccess,
}: UserReportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedReason, setSelectedReason] = useState<ReportSubject | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) {
      setError("Please select a reason for your report");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await reportUser(userId, selectedReason, details || undefined);

      if (result.success) {
        setSubmitted(true);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to submit report");
      }
    });
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails("");
    setError(null);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-vocl-surface-dark rounded-3xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={20} className="text-vocl-like" />
            <h2 className="font-semibold text-foreground">Report @{username}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {submitted ? (
            /* Success state */
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <IconAlertTriangle size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Report Submitted
              </h3>
              <p className="text-foreground/60 text-sm mb-6">
                Thank you for helping keep our community safe. We&apos;ll review
                this report and take appropriate action.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Report form */
            <div className="space-y-4">
              <p className="text-sm text-foreground/60">
                Help us understand why you&apos;re reporting this user. Your report
                is confidential and will be reviewed by our team.
              </p>

              {/* Reason selection */}
              <div className="space-y-2">
                {reportReasons.map((reason) => (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => setSelectedReason(reason.value)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedReason === reason.value
                        ? "bg-vocl-accent/20 border-2 border-vocl-accent"
                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <p className="font-medium text-foreground text-sm">
                      {reason.label}
                    </p>
                    <p className="text-foreground/50 text-xs mt-0.5">
                      {reason.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Additional details */}
              {selectedReason && (
                <div>
                  <label className="block text-sm text-foreground/60 mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide any additional context..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none text-sm"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
                  <IconAlertTriangle size={18} />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !selectedReason}
                className="px-6 py-2.5 rounded-xl bg-vocl-like text-white font-semibold hover:bg-vocl-like/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
