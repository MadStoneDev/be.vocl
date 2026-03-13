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
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  // Fetch recent posts with this tag
  const { data: postsData, error } = await supabase
    .from("posts")
    .select("id, post_type, content, created_at, tags, author_id")
    .contains("tags", [decodedTag])
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (postsData ?? []) as Array<{ id: string; post_type: string; content: unknown; created_at: string; tags: string[] | null; author_id: string }>;

  if (error || posts.length === 0) {
    return rss404(`No posts found for tag "${decodedTag}"`);
  }

  // Fetch author profiles
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const { data: profilesData } = await supabase.from("profiles").select("id, username, display_name").in("id", authorIds);
  const profiles = (profilesData ?? []) as Array<{ id: string; username: string; display_name: string | null }>;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const channelTitle = `#${decodedTag} - be.vocl`;
  const channelDescription = `Posts tagged #${decodedTag} on be.vocl`;
  const channelLink = `${appUrl}/tag/${encodeURIComponent(decodedTag)}`;

  const items = posts.map((post) => {
    const profile = profileMap.get(post.author_id);
    return buildRssItem({
      id: post.id,
      post_type: post.post_type,
      content: post.content as RssPost["content"],
      created_at: post.created_at,
      tags: post.tags,
      author_username: profile?.username ?? undefined,
      author_display_name:
        profile?.display_name ?? profile?.username ?? undefined,
    });
  });

  const xml = wrapRssChannel(
    channelTitle,
    channelDescription,
    channelLink,
    items
  );

  return rssResponse(xml);
}
