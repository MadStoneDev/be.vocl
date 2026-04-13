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
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  const { data: communityData } = await supabase
    .from("communities")
    .select("id, slug, name, description, visibility")
    .eq("slug", slug)
    .single();

  const community = communityData as
    | { id: string; slug: string; name: string; description: string | null; visibility: string }
    | null;

  if (!community) {
    return rss404(`Community "${slug}" not found`);
  }

  if (community.visibility !== "public") {
    return rss404(`Community "${slug}" is not public`);
  }

  const { data: links } = await supabase
    .from("community_posts")
    .select("post_id, added_at")
    .eq("community_id", community.id)
    .order("added_at", { ascending: false })
    .limit(20);

  const postIds = (links ?? []).map((l: any) => l.post_id);

  let posts: any[] = [];
  if (postIds.length > 0) {
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, post_type, content, created_at, tags")
      .in("id", postIds)
      .eq("status", "published");
    posts = (postsData ?? []) as any[];
  }

  // Preserve community ordering
  const orderedPosts = postIds
    .map((id: string) => posts.find((p) => p.id === id))
    .filter(Boolean) as Array<{
    id: string;
    post_type: string;
    content: unknown;
    created_at: string;
    tags: string[] | null;
  }>;

  const channelTitle = `/c/${community.slug} - be.vocl`;
  const channelDescription = community.description || `Posts in /c/${community.slug} on be.vocl`;
  const channelLink = `${appUrl}/c/${community.slug}`;

  const items = orderedPosts.map((post) =>
    buildRssItem({
      ...post,
      content: post.content as RssPost["content"],
    })
  );

  const xml = wrapRssChannel(channelTitle, channelDescription, channelLink, items);
  return rssResponse(xml);
}
