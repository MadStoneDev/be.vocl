import { Resend } from "resend";
import { EMAIL_DOMAIN } from "@/lib/site";

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("RESEND_API_KEY not configured. Emails will not be sent.");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Email configuration. From-addresses track the canonical domain (EMAIL_DOMAIN)
// so they stay in sync with NEXT_PUBLIC_APP_URL — this domain must be verified
// in Resend or delivery fails.
export const emailConfig = {
  from: {
    default: `be.vocl <noreply@${EMAIL_DOMAIN}>`,
    notifications: `be.vocl <notifications@${EMAIL_DOMAIN}>`,
    support: `be.vocl Support <support@${EMAIL_DOMAIN}>`,
  },
  replyTo: `support@${EMAIL_DOMAIN}`,
};

// Check if email is configured
export function isEmailConfigured(): boolean {
  return resend !== null;
}
