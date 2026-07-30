"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconShieldLock, IconLoader2 } from "@tabler/icons-react";

/**
 * Step-up MFA challenge. The proxy redirects any signed-in user who has an
 * enrolled TOTP factor but only an AAL1 session here, so opting into 2FA
 * actually gates every login. Completing the challenge raises the session to
 * AAL2 and returns the user to where they were headed.
 */
export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <IconLoader2 className="w-6 h-6 animate-spin text-foreground/40" />
        </div>
      }
    >
      <MfaChallenge />
    </Suspense>
  );
}

function MfaChallenge() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/feed";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const totp =
        data.totp.find((f: { status: string }) => f.status === "verified") ??
        data.totp[0];
      if (!totp) {
        // No factor to challenge — nothing to step up to.
        router.replace(next);
        return;
      }
      setFactorId(totp.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setError(error.message);
      setVerifying(false);
      return;
    }

    // Session is now AAL2 — full navigation so the proxy re-reads the cookies.
    window.location.assign(next);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-vocl-primary/15 flex items-center justify-center mb-3">
            <IconShieldLock className="w-6 h-6 text-vocl-primary" />
          </div>
          <h1 className="type-display font-display text-foreground">
            Two-factor authentication
          </h1>
          <p className="text-sm text-foreground/55 mt-1">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <IconLoader2 className="w-6 h-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          <form
            onSubmit={handleVerify}
            className="p-5 rounded-sm bg-vocl-surface-dark border border-vocl-border space-y-4"
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full py-3 px-4 rounded-sm bg-vocl-hover border border-vocl-border text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder:text-foreground/20 focus:outline-none focus:border-vocl-primary focus:ring-1 focus:ring-vocl-primary transition-all"
              autoFocus
            />

            {error && (
              <div className="p-3 rounded-sm bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full py-3 rounded-sm bg-vocl-primary text-white font-semibold hover:bg-vocl-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-sm text-foreground/50 hover:text-foreground transition-colors"
            >
              Sign out instead
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
