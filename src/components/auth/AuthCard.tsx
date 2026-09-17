"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateUsernameFormat } from "@/lib/validation";
import { checkUsernameAvailability } from "@/actions/profile";
import { validateInviteCode } from "@/actions/invites";
import { ageFromDob, isAtLeast, SENSITIVE_MIN_AGE } from "@/lib/age";

type AuthMode = "login" | "signup" | "forgot";

interface AuthCardProps {
  initialMode?: AuthMode;
}

const errorMessages: Record<string, string> = {
  auth_callback_error: "Authentication failed. Please try again.",
  link_expired: "This link has expired. Please request a new one.",
  verification_failed: "Verification failed. The link may be invalid or already used.",
  invalid_callback: "Invalid authentication request.",
};

const TEXT_ACTION =
  "font-sans text-[10.5px] tracking-[0.16em] uppercase text-meta hover:text-accent transition-colors";

/** Broadsheet form field (artboard 2C): a mono label above a Source Serif value
 *  on a 1px bottom rule — ink when filled/focused, faint when empty. No box. */
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  mono,
  password,
  showPassword,
  onToggleShow,
  inputRef,
  disabled,
  autoComplete,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  password?: boolean;
  showPassword?: boolean;
  onToggleShow?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  autoComplete?: string;
  maxLength?: number;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <label className="slug text-meta-dim mb-2 block">{label}</label>
      <div
        className={`flex items-baseline justify-between gap-3 border-b pb-2 transition-colors focus-within:border-foreground ${
          value ? "border-foreground" : "border-rule"
        }`}
      >
        <input
          ref={inputRef}
          type={password && !showPassword ? "password" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`w-full bg-transparent text-ink placeholder:text-meta-dim focus:outline-none disabled:opacity-50 ${
            mono ? "font-mono text-base tracking-[0.08em]" : "font-serif text-[17px]"
          }`}
        />
        {password && (
          <button type="button" onClick={onToggleShow} className={`${TEXT_ACTION} flex-none`}>
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {hint}
    </div>
  );
}

export function AuthCard({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [checkingInviteCode, setCheckingInviteCode] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) setError(errorMessages[errorParam] || "An authentication error occurred.");
  }, [searchParams]);

  useEffect(() => {
    if (mode === "login") emailRef.current?.focus();
    else if (mode === "signup") usernameRef.current?.focus();
  }, [mode]);

  const validateUsername = useCallback(async (value: string) => {
    if (!value) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }
    const formatResult = validateUsernameFormat(value);
    if (!formatResult.valid) {
      setUsernameError(formatResult.error || null);
      setUsernameAvailable(null);
      return;
    }
    setUsernameError(null);
    setCheckingUsername(true);
    const result = await checkUsernameAvailability(value);
    setCheckingUsername(false);
    if (!result.available) {
      setUsernameError(result.error || "Username is not available");
      setUsernameAvailable(false);
    } else {
      setUsernameError(null);
      setUsernameAvailable(true);
    }
  }, []);

  useEffect(() => {
    if (mode !== "signup" || !username) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(() => validateUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, mode, validateUsername]);

  const checkInviteCode = useCallback(async (value: string) => {
    if (!value) {
      setInviteCodeError(null);
      setInviteCodeValid(null);
      return;
    }
    const formatted = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const codePattern = /^VOCL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!codePattern.test(formatted)) {
      setInviteCodeError(null);
      setInviteCodeValid(null);
      return;
    }
    setCheckingInviteCode(true);
    const result = await validateInviteCode(formatted);
    setCheckingInviteCode(false);
    if (!result.valid) {
      setInviteCodeError(result.error || "Invalid code");
      setInviteCodeValid(false);
    } else {
      setInviteCodeError(null);
      setInviteCodeValid(true);
    }
  }, []);

  useEffect(() => {
    if (mode !== "signup" || !inviteCode) {
      setInviteCodeError(null);
      setInviteCodeValid(null);
      return;
    }
    const timer = setTimeout(() => checkInviteCode(inviteCode), 500);
    return () => clearTimeout(timer);
  }, [inviteCode, mode, checkInviteCode]);

  // Auto-format an invite code as the member types: VOCL-XXXX-XXXX.
  const formatInvite = (raw: string) => {
    let val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (val.length > 4 && !val.startsWith("VOCL")) val = "VOCL" + val;
    if (val.length > 4) val = val.slice(0, 4) + "-" + val.slice(4);
    if (val.length > 9) val = val.slice(0, 9) + "-" + val.slice(9, 13);
    setInviteCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        if (mode === "forgot") {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
          });
          if (resetError) {
            setError(resetError.message);
            return;
          }
          setSuccess("Check your email for the password reset link.");
        } else if (mode === "signup") {
          const formattedCode = inviteCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");
          const codePattern = /^VOCL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
          if (!formattedCode || !codePattern.test(formattedCode)) {
            setError("A valid invite code is required to join during beta.");
            return;
          }
          const inviteResult = await validateInviteCode(formattedCode);
          if (!inviteResult.valid) {
            setError(inviteResult.error || "Invalid invite code");
            return;
          }
          const formatResult = validateUsernameFormat(username);
          if (!formatResult.valid) {
            setError(formatResult.error || "Invalid username");
            return;
          }
          const availabilityResult = await checkUsernameAvailability(username);
          if (!availabilityResult.available) {
            setError(availabilityResult.error || "Username is not available");
            return;
          }
          // 21+ age gate (self-attested). Blocked here for UX; the handle_new_user
          // trigger is the server-side backstop that also aborts under-21 signups.
          if (!dob) {
            setError("Enter your date of birth to confirm you're 21 or older.");
            return;
          }
          if (!isAtLeast(dob, SENSITIVE_MIN_AGE)) {
            setError(`You must be ${SENSITIVE_MIN_AGE} or older to join be.vocl.`);
            return;
          }
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                username: username.toLowerCase().trim(),
                display_name: username,
                invite_code: formattedCode,
                date_of_birth: dob,
              },
            },
          });
          if (signUpError) {
            setError(signUpError.message);
            return;
          }
          setSuccess("Check your email for the confirmation link.");
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError(signInError.message);
            return;
          }
          window.location.href = "/feed";
        }
      } catch {
        setError("An unexpected error occurred.");
      }
    });
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      });
      if (magicLinkError) {
        if (/signups not allowed/i.test(magicLinkError.message)) {
          setError(
            "No account found for that email. be.vocl is invite-only during beta — join with an invite code first.",
          );
        } else {
          setError(magicLinkError.message);
        }
        return;
      }
      setSuccess("Check your email for the sign-in link.");
    });
  };

  const dateline = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const accentBtn =
    "block w-full text-center bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs py-3.5 transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed";
  const outlineBtn =
    "block w-full text-center border border-foreground text-ink font-sans font-medium uppercase tracking-[0.16em] text-xs py-3 transition-colors hover:bg-vocl-hover";

  const feedback = (
    <>
      {error && <p className="editorial-caption text-accent mt-4">{error}</p>}
      {success && <p className="editorial-caption text-meta mt-4">{success}</p>}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-14">
      {/* Utility bar */}
      <div className="flex items-center justify-between border-b border-rule py-3.5">
        <span className="slug text-meta-dim">EST. 2026 · LATE EDITION · NO. 0311</span>
        <span className="flex gap-5 byline text-meta">
          <a href="/" className="hover:text-accent transition-colors">Front page</a>
          <a href="/terms" className="hover:text-accent transition-colors">The terms</a>
        </span>
      </div>

      {/* Wordmark band */}
      <div className="text-center py-8 sm:py-9">
        <div className="font-display text-5xl leading-[0.95] tracking-[-0.01em] text-accent sm:text-[78px]">
          be.vocl
        </div>
        <div className="font-display mt-2.5 text-[11px] uppercase tracking-[0.34em] text-ink sm:text-[15px] sm:tracking-[0.42em]">
          Your Daily Voice
        </div>
      </div>

      {/* Dateline */}
      <div className="grid grid-cols-1 items-center gap-2 border-t border-rule rule-double-b py-2.5 text-center sm:grid-cols-[1fr_auto_1fr] sm:text-left byline text-meta">
        <span>{dateline}</span>
        <span className="stamp-21 justify-self-center">21+ · Adults Only</span>
        <span className="hidden sm:block sm:text-right">No ads · No data brokers · No algorithm</span>
      </div>

      {/* Body grid: tonight's page | form column */}
      <div className="grid grid-cols-1 pt-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:pt-10">
        {/* LEFT — tonight's page */}
        <div className="mb-12 lg:mb-0 lg:pr-14">
          <div className="kicker kicker-accent mb-3">On the front page tonight</div>
          <h1 className="font-display mb-4 text-4xl leading-[1.03] tracking-[-0.015em] text-ink sm:text-[52px]">
            Say the thing you can&apos;t say anywhere else.
          </h1>
          <p className="editorial-deck mb-5 max-w-[52ch] text-editorial-body">
            Under your name, or a name you choose. Read by the people you decide on — and nobody else, ever.
          </p>
          <div className="ph-image aspect-[3/2] w-full" aria-hidden="true" />
          <p className="editorial-caption mt-2.5">
            Tonight&apos;s lead, published publicly by @mardusurge at 02:14.
          </p>
          <div className="mt-8 grid grid-cols-1 border-t border-rule pt-6 sm:grid-cols-3">
            {[
              ["Pen names", "write under as many names as you need. Nobody can tie them together."],
              ["You decide who sees it", "every post carries its own audience."],
              ["21+ only", "verified at the door, no exceptions."],
            ].map(([lead, body], i) => (
              <p
                key={lead}
                className={`editorial-body text-editorial-body mb-4 sm:mb-0 ${
                  i === 0 ? "sm:pr-6" : "sm:border-l sm:border-rule sm:px-6"
                }`}
              >
                <span className="run-in mr-1.5">{lead} —</span>
                {body}
              </p>
            ))}
          </div>
        </div>

        {/* RIGHT — form column */}
        <div className="lg:border-l lg:border-rule lg:pl-10">
          {mode === "login" && (
            <>
              <div className="slug border-b border-rule pb-3 text-meta">Sign in</div>
              <h2 className="font-display mb-6 mt-5 text-[32px] leading-[1.08] text-ink">
                Welcome back to the paper.
              </h2>
              <form onSubmit={handleSubmit}>
                <Field
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  inputRef={emailRef}
                  disabled={isPending}
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  password
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((s) => !s)}
                  disabled={isPending}
                  autoComplete="current-password"
                />
                {feedback}
                <button type="submit" disabled={isPending || !email || !password} className={`mt-7 ${accentBtn}`}>
                  {isPending ? "Signing in…" : "Sign in"}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={handleMagicLink} disabled={isPending} className={TEXT_ACTION}>
                  Email me a sign-in link
                </button>
                <button type="button" onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }} className={TEXT_ACTION}>
                  Forgot password
                </button>
              </div>

              {/* Join block */}
              <div className="mt-9 rule-double pt-7">
                <div className="kicker kicker-accent mb-3">No account yet</div>
                <p className="editorial-body mb-5 text-ink-secondary">
                  be.vocl opens by invitation. Enter the code a member gave you — one code, one seat.
                </p>
                <Field
                  label="Invite code"
                  value={inviteCode}
                  onChange={formatInvite}
                  mono
                  placeholder="VOCL-XXXX-XXXX"
                  maxLength={14}
                />
                <button type="button" onClick={() => { setMode("signup"); setError(null); setSuccess(null); }} className={`mt-6 ${outlineBtn}`}>
                  Redeem &amp; join
                </button>
                <p className="editorial-caption mt-4 text-meta">
                  You&apos;ll confirm you&apos;re 21 or older when you join. We ask once, and it stays private.
                </p>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <div className="slug border-b border-rule pb-3 text-accent">No account yet</div>
              <h2 className="font-display mb-6 mt-5 text-[32px] leading-[1.08] text-ink">
                Redeem your invitation.
              </h2>
              <form onSubmit={handleSubmit}>
                <Field
                  label="Invite code"
                  value={inviteCode}
                  onChange={formatInvite}
                  mono
                  placeholder="VOCL-XXXX-XXXX"
                  maxLength={14}
                  disabled={isPending}
                  hint={
                    inviteCodeError ? (
                      <p className="editorial-caption mt-2 text-accent">{inviteCodeError}</p>
                    ) : inviteCodeValid ? (
                      <p className="editorial-caption mt-2 text-meta not-italic">Valid invite code.</p>
                    ) : checkingInviteCode ? (
                      <p className="editorial-caption mt-2 text-meta">Validating…</p>
                    ) : (
                      <p className="editorial-caption mt-2 text-meta">One code, one seat.</p>
                    )
                  }
                />
                <Field
                  label="Username"
                  value={username}
                  onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  inputRef={usernameRef}
                  disabled={isPending}
                  maxLength={20}
                  hint={
                    usernameError ? (
                      <p className="editorial-caption mt-2 text-accent">{usernameError}</p>
                    ) : username && usernameAvailable ? (
                      <p className="editorial-caption mt-2 text-meta not-italic">Available.</p>
                    ) : username && checkingUsername ? (
                      <p className="editorial-caption mt-2 text-meta">Checking…</p>
                    ) : (
                      <p className="editorial-caption mt-2 text-meta">3–20 characters, starts with a letter.</p>
                    )
                  }
                />
                <Field label="Email" value={email} onChange={setEmail} type="email" disabled={isPending} autoComplete="email" />
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  password
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((s) => !s)}
                  disabled={isPending}
                  autoComplete="new-password"
                />
                <Field
                  label="Date of birth"
                  value={dob}
                  onChange={setDob}
                  type="date"
                  disabled={isPending}
                  autoComplete="bday"
                  hint={
                    dob && ageFromDob(dob) !== null && !isAtLeast(dob, SENSITIVE_MIN_AGE) ? (
                      <p className="editorial-caption mt-2 text-accent">
                        You must be {SENSITIVE_MIN_AGE} or older to join be.vocl.
                      </p>
                    ) : dob && isAtLeast(dob, SENSITIVE_MIN_AGE) ? (
                      <p className="editorial-caption mt-2 text-meta not-italic">
                        Thanks — that confirms you&apos;re {SENSITIVE_MIN_AGE}+.
                      </p>
                    ) : (
                      <p className="editorial-caption mt-2 text-meta">
                        be.vocl is {SENSITIVE_MIN_AGE}+. We record this once; it can&apos;t be changed later.
                      </p>
                    )
                  }
                />
                {feedback}
                <button
                  type="submit"
                  disabled={isPending || !isAtLeast(dob, SENSITIVE_MIN_AGE)}
                  className={`mt-7 ${accentBtn}`}
                >
                  {isPending ? "Creating account…" : "Redeem & join"}
                </button>
              </form>
              <button type="button" onClick={() => { setMode("login"); setError(null); setSuccess(null); }} className={`${TEXT_ACTION} mt-5`}>
                ← Already a member? Sign in
              </button>
              <p className="editorial-caption mt-6 text-meta">
                We record your date of birth once to confirm you&apos;re {SENSITIVE_MIN_AGE}+; it isn&apos;t shown on your profile. By joining you agree to the{" "}
                <a href="/terms" className="text-ink hover:text-accent transition-colors">Terms</a> and{" "}
                <a href="/privacy" className="text-ink hover:text-accent transition-colors">Privacy Policy</a>.
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div className="slug border-b border-rule pb-3 text-meta">Account recovery</div>
              <h2 className="font-display mb-4 mt-5 text-[32px] leading-[1.08] text-ink">Reset your password.</h2>
              <p className="editorial-body mb-2 text-meta">
                Enter your email and we&apos;ll send you a link to set a new one.
              </p>
              <form onSubmit={handleSubmit}>
                <Field label="Email" value={email} onChange={setEmail} type="email" inputRef={emailRef} disabled={isPending} autoComplete="email" />
                {feedback}
                <button type="submit" disabled={isPending || !email} className={`mt-7 ${accentBtn}`}>
                  {isPending ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <button type="button" onClick={() => { setMode("login"); setError(null); setSuccess(null); }} className={`${TEXT_ACTION} mt-5`}>
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile footer slug */}
      <p className="slug mt-10 text-center text-meta-dim lg:hidden">
        Terms · Privacy · Content policy · 21+
      </p>
    </div>
  );
}
