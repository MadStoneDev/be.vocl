import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type EmailOtpType } from "@supabase/supabase-js";

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with / (not //).
 */
function getSafeRedirectUrl(url: string | null): string {
  const defaultUrl = "/feed";

  if (!url) return defaultUrl;

  // Must start with exactly one /
  // Must not contain protocol-relative URLs (//)
  // Must not contain newlines or other control characters
  // Must not contain backslashes (which can be interpreted as forward slashes in some browsers)
  const safePattern = /^\/[a-zA-Z0-9\-_/?=&.#%]+$/;

  if (!url.startsWith("/")) return defaultUrl;
  if (url.startsWith("//")) return defaultUrl;
  if (url.includes("\\")) return defaultUrl;
  if (url.includes("\n") || url.includes("\r")) return defaultUrl;

  // Additional check: URL should match safe pattern
  if (!safePattern.test(url)) return defaultUrl;

  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

  // PKCE flow - OAuth providers
  const code = searchParams.get("code");

  // Email OTP flow - Magic links, email confirmations, password reset
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Where to redirect after auth (validated to prevent open redirect)
  const next = getSafeRedirectUrl(searchParams.get("next"));

  const supabase = await createClient();

  // Handle PKCE code exchange (OAuth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth code exchange error:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // Handle email OTP verification (magic link, email confirm, password reset)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Redirect based on auth type
      switch (type) {
        case "recovery":
          // Password reset - redirect to password update page
          return NextResponse.redirect(`${origin}/settings/password?reset=true`);
        case "email_change":
          // Email change confirmed
          return NextResponse.redirect(`${origin}/settings?email_changed=true`);
        case "signup": {
          // Email confirmed - redeem invite code if present
          const { data: { user } } = await supabase.auth.getUser();
          const inviteCode = user?.user_metadata?.invite_code;

          if (inviteCode && user) {
            try {
              const adminClient = createAdminClient();
              const { data, error: redeemError } = await (adminClient as any).rpc("use_invite_code", {
                p_code: inviteCode.toUpperCase(),
                p_user_id: user.id,
              });

              if (redeemError) {
                console.error("Failed to redeem invite code:", redeemError);
              } else if (!data?.success) {
                console.error("Invite code redemption failed:", data?.error);
              } else {
                console.log(`Invite code ${inviteCode} redeemed by user ${user.id}`);
              }
            } catch (err) {
              console.error("Error redeeming invite code:", err);
            }
          }

          // New signup - redirect to onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        }
        case "email":
          // Magic link sign in - existing user
          return NextResponse.redirect(`${origin}${next}`);
        case "invite":
          // Invitation accepted - go to onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        default:
          return NextResponse.redirect(`${origin}${next}`);
      }
    }

    console.error("Auth OTP verification error:", error);

    // More specific error messages
    if (error.message?.includes("expired")) {
      return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }

    return NextResponse.redirect(`${origin}/login?error=verification_failed`);
  }

  // No valid auth parameters
  return NextResponse.redirect(`${origin}/login?error=invalid_callback`);
}
