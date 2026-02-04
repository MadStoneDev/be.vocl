import { NextRequest, NextResponse } from "next/server";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email";
import { sendWelcomeNotification } from "@/actions/email";
import crypto from "crypto";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

// Supabase Auth Webhook Types
interface AuthWebhookPayload {
  type: "signup" | "magiclink" | "recovery" | "invite" | "email_change";
  email: string;
  new_email?: string;
  token_hash?: string;
  redirect_to?: string;
  site_url?: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      username?: string;
    };
  };
}

/**
 * Verify webhook authorization using timing-safe comparison.
 */
function verifyWebhookAuth(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const providedToken = authHeader.replace("Bearer ", "");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(secret)
    );
  } catch {
    return false;
  }
}

/**
 * Supabase Auth Email Webhook
 *
 * Configure this in Supabase Dashboard:
 * 1. Go to Authentication > Email Templates
 * 2. Enable "Custom SMTP" or use Supabase's built-in
 * 3. For custom emails via webhook, set up in Edge Functions or use this endpoint
 *
 * Alternatively, configure in supabase/config.toml:
 * [auth.email]
 * enable_signup = true
 * double_confirm_changes = true
 * enable_confirmations = true
 *
 * And set custom email URLs in Supabase Dashboard > Auth > URL Configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Always verify the request is from Supabase
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

    // Require webhook secret to be configured
    if (!webhookSecret) {
      console.error("SUPABASE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    // Verify authorization using timing-safe comparison
    if (!verifyWebhookAuth(authHeader, webhookSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: AuthWebhookPayload = await request.json();

    // Rate limit: 5 auth emails per 15 minutes per email address
    const rateLimit = rateLimiters.authEmail(`authEmail:${payload.email}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests for this email. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

    switch (payload.type) {
      case "signup": {
        // Send welcome email for new signups
        if (payload.user) {
          const username = payload.user.user_metadata?.username || payload.email.split("@")[0];
          await sendWelcomeNotification(
            payload.user.id,
            username,
            payload.email
          );
        }

        // If there's a confirmation token, send magic link
        if (payload.token_hash) {
          const confirmLink = `${baseUrl}/auth/callback?token_hash=${payload.token_hash}&type=signup&redirect_to=${payload.redirect_to || "/feed"}`;
          await sendMagicLinkEmail({
            to: payload.email,
            magicLink: confirmLink,
          });
        }
        break;
      }

      case "magiclink": {
        if (!payload.token_hash) {
          return NextResponse.json(
            { error: "Missing token_hash" },
            { status: 400 }
          );
        }

        const magicLink = `${baseUrl}/auth/callback?token_hash=${payload.token_hash}&type=magiclink&redirect_to=${payload.redirect_to || "/feed"}`;

        await sendMagicLinkEmail({
          to: payload.email,
          magicLink,
        });
        break;
      }

      case "recovery": {
        if (!payload.token_hash) {
          return NextResponse.json(
            { error: "Missing token_hash" },
            { status: 400 }
          );
        }

        const resetLink = `${baseUrl}/auth/callback?token_hash=${payload.token_hash}&type=recovery&redirect_to=/settings/password`;

        await sendPasswordResetEmail({
          to: payload.email,
          resetLink,
        });
        break;
      }

      case "invite": {
        // Handle team invites if needed
        if (payload.token_hash) {
          const inviteLink = `${baseUrl}/auth/callback?token_hash=${payload.token_hash}&type=invite&redirect_to=/feed`;
          await sendMagicLinkEmail({
            to: payload.email,
            magicLink: inviteLink,
          });
        }
        break;
      }

      case "email_change": {
        // Handle email change confirmation
        if (payload.token_hash && payload.new_email) {
          const confirmLink = `${baseUrl}/auth/callback?token_hash=${payload.token_hash}&type=email_change&redirect_to=/settings`;
          await sendMagicLinkEmail({
            to: payload.new_email,
            magicLink: confirmLink,
          });
        }
        break;
      }

      default:
        console.log("Unknown auth email type:", payload.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also handle GET for health checks
export async function GET() {
  return NextResponse.json({ status: "ok", service: "auth-email-webhook" });
}
