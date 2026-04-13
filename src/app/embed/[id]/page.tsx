import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeHtmlWithSafeLinks, stripHtml } from "@/lib/sanitize";
import {
  IconHeart,
  IconMessage,
  IconRefresh,
  IconExternalLink,
} from "@tabler/icons-react";

interface Props {
  params: Promise<{ id: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

async function getEmbeddablePost(id: string) {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select(`
      id, post_type, content, created_at, like_count, comment_count, reblog_count, is_sensitive, status,
      author:profiles!posts_author_id_fkey (username, display_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (!post || (post as any).status !== "published") return null;
  return post as any;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getEmbeddablePost(id);
  if (!post) return { title: "Post not found" };
  const author = post.author?.display_name || post.author?.username || "Unknown";
  const text = stripHtml(post.content?.html || post.content?.plain || "").slice(0, 120);
  return {
    title: `@${post.author?.username} on be.vocl`,
    description: text || `Post by @${post.author?.username}`,
    robots: { index: false, follow: false },
  };
}

function PostBody({ postType, content, isSensitive }: { postType: string; content: any; isSensitive: boolean }) {
  if (isSensitive) {
    return (
      <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-300 text-center">
        Sensitive content — view on be.vocl to display.
      </div>
    );
  }
  switch (postType) {
    case "text":
      return (
        <div
          className="prose prose-sm prose-invert max-w-none [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(content?.html || content?.plain || "") }}
        />
      );
    case "image":
    case "gallery": {
      const src = content?.urls?.[0] || content?.url;
      if (!src) return null;
      return (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
          <Image src={src} alt="" fill className="object-cover" sizes="600px" unoptimized />
        </div>
      );
    }
    case "video": {
      const thumb = content?.thumbnail_url;
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
          {thumb && <Image src={thumb} alt="" fill className="object-cover" sizes="600px" unoptimized />}
          <span className="absolute text-white text-xs bg-black/60 px-2 py-1 rounded">▶ Video</span>
        </div>
      );
    }
    case "audio":
      return (
        <div className="rounded-lg bg-vocl-surface-dark border border-white/10 p-3 text-sm text-foreground/80">
          🎵 Audio post — open on be.vocl to listen
        </div>
      );
    default:
      return null;
  }
}

export default async function EmbedPostPage({ params }: Props) {
  const { id } = await params;
  const post = await getEmbeddablePost(id);
  if (!post) notFound();

  const author = post.author;
  const postUrl = `${APP_URL}/post/${post.id}`;

  return (
    <main className="min-h-screen flex items-start justify-center p-3 bg-background">
      <article className="w-full max-w-[600px] rounded-xl bg-vocl-surface-dark border border-white/10 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <Link
            href={`${APP_URL}/u/${author?.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 min-w-0 group"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {author?.avatar_url ? (
                <Image src={author.avatar_url} alt={author.username} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center text-white font-bold text-sm">
                  {author?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate group-hover:underline">
                {author?.display_name || author?.username}
              </p>
              <p className="text-xs text-foreground/50 truncate">@{author?.username}</p>
            </div>
          </Link>
          <Link
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-vocl-accent inline-flex items-center gap-1 hover:underline"
          >
            be.vocl <IconExternalLink size={12} />
          </Link>
        </header>

        <div className="p-4">
          <PostBody postType={post.post_type} content={post.content} isSensitive={post.is_sensitive} />
        </div>

        <footer className="px-4 py-3 border-t border-white/5 flex items-center gap-4 text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1">
            <IconHeart size={14} /> {post.like_count || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconMessage size={14} /> {post.comment_count || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconRefresh size={14} /> {post.reblog_count || 0}
          </span>
          <span className="ml-auto">
            <Link href={postUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              View on be.vocl
            </Link>
          </span>
        </footer>
      </article>
    </main>
  );
}
