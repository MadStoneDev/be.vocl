"use client";

import { useState, useTransition, useEffect } from "react";
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
} from "@tabler/icons-react";

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

  // Check for error in URL params (from auth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorMessages[errorParam] || "An authentication error occurred.");
    }
  }, [searchParams]);

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
          // Validate username
          if (!username || username.length < 3) {
            setError("Username must be at least 3 characters");
            return;
          }
          if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError("Username can only contain letters, numbers, and underscores");
            return;
          }

          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                username: username.toLowerCase(),
                display_name: username,
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
        <h1 className="font-display text-5xl text-foreground mb-2">be.vocl</h1>
        <p className="text-foreground/60 font-light">Share your voice freely</p>
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
            <div className="relative">
              <IconUser
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                className="w-full py-3 pl-12 pr-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent focus:ring-1 focus:ring-vocl-accent transition-all disabled:opacity-50"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
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
