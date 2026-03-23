import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/client";
import { sendDataExportReadyEmail } from "@/lib/email/send";

// Processes pending data export requests
// Run every 15 minutes via cron

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

    // Get pending export requests
    const { data: pendingRequests, error: fetchError } = await supabase
      .from("data_export_requests")
      .select("id, user_id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5); // Process up to 5 at a time

    if (fetchError || !pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;

    for (const request of pendingRequests) {
      try {
        // Mark as processing
        await supabase
          .from("data_export_requests")
          .update({ status: "processing" })
          .eq("id", request.id);

        // Compile user data
        const exportData = await compileUserData(supabase, request.user_id);

        // Upload to R2
        const key = `exports/${request.user_id}/${Date.now()}_data-export.json`;
        const jsonContent = JSON.stringify(exportData, null, 2);

        const r2Client = getR2Client();
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: jsonContent,
            ContentType: "application/json",
          })
        );

        const publicUrl = `${R2_PUBLIC_URL}/${key}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Update request as completed
        await supabase
          .from("data_export_requests")
          .update({
            status: "completed",
            file_url: publicUrl,
            file_size_bytes: Buffer.byteLength(jsonContent, "utf-8"),
            expires_at: expiresAt.toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        // Send email notification
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            request.user_id
          );
          const email = authUser?.user?.email;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", request.user_id)
            .single();

          if (email && profile?.username) {
            await sendDataExportReadyEmail({
              to: email,
              username: profile.username,
              downloadUrl: publicUrl,
              expiresAt: expiresAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            });
          }
        } catch (emailError) {
          console.error(
            `Failed to send export notification for ${request.id}:`,
            emailError
          );
        }

        processed++;
      } catch (err) {
        console.error(`Failed to process export ${request.id}:`, err);
        await supabase
          .from("data_export_requests")
          .update({ status: "failed" })
          .eq("id", request.id);
      }
    }

    return NextResponse.json({ processed });
  } catch (error) {
    console.error("Data export cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function compileUserData(supabase: any, userId: string) {
  // Fetch all user data in parallel
  const [
    profileResult,
    profileLinksResult,
    postsResult,
    commentsResult,
    likesResult,
    followersResult,
    followingResult,
    bookmarksResult,
    notificationsResult,
    messagesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, header_url, timezone, created_at")
      .eq("id", userId)
      .single(),
    supabase
      .from("profile_links")
      .select("title, url, sort_order")
      .eq("profile_id", userId)
      .order("sort_order"),
    supabase
      .from("posts")
      .select("id, post_type, content, is_sensitive, status, created_at, published_at")
      .eq("author_id", userId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, post_id, content_html, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("likes")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("follows")
      .select("following_id, created_at, following:following_id (username)")
      .eq("follower_id", userId),
    supabase
      .from("follows")
      .select("follower_id, created_at, follower:follower_id (username)")
      .eq("following_id", userId),
    supabase
      .from("bookmarks")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, notification_type, is_read, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("messages")
      .select("id, conversation_id, content, media_url, created_at")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profileResult.data || null,
    profileLinks: profileLinksResult.data || [],
    posts: postsResult.data || [],
    comments: commentsResult.data || [],
    likes: likesResult.data || [],
    followers: (followingResult.data || []).map((f: any) => ({
      username: f.follower?.username,
      followedAt: f.created_at,
    })),
    following: (followersResult.data || []).map((f: any) => ({
      username: f.following?.username,
      followedAt: f.created_at,
    })),
    bookmarks: bookmarksResult.data || [],
    notifications: notificationsResult.data || [],
    messages: messagesResult.data || [],
  };
}
