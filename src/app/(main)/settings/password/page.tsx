"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconCheck,
  IconArrowLeft,
} from "@tabler/icons-react";
import Link from "next/link";
import { toast, LoadingSpinner } from "@/components/ui";

function PasswordSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const isReset = searchParams.get("reset") === "true";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user has a session (required for password update)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?error=session_expired");
      }
    };
    checkSession();
  }, [supabase.auth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    startTransition(async () => {
      // For a normal change (not a reset-link flow), verify the current password
      // by re-authenticating before allowing the update.
      if (!isReset) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) {
          setError("Couldn't verify your account. Please sign in again.");
          return;
        }
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (verifyError) {
          setError("Your current password is incorrect");
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      toast.success("Password updated successfully!");

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/settings");
      }, 2000);
    });
  };

  if (success) {
    return (
      <div className="py-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <IconCheck className="w-8 h-8 text-vocl-primary" />
          </div>
          <h1 className="type-display font-display text-ink mb-2">Password Updated</h1>
          <p className="text-foreground/60 mb-6">
            Your password has been changed successfully.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:opacity-[0.88] text-white  transition-colors"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <title>Settings — Password | be.vocl</title>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-rule pb-5">
          <Link
            href="/settings"
            className="slug text-meta hover:text-accent transition-colors"
          >
            ← Settings
          </Link>
          <div className="mt-3">
            <span className="kicker kicker-accent">
              Security
            </span>
            <h1 className="type-display font-display text-ink">
              {isReset ? "Set New Password" : "Change Password"}
            </h1>
            <p className="type-body text-meta mt-1">
              {isReset
                ? "Create a new password for your account"
                : "Update your account password"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password - only show if not resetting */}
          {!isReset && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Current Password
              </label>
              <div className="relative">
                <IconLock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-meta-dim"
                />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isPending}
                  className="w-full py-3 pl-12 pr-4 border border-rule text-foreground placeholder:text-meta-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
                  required={!isReset}
                />
              </div>
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              New Password
            </label>
            <div className="relative">
              <IconLock
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-meta-dim"
              />
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                className="w-full py-3 pl-12 pr-12 border border-rule text-foreground placeholder:text-meta-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-meta-dim hover:text-foreground transition-colors"
              >
                {showPasswords ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <IconLock
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-meta-dim"
              />
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="w-full py-3 pl-12 pr-4 border border-rule text-foreground placeholder:text-meta-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3  bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5  bg-accent text-white font-semibold hover:opacity-[0.88] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <IconLoader2 size={20} className="animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PasswordSettingsPage() {
  return (
    <Suspense fallback={<div className="py-6 flex justify-center"><LoadingSpinner size="lg" /></div>}>
      <PasswordSettingsContent />
    </Suspense>
  );
}
