"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IconBrandGoogle,
  IconBrandGithub,
  IconMail,
  IconLock,
  IconUser,
  IconLoader2,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconTicket,
} from "@tabler/icons-react";
import { validateUsernameFormat } from "@/lib/validation";
import { checkUsernameAvailability } from "@/actions/profile";
import { validateInviteCode } from "@/actions/invites";
import Logo from "@/components/logo";

type AuthMode = "login" | "signup" | "forgot";

interface AuthCardProps {
  initialMode?: AuthMode;
}

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  auth_callback_error: "Authentication failed. Please try again.",
  link_expired: "This link has expired. Please request a new one.",
  verification_failed: "Verification failed. The link may be invalid or already used.",
  invalid_callback: "Invalid authentication request.",
};

export function AuthCard({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Username validation state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Invite code state (required for beta)
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [checkingInviteCode, setCheckingInviteCode] = useState(false);

  // Check for error in URL params (from auth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorMessages[errorParam] || "An authentication error occurred.");
    }
  }, [searchParams]);

  // Validate username on change with debouncing
  const validateUsername = useCallback(async (value: string) => {
    if (!value) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    // First check format
    const formatResult = validateUsernameFormat(value);
    if (!formatResult.valid) {
      setUsernameError(formatResult.error || null);
      setUsernameAvailable(null);
      return;
    }

    // Format is valid, check availability
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

  // Debounced username validation
  useEffect(() => {
    if (mode !== "signup" || !username) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(() => {
      validateUsername(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, mode, validateUsername]);

  // Validate invite code on change with debouncing
  const checkInviteCode = useCallback(async (value: string) => {
    if (!value) {
      setInviteCodeError(null);
      setInviteCodeValid(null);
      return;
    }

    // Format check: should match VOCL-XXXX-XXXX pattern
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

  // Debounced invite code validation
  useEffect(() => {
    if (mode !== "signup" || !inviteCode) {
      setInviteCodeError(null);
      setInviteCodeValid(null);
      return;
    }

    const timer = setTimeout(() => {
      checkInviteCode(inviteCode);
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCode, mode, checkInviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        if (mode === "forgot") {
          // Password reset / magic link
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo: `${window.location.origin}/auth/callback`,
            }
          );

          if (resetError) {
            setError(resetError.message);
            return;
          }

          setSuccess("Check your email for the password reset link!");
        } else if (mode === "signup") {
          // Validate invite code (required for beta)
          const formattedCode = inviteCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");
          const codePattern = /^VOCL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

          if (!formattedCode || !codePattern.test(formattedCode)) {
            setError("A valid invite code is required to sign up during beta");
            return;
          }

          const inviteResult = await validateInviteCode(formattedCode);
          if (!inviteResult.valid) {
            setError(inviteResult.error || "Invalid invite code");
            return;
          }

          // Validate username format
          const formatResult = validateUsernameFormat(username);
          if (!formatResult.valid) {
            setError(formatResult.error || "Invalid username");
            return;
          }

          // Check availability one more time before signup
          const availabilityResult = await checkUsernameAvailability(username);
          if (!availabilityResult.available) {
            setError(availabilityResult.error || "Username is not available");
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
                invite_code: formattedCode, // Store for redemption after confirmation
              },
            },
          });

          if (signUpError) {
            setError(signUpError.message);
            return;
          }

          setSuccess("Check your email for the confirmation link!");
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(signInError.message);
            return;
          }

          router.push("/feed");
          router.refresh();
        }
      } catch {
        setError("An unexpected error occurred");
      }
    });
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (magicLinkError) {
        setError(magicLinkError.message);
        return;
      }

      setSuccess("Check your email for the magic link!");
    });
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo and tagline */}
      <div className="text-center mb-8">
        <Logo className="mx-auto w-60" />
        <p className="-mt-8 text-foreground/60 font-light">Share your voice freely</p>
      </div>

      {/* Auth Card */}
      <div className="bg-vocl-surface-dark/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/5">
        {/* Tab Switcher - Only show for login/signup */}
        {mode !== "forgot" ? (
          <div className="flex rounded-full bg-background/50 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-vocl-accent text-white shadow-lg"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
                mode === "signup"
                  ? "bg-vocl-accent text-white shadow-lg"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Reset your password</h2>
            <p className="text-sm text-foreground/60">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>
        )}

        {/* OAuth Buttons - Hide for forgot mode */}
        {/*{mode !== "forgot" && (*/}
        {/*  <>*/}
        {/*    <div className="space-y-2 mb-3">*/}
        {/*      <button*/}
        {/*        type="button"*/}
        {/*        onClick={() => handleOAuthSignIn("google")}*/}
        {/*        disabled={isPending}*/}
        {/*        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-white hover:bg-white text-white hover:text-gray-700 font-medium transition-all disabled:opacity-50"*/}
        {/*      >*/}
        {/*        <IconBrandGoogle size={20} />*/}
        {/*        Continue with Google*/}
        {/*      </button>*/}
        {/*      <button*/}
        {/*        type="button"*/}
        {/*        onClick={() => handleOAuthSignIn("github")}*/}
        {/*        disabled={isPending}*/}
        {/*        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-white hover:bg-white text-white hover:text-gray-700 font-medium transition-all disabled:opacity-50"*/}
        {/*      >*/}
        {/*        <IconBrandGithub size={20} />*/}
        {/*        Continue with GitHub*/}
        {/*      </button>*/}
        {/*    </div>*/}
        
        {/*    /!* Divider *!/*/}
        {/*    <div className="flex items-center gap-4 mb-3">*/}
        {/*      <div className="flex-1 h-px bg-white/10" />*/}
        {/*      <span className="text-foreground/40 text-sm">or</span>*/}
        {/*      <div className="flex-1 h-px bg-white/10" />*/}
        {/*    </div>*/}
        {/*  </>*/}
        {/*)}*/}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              {/* Invite Code Field (Beta Required) */}
              <div className="space-y-1">
                <div className="relative">
                  <IconTicket
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <input
                    type="text"
                    placeholder="Invite Code (e.g., VOCL-XXXX-XXXX)"
                    value={inviteCode}
                    onChange={(e) => {
                      // Auto-format as user types: VOCL-XXXX-XXXX
                      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      if (val.length > 4 && !val.startsWith("VOCL")) {
                        val = "VOCL" + val;
                      }
                      // Add dashes
                      if (val.length > 4) {
                        val = val.slice(0, 4) + "-" + val.slice(4);
                      }
                      if (val.length > 9) {
                        val = val.slice(0, 9) + "-" + val.slice(9, 13);
                      }
                      setInviteCode(val);
                    }}
                    disabled={isPending}
                    className={`w-full py-3 pl-12 pr-12 rounded-xl bg-background/50 border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 transition-all disabled:opacity-50 font-mono tracking-wider ${
                      inviteCodeError
                        ? "border-vocl-like focus:border-vocl-like focus:ring-vocl-like"
                        : inviteCodeValid
                        ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                        : "border-white/10 focus:border-vocl-accent focus:ring-vocl-accent"
                    }`}
                    required
                    maxLength={14}
                  />
                  {/* Validation status indicator */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checkingInviteCode && (
                      <IconLoader2 size={18} className="animate-spin text-foreground/40" />
                    )}
                    {!checkingInviteCode && inviteCodeValid && (
                      <IconCheck size={18} className="text-green-500" />
                    )}
                    {!checkingInviteCode && inviteCodeError && (
                      <IconX size={18} className="text-vocl-like" />
                    )}
                  </div>
                </div>
                {/* Invite code hint or error */}
                {inviteCodeError ? (
                  <p className="text-xs text-vocl-like px-1">{inviteCodeError}</p>
                ) : inviteCodeValid ? (
                  <p className="text-xs text-green-500 px-1">Valid invite code</p>
                ) : checkingInviteCode ? (
                  <p className="text-xs text-foreground/40 px-1">Validating code...</p>
                ) : (
                  <p className="text-xs text-foreground/40 px-1">
                    be.vocl is in private beta. You need an invite code to sign up.
                  </p>
                )}
              </div>

              {/* Username Field */}
              <div className="space-y-1">
                <div className="relative">
                  <IconUser
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    disabled={isPending}
                    className={`w-full py-3 pl-12 pr-12 rounded-xl bg-background/50 border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${
                      usernameError
                        ? "border-vocl-like focus:border-vocl-like focus:ring-vocl-like"
                        : usernameAvailable
                        ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                        : "border-white/10 focus:border-vocl-accent focus:ring-vocl-accent"
                    }`}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                  {/* Validation status indicator */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <IconLoader2 size={18} className="animate-spin text-foreground/40" />
                    )}
                    {!checkingUsername && usernameAvailable && (
                      <IconCheck size={18} className="text-green-500" />
                    )}
                    {!checkingUsername && usernameError && (
                      <IconX size={18} className="text-vocl-like" />
                    )}
                  </div>
                </div>
                {/* Username hint or error */}
                {usernameError ? (
                  <p className="text-xs text-vocl-like px-1">{usernameError}</p>
                ) : username ? (
                  usernameAvailable ? (
                    <p className="text-xs text-green-500 px-1">Username is available</p>
                  ) : checkingUsername ? (
                    <p className="text-xs text-foreground/40 px-1">Checking availability...</p>
                  ) : null
                ) : (
                  <p className="text-xs text-foreground/40 px-1">
                    3-20 characters, letters, numbers, underscores. Must start with a letter.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="relative">
            <IconMail
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full py-3 pl-12 pr-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent focus:ring-1 focus:ring-vocl-accent transition-all disabled:opacity-50"
              required
            />
          </div>

          {/* Password field - hide for forgot mode */}
          {mode !== "forgot" && (
            <div className="relative">
              <IconLock
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="w-full py-3 pl-12 pr-12 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent focus:ring-1 focus:ring-vocl-accent transition-all disabled:opacity-50"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-all"
              >
                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          )}

          {mode === "login" && (
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isPending}
                className="text-xs text-foreground/60 hover:text-foreground transition-all"
              >
                Send magic link instead
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-vocl-accent hover:text-vocl-accent-hover transition-all"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-xl bg-vocl-accent/20 border border-vocl-accent/30 text-vocl-accent text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 w-full py-3.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <IconLoader2 size={20} className="animate-spin" />
                {mode === "login"
                  ? "Logging in..."
                  : mode === "forgot"
                  ? "Sending..."
                  : "Creating account..."}
              </>
            ) : mode === "login" ? (
              "Log in"
            ) : mode === "forgot" ? (
              "Send reset link"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Back to login for forgot mode */}
        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
            className="w-full text-center mt-4 text-sm text-foreground/60 hover:text-foreground transition-all"
          >
            ← Back to login
          </button>
        )}

        {/* Terms (for signup) */}
        {mode === "signup" && (
          <p className="text-xs text-foreground/40 text-center mt-4">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="text-vocl-accent hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-vocl-accent hover:underline">
              Privacy Policy
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
