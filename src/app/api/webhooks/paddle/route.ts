import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_PLUS, PLUS_GRACE_DAYS } from "@/lib/entitlements";
import crypto from "crypto";

/**
 * Verify Paddle webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("PADDLE_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    // Paddle uses ts;h1=signature format
    const parts = signature.split(";");
    const signaturePart = parts.find((p) => p.startsWith("h1="));
    if (!signaturePart) return false;

    const providedSignature = signaturePart.replace("h1=", "");
    const tsPart = parts.find((p) => p.startsWith("ts="));
    const timestamp = tsPart ? tsPart.replace("ts=", "") : "";

    const signedPayload = `${timestamp}:${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    // Always verify signature (not just in production)
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const eventType = event.event_type;
    const data = event.data;

    console.log("Paddle webhook received:", eventType);

    const supabase = await createClient();

    switch (eventType) {
      case "transaction.completed": {
        const customData = data.custom_data || {};
        const transactionType = customData.type;
        const transactionId = customData.transaction_id;

        if (transactionType === "tip" && transactionId) {
          // Complete the tip
          await supabase
            .from("tips")
            .update({
              status: "completed",
              paddle_transaction_id: data.id,
              completed_at: new Date().toISOString(),
            })
            .eq("id", transactionId)
            .eq("status", "pending");

          // Get tip details for notification
          const { data: tip } = await supabase
            .from("tips")
            .select("sender_id, recipient_id")
            .eq("id", transactionId)
            .single();

          if (tip) {
            // Create notification
            await supabase.from("notifications").insert({
              recipient_id: tip.recipient_id,
              actor_id: tip.sender_id,
              notification_type: "tip",
            });
          }
        } else if (transactionType === "verification" && transactionId) {
          // Complete the verification
          const { data: verification } = await supabase
            .from("verifications")
            .update({
              status: "completed",
              paddle_transaction_id: data.id,
              completed_at: new Date().toISOString(),
            })
            .eq("id", transactionId)
            .eq("status", "pending")
            .select("user_id")
            .single();

          if (verification) {
            // Update user profile to verified
            await supabase
              .from("profiles")
              .update({
                is_verified: true,
                verified_at: new Date().toISOString(),
              })
              .eq("id", verification.user_id);
          }
        }
        break;
      }

      case "transaction.payment_failed": {
        const customData = data.custom_data || {};
        const transactionType = customData.type;
        const transactionId = customData.transaction_id;

        if (transactionType === "tip" && transactionId) {
          await supabase
            .from("tips")
            .update({ status: "failed" })
            .eq("id", transactionId);
        } else if (transactionType === "verification" && transactionId) {
          await supabase
            .from("verifications")
            .update({ status: "failed" })
            .eq("id", transactionId);
        }
        break;
      }

      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.resumed":
      case "subscription.trialing":
      case "subscription.past_due":
      case "subscription.paused":
      case "subscription.canceled": {
        // be.vocl Plus (theme paywall). The checkout carries
        // custom_data.type === "plus" and the app user id, mirroring the
        // verification flow. Entitlement writes go through the SERVICE-ROLE
        // client because RLS blocks entitlement writes for everyone else.
        const customData = data.custom_data || {};
        if (customData.type !== "plus") {
          console.log("Non-plus subscription event ignored:", eventType);
          break;
        }
        const userId = customData.user_id;
        if (!userId) {
          console.error("Plus subscription event missing user_id:", eventType);
          break;
        }

        // Map Paddle's subscription status to our entitlement status + expiry.
        // Grace: a lapsed sub keeps Plus editions for PLUS_GRACE_DAYS (handoff §3).
        const graceMs = PLUS_GRACE_DAYS * 24 * 60 * 60 * 1000;
        const periodEndsAt: string | undefined =
          data.current_billing_period?.ends_at;
        const paddleStatus: string = data.status || "";

        let status: "active" | "past_due" | "canceled";
        let expiresAt: string | null;
        if (
          eventType === "subscription.canceled" ||
          paddleStatus === "canceled" ||
          eventType === "subscription.paused" ||
          paddleStatus === "paused"
        ) {
          status = "canceled";
          const base = periodEndsAt ? new Date(periodEndsAt).getTime() : Date.now();
          expiresAt = new Date(base + graceMs).toISOString();
        } else if (eventType === "subscription.past_due" || paddleStatus === "past_due") {
          status = "past_due";
          expiresAt = new Date(Date.now() + graceMs).toISOString();
        } else {
          status = "active";
          expiresAt = null; // active, no forced expiry
        }

        const admin = createAdminClient();
        const { error: entErr } = await admin.from("entitlements").upsert(
          {
            user_id: userId,
            product: PRODUCT_PLUS,
            status,
            processor: "paddle",
            processor_ref: data.id,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product" },
        );
        if (entErr) {
          console.error("Failed to upsert Plus entitlement:", entErr);
          return NextResponse.json(
            { error: "Entitlement write failed" },
            { status: 500 },
          );
        }
        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
