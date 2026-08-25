import { jsonLdScript } from "@/lib/jsonLd";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PostPageClient } from "./PostPageClient";
import Link from "next/link";
import { renderPublicPost } from "@/components/Post/PublicPost";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

interface Props {
  params: Promise<{ id: string }>;
}

interface PostMeta {
  id: string;
  author_id: string;
  post_type: string;
  content: any;
  is_sensitive: boolean;
  exclude_from_public: boolean;
  status: string;
  moderation_status: string;
  created_at: string;
  updated_at: string | null;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role: number | null;
    is_discoverable: boolean | null;
    allow_search_indexing: boolean | null;
    lock_status: string | null;
  } | null;
}

/** Fetch the post + author flags needed to decide audience, metadata, and (for
 *  logged-out visitors) to server-render the public view. */
async function getPostMeta(id: string): Promise<PostMeta | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("posts")
    .select(
      "id, author_id, post_type, content, is_sensitive, exclude_from_public, status, moderation_status, created_at, updated_at, like_count, comment_count, reblog_count, author:author_id ( username, display_name, avatar_url, role, is_discoverable, allow_search_indexing, lock_status )"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as PostMeta) ?? null;
}

/** Tags for a single post — used to server-render the public post view. */
async function getPostTags(id: string): Promise<Array<{ id: string; name: string }>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("post_tags")
    .select("tag:tags!tag_id(id, name)")
    .eq("post_id", id);
  return ((data ?? []) as Array<{ tag: { id: string; name: string } | null }>)
    .map((r) => r.tag)
    .filter((t): t is { id: string; name: string } => !!t);
}

/** Whether a post is reachable at all (published + approved, author not banned). */
function isViewable(p: PostMeta): boolean {
  if (p.status !== "published" || p.moderation_status !== "approved") return false;
  if (p.author?.lock_status === "banned") return false;
  return true;
}

/** Whether a post is fully PUBLIC (visible to logged-out visitors). NSFW never is. */
function isPublic(p: PostMeta): boolean {
  if (!isViewable(p)) return false;
  if (p.is_sensitive || p.exclude_from_public) return false;
  const a = p.author;
  if (!a) return false;
  if (a.is_discoverable === false) return false;
  if (a.lock_status === "restricted" || a.lock_status === "banned") return false;
  return true;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function postTitle(p: PostMeta): string {
  const c = p.content || {};
  const raw: string =
    c.essay_title || c.plain || c.text || stripHtml(c.caption_html || c.html || "") || "";
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const handle = p.author?.username ? `@${p.author.username}` : "be.vocl";
  if (!trimmed) return `Post by ${handle}`;
  const snippet = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  return `${snippet} — ${handle}`;
}

function postDescription(p: PostMeta): string {
  const c = p.content || {};
  const raw: string = c.plain || c.text || stripHtml(c.caption_html || c.html || "") || "";
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return `A post on be.vocl.`;
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

function ogImage(p: PostMeta): string | null {
  const c = p.content || {};
  return c.urls?.[0] || c.url || c.thumbnail_url || c.album_art_url || null;
}

/** schema.org media object(s) for the Article node, keyed by post type, so
 *  search/answer engines understand image/video/audio posts as real media. */
function mediaSchema(p: PostMeta, headline: string): Record<string, unknown> {
  const c = (p.content || {}) as any;
  const uploadDate = p.created_at;
  switch (p.post_type) {
    case "image":
    case "gallery": {
      const urls: string[] = Array.isArray(c.urls)
        ? c.urls
        : Array.isArray(c.items)
          ? c.items.map((it: any) => it.url).filter(Boolean)
          : [];
      if (!urls.length) return {};
      const alts: string[] = Array.isArray(c.alt_texts) ? c.alt_texts : [];
      return {
        image: urls.map((url, i) => ({
          "@type": "ImageObject",
          url,
          contentUrl: url,
          ...(alts[i] ? { caption: alts[i], name: alts[i] } : {}),
        })),
      };
    }
    case "video": {
      const contentUrl = c.url as string | undefined;
      const embedUrl = c.embed_url as string | undefined;
      if (!contentUrl && !embedUrl) return {};
      const thumb = c.thumbnail_url || ogImage(p);
      return {
        video: {
          "@type": "VideoObject",
          name: headline,
          description: postDescription(p),
          uploadDate,
          ...(thumb ? { thumbnailUrl: [thumb] } : {}),
          ...(contentUrl ? { contentUrl } : {}),
          ...(embedUrl ? { embedUrl } : {}),
          ...(typeof c.duration === "number" && c.duration > 0
            ? { duration: `PT${Math.round(c.duration)}S` }
            : {}),
        },
      };
    }
    case "audio": {
      const contentUrl = c.url || c.spotify_data?.external_url;
      if (!contentUrl) return {};
      const thumb = c.album_art_url || c.spotify_data?.album_art;
      return {
        audio: {
          "@type": "AudioObject",
          name: c.spotify_data?.name || headline,
          uploadDate,
          contentUrl,
          ...(thumb ? { thumbnailUrl: thumb } : {}),
        },
      };
    }
    default:
      return {};
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPostMeta(id);

  if (!p || !isViewable(p)) {
    return { title: "Post not found | be.vocl", robots: { index: false, follow: false } };
  }

  // Members-only posts get a generic, non-indexed card.
  if (!isPublic(p)) {
    return {
      title: "be.vocl",
      description: "Log in to view this post on be.vocl.",
      robots: { index: false, follow: false },
    };
  }

  const title = postTitle(p);
  const description = postDescription(p);
  const image = ogImage(p);
  const canonical = `${APP_URL}/post/${p.id}`;
  // Honour the author's external search-indexing preference.
  const noindex = p.author?.allow_search_indexing === false;

  return {
    title,
    description,
    alternates: { canonical },
    ...(noindex && { robots: { index: false, follow: false } }),
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "be.vocl",
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const p = await getPostMeta(id);

  // Unknown / unpublished posts: let the client view render its own "not found".
  if (p && isViewable(p) && !user && !isPublic(p)) {
    // Members-only post viewed by a logged-out visitor → send them to log in.
    redirect(`/login?next=${encodeURIComponent(`/post/${id}`)}`);
  }
  if (!p && !user) {
    notFound();
  }

  // Tags for public posts — used for both the JSON-LD keywords and the
  // server-rendered public view below (fetched once).
  const isPub = p != null && isPublic(p);
  const tags = isPub ? await getPostTags(id) : [];

  // Article + Breadcrumb JSON-LD for public posts (SEO + answer/generative engines).
  const postUrl = p ? `${APP_URL}/post/${p.id}` : APP_URL;
  const articleImage = p ? ogImage(p) : undefined;
  const media = p && isPub ? mediaSchema(p, postTitle(p).split(" — ")[0]) : {};
  const jsonLd =
    p && isPub
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: postTitle(p).split(" — ")[0],
              description: postDescription(p),
              articleBody: postDescription(p),
              url: postUrl,
              mainEntityOfPage: postUrl,
              datePublished: p.created_at,
              dateModified: p.updated_at || p.created_at,
              ...(Object.keys(media).length
                ? media
                : articleImage
                  ? { image: articleImage }
                  : {}),
              ...(tags.length ? { keywords: tags.map((t) => t.name).join(", ") } : {}),
              author: {
                "@type": "Person",
                name: p.author?.display_name || `@${p.author?.username}`,
                url: p.author?.username ? `${APP_URL}/profile/${p.author.username}` : undefined,
              },
              publisher: { "@type": "Organization", name: "be.vocl", url: APP_URL },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "be.vocl", item: APP_URL },
                ...(p.author?.username
                  ? [
                      {
                        "@type": "ListItem",
                        position: 2,
                        name: `@${p.author.username}`,
                        item: `${APP_URL}/profile/${p.author.username}`,
                      },
                    ]
                  : []),
                {
                  "@type": "ListItem",
                  position: p.author?.username ? 3 : 2,
                  name: postTitle(p).split(" — ")[0] || "Post",
                  item: postUrl,
                },
              ],
            },
          ],
        }
      : null;

  // Logged-out visitor on a fully-public post → server-render the article so the
  // post text/media is in the initial HTML (crawlable by search + answer engines).
  // Logged-in members get the full interactive client view below.
  if (!user && p && isPublic(p) && p.author) {
    const publicPost = {
      id: p.id,
      author_id: p.author_id,
      post_type: p.post_type,
      content: p.content,
      is_sensitive: p.is_sensitive,
      created_at: p.created_at,
      like_count: p.like_count ?? 0,
      comment_count: p.comment_count ?? 0,
      reblog_count: p.reblog_count ?? 0,
      tags,
    };
    const author = {
      username: p.author.username,
      avatar_url: p.author.avatar_url,
      role: p.author.role ?? 0,
    };
    return (
      <>
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
          />
        )}
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          {renderPublicPost(publicPost, author)}
          <div className="mt-8 rounded-sm border border-vocl-border p-6 text-center">
            <p className="type-body text-foreground/70">
              Join be.vocl to like, reply and follow{" "}
              <Link
                href={`/profile/${author.username}`}
                className="font-semibold text-vocl-primary hover:underline"
              >
                @{author.username}
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-vocl-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
              >
                Join be.vocl
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(`/post/${id}`)}`}
                className="rounded-xl border border-vocl-border px-5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-vocl-hover"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />
      )}
      <PostPageClient postId={id} />
    </>
  );
}
