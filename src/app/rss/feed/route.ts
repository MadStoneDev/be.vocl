import { createAdminClient } from "@/lib/supabase/admin";
import {
  rssResponse,
  getAppUrl,
  buildRssItem,
  wrapRssChannel,
  type RssPost,
} from "../utils";

export async function GET() {
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  // Fetch latest public posts with author info
  const { data: postsData } = await supabase
    .from("posts")
    .select(
      "id, post_type, content, created_at, tags, author_id"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (postsData ?? []) as Array<{ id: string; post_type: string; content: unknown; created_at: string; tags: string[] | null; author_id: string }>;

  // Fetch author profiles for these posts
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const { data: profilesData } = authorIds.length > 0
    ? await supabase.from("profiles").select("id, username, display_name").in("id", authorIds)
    : { data: [] };
  const profiles = (profilesData ?? []) as Array<{ id: string; username: string; display_name: string | null }>;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

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
    "be.vocl - Public Feed",
    "Latest posts on be.vocl",
    appUrl,
    items
  );

  return rssResponse(xml);
}
