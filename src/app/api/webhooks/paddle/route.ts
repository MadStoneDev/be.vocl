import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      if (!verifyWebhookSignature(payload, signature)) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
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
          await (supabase as any)
            .from("tips")
            .update({
              status: "completed",
              paddle_transaction_id: data.id,
              completed_at: new Date().toISOString(),
            })
            .eq("id", transactionId)
            .eq("status", "pending");

          // Get tip details for notification
          const { data: tip } = await (supabase as any)
            .from("tips")
            .select("sender_id, recipient_id")
            .eq("id", transactionId)
            .single();

          if (tip) {
            // Create notification
            await (supabase as any).from("notifications").insert({
              recipient_id: tip.recipient_id,
              actor_id: tip.sender_id,
              notification_type: "tip",
            });
          }
        } else if (transactionType === "verification" && transactionId) {
          // Complete the verification
          const { data: verification } = await (supabase as any)
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
            await (supabase as any)
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
          await (supabase as any)
            .from("tips")
            .update({ status: "failed" })
            .eq("id", transactionId);
        } else if (transactionType === "verification" && transactionId) {
          await (supabase as any)
            .from("verifications")
            .update({ status: "failed" })
            .eq("id", transactionId);
        }
        break;
      }

      case "subscription.created":
      case "subscription.updated":
      case "subscription.canceled":
        // Handle subscription events if needed in the future
        console.log("Subscription event:", eventType, data);
        break;

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
