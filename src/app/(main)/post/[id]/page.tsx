import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PostPageClient } from "./PostPageClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

interface Props {
  params: Promise<{ id: string }>;
}

interface PostMeta {
  id: string;
  post_type: string;
  content: any;
  is_sensitive: boolean;
  exclude_from_public: boolean;
  status: string;
  moderation_status: string;
  created_at: string;
  updated_at: string | null;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_discoverable: boolean | null;
    allow_search_indexing: boolean | null;
    lock_status: string | null;
  } | null;
}

/** Fetch the minimal post + author flags needed to decide audience + metadata. */
async function getPostMeta(id: string): Promise<PostMeta | null> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from("posts")
    .select(
      "id, post_type, content, is_sensitive, exclude_from_public, status, moderation_status, created_at, updated_at, author:author_id ( username, display_name, avatar_url, is_discoverable, allow_search_indexing, lock_status )"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as PostMeta) ?? null;
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

  const title = `${postTitle(p)} | be.vocl`;
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

  // Article JSON-LD for public posts (helps SEO + answer/generative engines).
  const jsonLd =
    p && isPublic(p)
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: postTitle(p).split(" — ")[0],
          description: postDescription(p),
          url: `${APP_URL}/post/${p.id}`,
          datePublished: p.created_at,
          dateModified: p.updated_at || p.created_at,
          author: {
            "@type": "Person",
            name: p.author?.display_name || `@${p.author?.username}`,
            url: p.author?.username ? `${APP_URL}/u/${p.author.username}` : undefined,
          },
          publisher: { "@type": "Organization", name: "be.vocl", url: APP_URL },
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PostPageClient postId={id} />
    </>
  );
}
