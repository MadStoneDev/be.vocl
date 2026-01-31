"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBan,
  IconAlertTriangle,
  IconLoader2,
  IconLogout,
  IconMessageReport,
  IconCheck,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import { getUserLockStatus } from "@/actions/account";
import { submitAppeal, getUserAppealStatus } from "@/actions/appeals";
import { createBrowserClient } from "@/lib/supabase/client";

type AppealStatus = "none" | "pending" | "approved" | "denied" | "blocked";

interface AppealInfo {
  status: AppealStatus;
  reason?: string;
  reviewNotes?: string;
  createdAt?: string;
}

export default function AccountStatusPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lockStatus, setLockStatus] = useState<"unlocked" | "restricted" | "banned">("unlocked");
  const [banReason, setBanReason] = useState<string | undefined>();
  const [appealInfo, setAppealInfo] = useState<AppealInfo>({ status: "none" });
  const [appealReason, setAppealReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      const statusResult = await getUserLockStatus();
      if (statusResult.success && statusResult.lockStatus) {
        setLockStatus(statusResult.lockStatus);
        setBanReason(statusResult.banReason);

        // If unlocked, redirect to feed
        if (statusResult.lockStatus === "unlocked") {
          router.push("/feed");
          return;
        }
      }

      const appealResult = await getUserAppealStatus();
      if (appealResult.success) {
        setAppealInfo({
          status: appealResult.status || "none",
          reason: appealResult.reason,
          reviewNotes: appealResult.reviewNotes,
          createdAt: appealResult.createdAt,
        });
      }

      setIsLoading(false);
    };

    loadStatus();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      setSubmitError("Please provide a reason for your appeal");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    const result = await submitAppeal(appealReason);

    if (result.success) {
      setSubmitSuccess(true);
      setAppealInfo({ status: "pending", reason: appealReason });
    } else {
      setSubmitError(result.error || "Failed to submit appeal");
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  const isBanned = lockStatus === "banned";
  const canAppeal = appealInfo.status === "none" || appealInfo.status === "denied";
  const appealsBlocked = appealInfo.status === "blocked";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Status Card */}
        <div className="bg-vocl-surface-dark rounded-2xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className={`p-6 ${isBanned ? "bg-vocl-like/10" : "bg-amber-500/10"}`}>
            <div className="flex items-center gap-3">
              {isBanned ? (
                <div className="w-12 h-12 rounded-full bg-vocl-like/20 flex items-center justify-center">
                  <IconBan size={24} className="text-vocl-like" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <IconAlertTriangle size={24} className="text-amber-500" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isBanned ? "Account Banned" : "Account Restricted"}
                </h1>
                <p className="text-sm text-foreground/60">
                  {isBanned
                    ? "Your account has been suspended"
                    : "Your account has limited functionality"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reason */}
            {banReason && (
              <div>
                <h2 className="text-sm font-medium text-foreground/50 mb-2">Reason</h2>
                <p className="text-foreground bg-white/5 rounded-xl p-4">
                  {banReason}
                </p>
              </div>
            )}

            {/* What this means */}
            <div>
              <h2 className="text-sm font-medium text-foreground/50 mb-2">
                What this means
              </h2>
              <ul className="space-y-2 text-foreground/80">
                {isBanned ? (
                  <>
                    <li className="flex items-start gap-2">
                      <IconX size={16} className="text-vocl-like mt-0.5 shrink-0" />
                      <span>You cannot access the platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconX size={16} className="text-vocl-like mt-0.5 shrink-0" />
                      <span>Your profile is hidden from other users</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconX size={16} className="text-vocl-like mt-0.5 shrink-0" />
                      <span>Your posts are no longer visible</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <IconAlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>You cannot create new posts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconAlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>You cannot send messages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconCheck size={16} className="text-green-500 mt-0.5 shrink-0" />
                      <span>You can still browse and view content</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Appeal Section */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <IconMessageReport size={20} className="text-vocl-accent" />
                <h2 className="font-medium text-foreground">Appeal</h2>
              </div>

              {appealsBlocked ? (
                <div className="bg-vocl-like/10 rounded-xl p-4">
                  <p className="text-vocl-like font-medium">Appeals Blocked</p>
                  <p className="text-sm text-foreground/60 mt-1">
                    Your ability to submit appeals has been revoked due to previous abuse.
                  </p>
                </div>
              ) : appealInfo.status === "pending" ? (
                <div className="bg-amber-500/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-500 font-medium">
                    <IconClock size={18} />
                    <span>Appeal Pending</span>
                  </div>
                  <p className="text-sm text-foreground/60 mt-2">
                    Your appeal is being reviewed by our team. You will receive an email
                    when a decision has been made.
                  </p>
                  {appealInfo.reason && (
                    <div className="mt-3 pt-3 border-t border-amber-500/20">
                      <p className="text-xs text-foreground/40 mb-1">Your appeal:</p>
                      <p className="text-sm text-foreground/70">{appealInfo.reason}</p>
                    </div>
                  )}
                </div>
              ) : appealInfo.status === "approved" ? (
                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-500 font-medium">
                    <IconCheck size={18} />
                    <span>Appeal Approved</span>
                  </div>
                  <p className="text-sm text-foreground/60 mt-2">
                    Your appeal has been approved. Your account restrictions will be lifted shortly.
                  </p>
                  {appealInfo.reviewNotes && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <p className="text-xs text-foreground/40 mb-1">Staff response:</p>
                      <p className="text-sm text-foreground/70">{appealInfo.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ) : appealInfo.status === "denied" ? (
                <div className="space-y-4">
                  <div className="bg-vocl-like/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-vocl-like font-medium">
                      <IconX size={18} />
                      <span>Previous Appeal Denied</span>
                    </div>
                    {appealInfo.reviewNotes && (
                      <div className="mt-3 pt-3 border-t border-vocl-like/20">
                        <p className="text-xs text-foreground/40 mb-1">Staff response:</p>
                        <p className="text-sm text-foreground/70">{appealInfo.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground/60">
                    You may submit another appeal if you have new information.
                  </p>
                </div>
              ) : null}

              {/* Appeal Form */}
              {canAppeal && !submitSuccess && (
                <div className="mt-4 space-y-4">
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Explain why you believe this action was made in error..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                  />
                  {submitError && (
                    <p className="text-sm text-vocl-like">{submitError}</p>
                  )}
                  <button
                    onClick={handleSubmitAppeal}
                    disabled={isSubmitting || !appealReason.trim()}
                    className="w-full px-4 py-3 bg-vocl-accent text-white rounded-xl font-medium hover:bg-vocl-accent-hover disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Appeal"}
                  </button>
                </div>
              )}

              {submitSuccess && (
                <div className="bg-green-500/10 rounded-xl p-4 mt-4">
                  <p className="text-green-500 font-medium">Appeal Submitted</p>
                  <p className="text-sm text-foreground/60 mt-1">
                    We'll review your appeal and get back to you via email.
                  </p>
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-white/10 pt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-foreground/70 hover:bg-white/5 transition-colors"
              >
                <IconLogout size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-foreground/40 mt-6">
          If you believe this is an error, please contact support at{" "}
          <a href="mailto:support@vocl.app" className="text-vocl-accent hover:underline">
            support@vocl.app
          </a>
        </p>
      </div>
    </div>
  );
}
