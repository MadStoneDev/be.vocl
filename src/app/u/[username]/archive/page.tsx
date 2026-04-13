import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { IconCalendar, IconArrowLeft, IconPhoto, IconVideo, IconMusic, IconChartBar, IconArticle } from "@tabler/icons-react";

interface Props {
  params: Promise<{ username: string }>;
}

interface ArchivePost {
  id: string;
  post_type: string;
  content: any;
  created_at: string;
}

interface MonthBucket {
  key: string;
  year: number;
  month: number;
  label: string;
  posts: ArchivePost[];
}

async function getArchive(username: string) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) return null;

  const { data: posts } = await supabase
    .from("posts")
    .select("id, post_type, content, created_at")
    .eq("author_id", (profile as any).id)
    .eq("status", "published")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const buckets = new Map<string, MonthBucket>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const post of (posts ?? []) as ArchivePost[]) {
    const d = new Date(post.created_at);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, year, month, label: `${monthNames[month]} ${year}`, posts: [] };
      buckets.set(key, bucket);
    }
    bucket.posts.push(post);
  }

  return {
    profile: profile as { id: string; username: string; display_name: string | null; avatar_url: string | null },
    months: Array.from(buckets.values()),
    totalPosts: posts?.length ?? 0,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getArchive(username);
  if (!data) return { title: "Archive not found | be.vocl" };
  const name = data.profile.display_name || data.profile.username;
  return {
    title: `${name}'s archive | be.vocl`,
    description: `Browse all ${data.totalPosts} posts from @${data.profile.username}`,
  };
}

function getThumbnail(post: ArchivePost): string | null {
  const c = post.content || {};
  if (post.post_type === "image" || post.post_type === "gallery") {
    return c.urls?.[0] || c.url || null;
  }
  if (post.post_type === "video") {
    return c.thumbnail_url || null;
  }
  if (post.post_type === "audio") {
    return c.album_art_url || c.spotify_data?.album_art_url || null;
  }
  return null;
}

function PostTypeIcon({ type }: { type: string }) {
  const map: Record<string, any> = {
    image: IconPhoto,
    gallery: IconPhoto,
    video: IconVideo,
    audio: IconMusic,
    poll: IconChartBar,
    text: IconArticle,
  };
  const Icon = map[type] || IconArticle;
  return <Icon size={18} className="text-foreground/40" />;
}

function snippetFor(post: ArchivePost): string {
  const c = post.content || {};
  if (post.post_type === "text") {
    const raw: string = c.plain || c.html || "";
    return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  }
  if (post.post_type === "poll") {
    return c.question || "Poll";
  }
  return "";
}

export default async function ArchivePage({ params }: Props) {
  const { username } = await params;
  const data = await getArchive(username);
  if (!data) notFound();

  const { profile, months, totalPosts } = data;

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto">
      <Link
        href={`/u/${profile.username}`}
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to profile
      </Link>

      <header className="mb-8 flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center text-white font-bold text-xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <IconCalendar size={22} className="text-vocl-accent" />
            Archive
          </h1>
          <p className="text-sm text-foreground/60">
            {totalPosts.toLocaleString()} posts from @{profile.username}
          </p>
        </div>
      </header>

      {months.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/5 p-12 text-center">
          <p className="text-foreground/50">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {months.map((bucket) => (
            <section key={bucket.key}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-baseline gap-2">
                {bucket.label}
                <span className="text-sm font-normal text-foreground/40">
                  {bucket.posts.length} {bucket.posts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {bucket.posts.map((post) => {
                  const thumb = getThumbnail(post);
                  const snippet = snippetFor(post);
                  return (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className="relative aspect-square rounded-lg overflow-hidden bg-vocl-surface-dark border border-white/5 hover:border-vocl-accent/40 transition-colors group"
                    >
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover group-hover:brightness-110 transition-all"
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                        />
                      ) : (
                        <div className="absolute inset-0 p-2 flex flex-col gap-1.5">
                          <PostTypeIcon type={post.post_type} />
                          <p className="text-[11px] text-foreground/70 line-clamp-5 leading-snug">
                            {snippet}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PostTypeIcon type={post.post_type} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
