import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

  // PKCE flow - OAuth providers
  const code = searchParams.get("code");

  // Email OTP flow - Magic links, email confirmations, password reset
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Where to redirect after auth
  const next = searchParams.get("next") ?? "/feed";

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
        case "signup":
        case "email":
          // Email confirmed or magic link sign in
          return NextResponse.redirect(`${origin}${next}`);
        case "invite":
          // Invitation accepted - go to onboarding or feed
          return NextResponse.redirect(`${origin}/feed?welcome=true`);
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
