import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  InteractivePost,
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
  PollContent,
} from "@/components/Post";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import type { VideoEmbedPlatform } from "@/types/database";

interface Props {
  params: Promise<{ username: string }>;
}

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  header_url: string | null;
  bio: string | null;
  role: number;
}

interface ProfileLink {
  id: string;
  title: string;
  url: string;
}

interface PostData {
  id: string;
  author_id: string;
  post_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  is_sensitive: boolean;
  created_at: string;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  tags: Array<{ id: string; name: string }>;
}

async function getProfile(username: string) {
  const supabase = createAdminClient();

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, header_url, bio, role")
    .eq("username", username)
    .single();

  const profile = profileData as ProfileData | null;

  if (error || !profile) return null;

  const [linksResult, postsResult, statsResult] = await Promise.all([
    supabase
      .from("profile_links")
      .select("id, title, url")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("posts")
      .select(
        "id, author_id, post_type, content, is_sensitive, created_at, like_count, comment_count, reblog_count"
      )
      .eq("author_id", profile.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .eq("is_deleted", false),
  ]);

  const rawPosts = (postsResult.data ?? []) as Array<Omit<PostData, "tags">>;
  const postIds = rawPosts.map((p) => p.id);

  // Fetch tags joined to these posts
  let tagsByPost: Record<string, Array<{ id: string; name: string }>> = {};
  if (postIds.length > 0) {
    const { data: postTagRows } = await supabase
      .from("post_tags")
      .select("post_id, tag:tags!tag_id(id, name)")
      .in("post_id", postIds);

    tagsByPost = (postTagRows ?? []).reduce<Record<string, Array<{ id: string; name: string }>>>(
      (acc, row: any) => {
        if (!row.tag) return acc;
        if (!acc[row.post_id]) acc[row.post_id] = [];
        acc[row.post_id].push({ id: row.tag.id, name: row.tag.name });
        return acc;
      },
      {},
    );
  }

  const posts: PostData[] = rawPosts.map((p) => ({
    ...p,
    tags: tagsByPost[p.id] ?? [],
  }));

  return {
    profile,
    links: (linksResult.data ?? []) as ProfileLink[],
    posts,
    postCount: statsResult.count || 0,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    return { title: "Profile not found | be.vocl" };
  }

  const { profile } = data;
  const displayName = profile.display_name || profile.username;
  const title = `${displayName} (@${profile.username}) | be.vocl`;
  const description =
    profile.bio || `Check out ${displayName}'s profile on be.vocl`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, width: 400, height: 400 }],
      }),
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title,
      description,
      ...(profile.avatar_url && { images: [profile.avatar_url] }),
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    notFound();
  }

  const { profile, links, posts, postCount } = data;
  const displayName = profile.display_name || profile.username;

  return (
    <div className="pb-16">
      {/* Header Image */}
      <div className="relative w-full h-48 sm:h-64 bg-white/5">
        {profile.header_url ? (
          <Image
            src={profile.header_url}
            alt={`${displayName}'s header`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent/30 to-vocl-accent/10" />
        )}
      </div>

      {/* Avatar + Name Section */}
      <div className="px-4 sm:px-6 -mt-16 relative">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-background overflow-hidden bg-white/10">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {displayName}
          </h1>
          <p className="text-foreground/50 text-lg">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="mt-3 text-foreground/80 whitespace-pre-wrap leading-relaxed max-w-xl">
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-foreground/50">
          <span>
            <span className="font-semibold text-foreground">{postCount}</span>{" "}
            {postCount === 1 ? "post" : "posts"}
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/profile/${profile.username}`}
            className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors text-sm"
          >
            View on be.vocl
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2.5 rounded-xl bg-white/10 text-foreground font-semibold hover:bg-white/15 transition-colors text-sm border border-white/5"
          >
            Join be.vocl
          </Link>
        </div>
      </div>

      {/* Profile Links */}
      {links.length > 0 && (
        <div className="mt-8 px-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-50"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div className="mt-10 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Posts
          </h2>
          {postCount > 0 && (
            <Link
              href={`/u/${profile.username}/archive`}
              className="text-sm text-vocl-accent hover:text-vocl-accent-hover transition-colors"
            >
              View archive ({postCount.toLocaleString()})
            </Link>
          )}
        </div>

        {posts.length > 0 ? (
          <div className="flex flex-col gap-2 sm:gap-5">
            {posts.map((post) => renderPublicPost(post, profile))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-foreground/50">No posts yet</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 px-4 sm:px-6">
        <div className="rounded-2xl bg-white/5 border border-white/5 p-6 text-center">
          <p className="text-foreground/70 mb-4">
            Want to see more from{" "}
            <span className="font-semibold text-foreground">{displayName}</span>
            ?
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/profile/${profile.username}`}
              className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors text-sm"
            >
              View Full Profile
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-xl bg-white/10 text-foreground font-semibold hover:bg-white/15 transition-colors text-sm border border-white/5"
            >
              Join be.vocl
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Static sub-components ---------- */

function renderPublicPost(post: PostData, author: ProfileData) {
  const contentType = post.post_type as
    | "text"
    | "image"
    | "video"
    | "audio"
    | "gallery"
    | "poll"
    | "ask";

  const contentPreview =
    post.content?.plain ||
    post.content?.caption_html?.replace(/<[^>]*>/g, "") ||
    "";
  const imageUrl =
    post.content?.urls?.[0] || post.content?.thumbnail_url || undefined;

  return (
    <InteractivePost
      key={post.id}
      id={post.id}
      author={{
        username: author.username,
        avatarUrl: author.avatar_url || "https://via.placeholder.com/100",
        role: author.role,
      }}
      authorId={post.author_id}
      timestamp={formatRelativeTime(post.created_at)}
      contentType={contentType}
      initialStats={{
        comments: post.comment_count,
        likes: post.like_count,
        reblogs: post.reblog_count,
      }}
      initialInteractions={{
        hasCommented: false,
        hasLiked: false,
        hasReblogged: false,
      }}
      isSensitive={post.is_sensitive}
      isOwn={false}
      contentPreview={contentPreview}
      imageUrl={imageUrl}
      tags={post.tags}
      content={post.content}
    >
      {contentType === "image" && post.content?.urls?.[0] && (
        <ImageContent
          src={post.content.urls[0]}
          alt=""
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "text" && post.content?.html && (
        <TextContent>
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtmlWithSafeLinks(post.content.html),
            }}
          />
        </TextContent>
      )}
      {contentType === "text" && post.content?.plain && !post.content?.html && (
        <TextContent>{post.content.plain}</TextContent>
      )}
      {contentType === "video" && (
        <VideoContent
          src={post.content?.url}
          thumbnailUrl={post.content?.thumbnail_url}
          embedUrl={post.content?.embed_url}
          embedPlatform={post.content?.embed_platform as VideoEmbedPlatform}
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "audio" &&
        (post.content?.url || post.content?.spotify_data) && (
          <AudioContent
            src={post.content?.url}
            albumArtUrl={post.content?.album_art_url}
            spotifyData={post.content?.spotify_data}
            caption={post.content?.caption_html}
            transcript={post.content?.transcript}
            isVoiceNote={post.content?.is_voice_note}
          />
        )}
      {contentType === "gallery" && post.content?.urls && (
        <GalleryContent
          images={post.content.urls}
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "poll" && post.content?.options && (
        <PollContent postId={post.id} content={post.content} />
      )}
    </InteractivePost>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
