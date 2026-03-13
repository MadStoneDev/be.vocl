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
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .single();

  const profile = profileData as { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null } | null;

  if (profileError || !profile) {
    return rss404(`User "${username}" not found`);
  }

  // Fetch recent posts
  const { data: postsData } = await supabase
    .from("posts")
    .select("id, post_type, content, created_at, tags")
    .eq("author_id", profile.id)
    .eq("is_deleted", false)
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
