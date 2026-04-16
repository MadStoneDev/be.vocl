"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IconShieldLock,
  IconArrowLeft,
  IconCheck,
  IconLoader2,
  IconCopy,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui";

type Factor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
};

export default function SecuritySettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [enrolledFactor, setEnrolledFactor] = useState<Factor | null>(null);

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unenroll state
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.error("Failed to list MFA factors:", error);
      setLoading(false);
      return;
    }

    const verifiedFactor = data.totp.find((f: Factor) => f.status === "verified");
    setEnrolledFactor(verifiedFactor ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartEnroll = async () => {
    setEnrolling(true);
    setError(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "be.vocl",
    });

    if (error) {
      setError(error.message);
      setEnrolling(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setVerifying(true);
    setError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: verifyCode,
    });

    if (error) {
      setError(error.message);
      setVerifying(false);
      return;
    }

    toast.success("Two-factor authentication enabled!");
    setEnrolling(false);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    setVerifying(false);
    await loadFactors();
  };

  const handleCancelEnroll = async () => {
    // Unenroll the unverified factor if we started enrollment
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    setError(null);
  };

  const handleDisable = async () => {
    if (!enrolledFactor) return;

    setDisabling(true);
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: enrolledFactor.id,
    });

    if (error) {
      toast.error(error.message);
      setDisabling(false);
      setConfirmDisable(false);
      return;
    }

    toast.success("Two-factor authentication disabled.");
    setConfirmDisable(false);
    setDisabling(false);
    await loadFactors();
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast.success("Secret copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <title>Settings — Security | be.vocl</title>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <IconArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-foreground/60">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        {/* 2FA Enrolled State */}
        {enrolledFactor && !enrolling && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-vocl-accent/10 border border-vocl-accent/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
                <IconCheck className="w-5 h-5 text-vocl-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  Two-factor authentication is enabled
                </h3>
                <p className="text-sm text-foreground/50">
                  {enrolledFactor.friendly_name && (
                    <span>{enrolledFactor.friendly_name} &middot; </span>
                  )}
                  Added{" "}
                  {new Date(enrolledFactor.created_at).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>

            {!confirmDisable ? (
              <button
                type="button"
                onClick={() => setConfirmDisable(true)}
                className="w-full py-3 rounded-xl bg-vocl-like/10 text-vocl-like font-medium hover:bg-vocl-like/20 transition-colors flex items-center justify-center gap-2"
              >
                <IconTrash className="w-4 h-4" />
                Disable 2FA
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-vocl-like/10 border border-vocl-like/20 space-y-3">
                <p className="text-sm text-foreground">
                  Are you sure you want to disable two-factor authentication?
                  This will make your account less secure.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDisable}
                    disabled={disabling}
                    className="flex-1 py-2.5 rounded-xl bg-vocl-like text-white font-medium hover:bg-vocl-like/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {disabling ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      "Yes, disable"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisable(false)}
                    disabled={disabling}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-foreground font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2FA Not Enrolled - Initial State */}
        {!enrolledFactor && !enrolling && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <IconShieldLock className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Set up two-factor authentication
                  </h3>
                  <p className="text-sm text-foreground/50">
                    Use an authenticator app to generate verification codes
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/40 mb-4">
                Two-factor authentication adds an additional layer of security
                to your account by requiring a code from your authenticator app
                when you sign in.
              </p>
              <button
                type="button"
                onClick={handleStartEnroll}
                className="w-full py-3 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        )}

        {/* Enrollment Flow */}
        {enrolling && qrCode && (
          <div className="space-y-4">
            {/* Step 1: QR Code */}
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/10">
              <h3 className="font-medium text-foreground mb-1">
                Step 1: Scan QR code
              </h3>
              <p className="text-sm text-foreground/50 mb-4">
                Open your authenticator app and scan this QR code.
              </p>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <Image
                    src={qrCode}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                  />
                </div>
              </div>

              {/* Manual entry secret */}
              <div className="space-y-2">
                <p className="text-xs text-foreground/40">
                  Or enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 rounded-lg bg-white/5 text-sm text-foreground font-mono break-all select-all">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Copy secret"
                  >
                    <IconCopy className="w-4 h-4 text-foreground/60" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Verify */}
            <form
              onSubmit={handleVerify}
              className="p-4 rounded-xl bg-vocl-surface-dark border border-white/10 space-y-3"
            >
              <h3 className="font-medium text-foreground mb-1">
                Step 2: Enter verification code
              </h3>
              <p className="text-sm text-foreground/50">
                Enter the 6-digit code from your authenticator app.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder:text-foreground/20 focus:outline-none focus:border-vocl-accent focus:ring-1 focus:ring-vocl-accent transition-all"
                autoFocus
              />

              {error && (
                <div className="p-3 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={verifying || verifyCode.length !== 6}
                  className="flex-1 py-3 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEnroll}
                  disabled={verifying}
                  className="py-3 px-4 rounded-xl bg-white/5 text-foreground font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
