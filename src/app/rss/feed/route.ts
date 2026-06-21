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

  // Fetch latest PUBLIC posts. This mirrors getPublicFrontPagePosts: only
  // published + approved content that is not sensitive (NSFW is never public) and
  // not opted out of the public web. Over-fetch to allow author-side filtering.
  const { data: postsData } = await supabase
    .from("posts")
    .select(
      "id, post_type, content, created_at, tags, author_id"
    )
    .eq("is_deleted", false)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .eq("is_sensitive", false)
    .eq("exclude_from_public", false)
    .order("created_at", { ascending: false })
    .limit(60);

  const rawPosts = (postsData ?? []) as Array<{ id: string; post_type: string; content: unknown; created_at: string; tags: string[] | null; author_id: string }>;

  // Fetch author profiles for these posts (incl. discoverability + lock status).
  const authorIds = [...new Set(rawPosts.map((p) => p.author_id))];
  const { data: profilesData } = authorIds.length > 0
    ? await supabase.from("profiles").select("id, username, display_name, is_discoverable, lock_status").in("id", authorIds)
    : { data: [] };
  const profiles = (profilesData ?? []) as Array<{ id: string; username: string; display_name: string | null; is_discoverable: boolean | null; lock_status: string | null }>;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Drop posts whose author hid from the public web or is restricted/banned.
  const posts = rawPosts
    .filter((p) => {
      const a = profileMap.get(p.author_id);
      if (!a) return false;
      if (a.is_discoverable === false) return false;
      if (a.lock_status === "restricted" || a.lock_status === "banned") return false;
      return true;
    })
    .slice(0, 20);

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
