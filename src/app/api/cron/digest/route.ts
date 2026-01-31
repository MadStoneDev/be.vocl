import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDailyDigestEmail } from "@/lib/email";

// Sends daily digest emails to users who have opted in
// Run daily at 6 PM (18:00) via cron

interface DigestItem {
  type: "like" | "comment" | "reblog" | "follow" | "mention" | "message";
  count: number;
  actorUsernames: string[];
  postId?: string;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let emailsSent = 0;
    const errors: string[] = [];

    // Get all users with daily digest setting
    const { data: usersWithDigest, error: usersError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("email_frequency", "daily");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    for (const user of usersWithDigest || []) {
      try {
        // Get pending notifications for this user
        const { data: pendingNotifications, error: notifError } = await supabase
          .from("pending_digest_notifications")
          .select(`
            id,
            notification_type,
            actor_id,
            post_id,
            message_preview,
            conversation_id,
            actor:profiles!actor_id (username)
          `)
          .eq("recipient_id", user.id);

        if (notifError) {
          errors.push(`User ${user.id}: ${notifError.message}`);
          continue;
        }

        if (!pendingNotifications || pendingNotifications.length === 0) {
          continue; // No notifications to send
        }

        // Group notifications by type
        const grouped: Record<string, { actorUsernames: Set<string>; postIds: Set<string>; count: number }> = {};

        for (const notif of pendingNotifications) {
          const type = notif.notification_type;
          if (!grouped[type]) {
            grouped[type] = { actorUsernames: new Set(), postIds: new Set(), count: 0 };
          }
          grouped[type].count++;
          const actorData = notif.actor;
          const actor = Array.isArray(actorData) ? actorData[0] : actorData;
          if (actor && typeof actor === 'object' && 'username' in actor && actor.username) {
            grouped[type].actorUsernames.add(actor.username as string);
          }
          if (notif.post_id) {
            grouped[type].postIds.add(notif.post_id);
          }
        }

        // Build digest items
        const items: DigestItem[] = [];
        for (const [type, data] of Object.entries(grouped)) {
          items.push({
            type: type as DigestItem["type"],
            count: data.count,
            actorUsernames: Array.from(data.actorUsernames).slice(0, 3),
            postId: data.postIds.size === 1 ? Array.from(data.postIds)[0] : undefined,
          });
        }

        // Sort by count (most to least)
        items.sort((a, b) => b.count - a.count);

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        const email = authUser?.user?.email;

        if (!email) {
          errors.push(`User ${user.id}: No email found`);
          continue;
        }

        // Send digest email
        const result = await sendDailyDigestEmail({
          to: email,
          recipientUsername: user.username,
          items,
          totalNotifications: pendingNotifications.length,
        });

        if (result.success) {
          emailsSent++;

          // Clear pending notifications
          const notifIds = pendingNotifications.map((n) => n.id);
          await supabase
            .from("pending_digest_notifications")
            .delete()
            .in("id", notifIds);
        } else {
          errors.push(`User ${user.id}: ${result.error}`);
        }
      } catch (userError) {
        errors.push(`User ${user.id}: ${String(userError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      usersProcessed: usersWithDigest?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Daily digest processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
