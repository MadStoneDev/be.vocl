import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  rssResponse,
  rss404,
  getAppUrl,
  buildRssItem,
  wrapRssChannel,
  type RssPost,
} from "../../utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  // Look up user profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_discoverable, allow_search_indexing, lock_status")
    .eq("username", username)
    .single();

  const profile = profileData as { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null; is_discoverable: boolean | null; allow_search_indexing: boolean | null; lock_status: string | null } | null;

  if (profileError || !profile) {
    return rss404(`User "${username}" not found`);
  }

  // Respect the author's public-web preferences: an opted-out or restricted blog
  // is not syndicated. (404 rather than an empty feed so it reads as "not public".)
  if (
    profile.is_discoverable === false ||
    profile.allow_search_indexing === false ||
    profile.lock_status === "restricted" ||
    profile.lock_status === "banned"
  ) {
    return rss404(`Feed for "${username}" is not public`);
  }

  // Fetch recent PUBLIC posts only: published + approved, never sensitive (NSFW is
  // never public), and not opted out of the public web.
  const { data: postsData } = await supabase
    .from("posts")
    .select("id, post_type, content, created_at, tags")
    .eq("author_id", profile.id)
    .eq("is_deleted", false)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .eq("is_sensitive", false)
    .eq("exclude_from_public", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (postsData ?? []) as Array<{ id: string; post_type: string; content: unknown; created_at: string; tags: string[] | null }>;

  const displayName = profile.display_name || profile.username;
  const channelTitle = `${displayName} - be.vocl`;
  const channelDescription =
    profile.bio || `Posts by ${displayName} on be.vocl`;
  const channelLink = `${appUrl}/${profile.username}`;

  const items = posts.map((post) =>
    buildRssItem({
      ...post,
      content: post.content as RssPost["content"],
    })
  );

  const xml = wrapRssChannel(
    channelTitle,
    channelDescription,
    channelLink,
    items
  );

  return rssResponse(xml);
}
