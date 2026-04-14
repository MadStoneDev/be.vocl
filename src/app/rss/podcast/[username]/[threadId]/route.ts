import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rssResponse, rss404, getAppUrl, escapeXml } from "../../../utils";

function formatItunesDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function inferMimeFromUrl(url: string): string {
  const u = url.toLowerCase();
  if (u.endsWith(".mp3")) return "audio/mpeg";
  if (u.endsWith(".m4a") || u.endsWith(".mp4") || u.endsWith(".aac")) return "audio/mp4";
  if (u.endsWith(".webm")) return "audio/webm";
  if (u.endsWith(".ogg") || u.endsWith(".oga")) return "audio/ogg";
  if (u.endsWith(".wav")) return "audio/wav";
  return "audio/mpeg";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string; threadId: string }> }
) {
  const { username, threadId } = await params;
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .single();

  const profile = profileData as
    | { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null }
    | null;

  if (!profile) return rss404(`User "${username}" not found`);

  const { data: postsData } = await supabase
    .from("posts")
    .select("id, post_type, content, created_at, thread_position")
    .eq("author_id", profile.id)
    .eq("thread_id", threadId)
    .eq("status", "published")
    .order("thread_position", { ascending: true });

  const posts = (postsData ?? []) as Array<{
    id: string;
    post_type: string;
    content: any;
    created_at: string;
    thread_position: number | null;
  }>;

  if (posts.length === 0) return rss404("No episodes found");

  // Only audio posts can become podcast episodes
  const episodes = posts.filter((p) => p.post_type === "audio" && p.content?.url);
  if (episodes.length === 0) return rss404("Thread has no audio episodes");

  const displayName = profile.display_name || profile.username;
  const channelTitle = `${displayName} — be.vocl podcast`;
  const channelDescription = profile.bio || `Podcast by ${displayName} on be.vocl`;
  const channelLink = `${appUrl}/thread/${threadId}`;
  const coverImage = profile.avatar_url || `${appUrl}/bevocl-pink-symbol logo.svg`;
  const feedSelfUrl = `${appUrl}/rss/podcast/${profile.username}/${threadId}`;

  const items = episodes
    .map((post) => {
      const audioUrl: string = post.content.url;
      const duration: number = Number(post.content.duration) || 0;
      const transcript: string | undefined = post.content.transcript;
      const captionText: string =
        post.content.caption_html || transcript || `Episode ${post.thread_position ?? ""}`.trim();
      const title = `Episode ${post.thread_position ?? ""}: ${displayName}`.trim();
      const link = `${appUrl}/post/${post.id}`;
      const pubDate = new Date(post.created_at).toUTCString();
      const mime = inferMimeFromUrl(audioUrl);

      return `    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(captionText.replace(/<[^>]+>/g, " "))}</description>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(post.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" type="${mime}" length="0" />
      <itunes:duration>${formatItunesDuration(duration)}</itunes:duration>
      <itunes:author>${escapeXml(displayName)}</itunes:author>
      <itunes:summary>${escapeXml(captionText.replace(/<[^>]+>/g, " "))}</itunes:summary>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <description>${escapeXml(channelDescription)}</description>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(feedSelfUrl)}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <itunes:author>${escapeXml(displayName)}</itunes:author>
    <itunes:summary>${escapeXml(channelDescription)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${escapeXml(displayName)}</itunes:name>
    </itunes:owner>
    <itunes:image href="${escapeXml(coverImage)}" />
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Society &amp; Culture" />
${items}
  </channel>
</rss>`;

  return rssResponse(xml);
}
