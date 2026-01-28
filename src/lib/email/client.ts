import { Resend } from "resend";

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("RESEND_API_KEY not configured. Emails will not be sent.");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Email configuration
export const emailConfig = {
  from: {
    default: "be.vocl <noreply@be.vocl.app>",
    notifications: "be.vocl <notifications@be.vocl.app>",
    support: "be.vocl Support <support@be.vocl.app>",
  },
  replyTo: "support@be.vocl.app",
};

// Check if email is configured
export function isEmailConfigured(): boolean {
  return resend !== null;
}
