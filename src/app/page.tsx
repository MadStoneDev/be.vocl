import { jsonLdScript } from "@/lib/jsonLd";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicFrontPagePosts } from "@/actions/posts";
import type { FeedPost } from "@/components/feed/FeedList";
import { FrontPageTile } from "@/components/feed/frontpage/FrontPageTiles";
import { TileEngagement } from "@/components/feed/frontpage/TileEngagement";
import { TimeAgo } from "@/components/ui";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export const metadata: Metadata = {
  title: "be.vocl — Your Daily Voice",
  description:
    "An evening broadsheet built from real posts. Write, vent and share under your name or a pen name — you decide who sees every post. No ads, no data brokers, no algorithm. 21+.",
  alternates: {
    canonical: APP_URL,
    types: { "application/rss+xml": `${APP_URL}/rss/feed` },
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "be.vocl",
    title: "be.vocl — Your Daily Voice",
    description:
      "An evening broadsheet built from real posts. You decide who sees every post. No ads, no data brokers, no algorithm.",
  },
  twitter: {
    card: "summary_large_image",
    title: "be.vocl — Your Daily Voice",
    description:
      "An evening broadsheet built from real posts. No ads, no data brokers, no algorithm.",
  },
};

// Revalidate the public front page every few minutes — it's an edition, not live.
export const revalidate = 300;

// ---------------------------------------------------------------------------
// Small server-side helpers (no client hooks — this is a Server Component).
// ---------------------------------------------------------------------------
function stripHtml(html?: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
function hrefOf(post: FeedPost): string {
  return post.threadId ? `/thread/${post.threadId}` : `/post/${post.id}`;
}
function briefText(post: FeedPost): string {
  return clamp(post.content.text || stripHtml(post.content.html), 150);
}

// Section bar — logged-out tabs all point at public surfaces.
const SECTIONS: { label: string; href: string; active?: boolean }[] = [
  { label: "Front Page", href: "/", active: true },
  { label: "The Newsstand", href: "/discover" },
  { label: "Desks", href: "/discover" },
  { label: "Notes", href: "/discover" },
  { label: "Photo", href: "/discover" },
  { label: "Listen", href: "/discover" },
  { label: "Polls", href: "/discover" },
];

const MANIFESTO: { lead: string; body: string }[] = [
  {
    lead: "Pen names.",
    body: "Write under your name or a name you choose. Keep several. Nobody is entitled to know which is which.",
  },
  {
    lead: "You decide who sees it.",
    body: "Public, members, followers — set per post, changed whenever you like.",
  },
  {
    lead: "We don't sell you.",
    body: "No ads, no data brokers, no engagement algorithm deciding what you feel today.",
  },
  {
    lead: "Block, mute, report.",
    body: "Tools that actually work, and a moderation desk staffed by people who read.",
  },
  {
    lead: "21+ only.",
    body: "Adults and minors should not share an anonymous platform. Mature content, handled like adults.",
  },
];

export default async function Home() {
  // Logged-in users belong in their feed. The proxy handles `/` too, but guard
  // here so a direct render still redirects.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/feed");
  }

  const posts = (await getPublicFrontPagePosts({ limit: 24 })) as unknown as FeedPost[];

  // Editorial slicing of the public river into a broadsheet.
  const lead = posts[0];
  const secondary = posts.slice(1, 3);
  const moreStories = posts.slice(3, 6);
  const used = new Set([lead, ...secondary, ...moreStories].filter(Boolean).map((p) => p.id));
  const briefs = posts
    .filter((p) => p.contentType === "text" && !p.content.isEssay && !used.has(p.id))
    .slice(0, 3);
  const listen = posts.filter((p) => p.contentType === "audio").slice(0, 2);
  const poll = posts.find((p) => p.contentType === "poll");
  const pollQuestion = poll ? ((poll.rawContent as Record<string, unknown>)?.question as string) : "";

  // Dateline + edition slug.
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  const editionNo = String(dayOfYear).padStart(4, "0");
  const dateLine = now.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "be.vocl",
        url: APP_URL,
        description:
          "A pseudonymous social writing platform with per-post visibility controls and no ad-tracking. 21+.",
      },
      {
        "@type": "WebSite",
        name: "be.vocl",
        url: APP_URL,
        description: "Read what people are publishing on be.vocl, then join the conversation.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${APP_URL}/discover/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-14">
        {/* ===== Masthead ===== */}
        {/* Utility bar */}
        <div className="flex items-center justify-between border-b border-rule py-3.5">
          <span className="slug text-meta">EST. 2026 · LATE EDITION · NO. {editionNo}</span>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="byline text-ink transition-colors hover:text-accent"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-accent px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
            >
              Subscribe
            </Link>
          </div>
        </div>

        {/* Wordmark block */}
        <div className="flex flex-col items-center gap-2.5 py-8 sm:py-9">
          <span className="font-display text-5xl leading-none text-accent sm:text-[78px]">
            be.vocl
          </span>
          <span className="font-display text-[11px] uppercase tracking-[0.34em] text-ink sm:text-[15px] sm:tracking-[0.42em]">
            Your Daily Voice
          </span>
        </div>

        {/* Dateline row */}
        <div className="grid grid-cols-1 items-center gap-2 border-t border-rule rule-double-b py-2.5 text-center sm:grid-cols-[1fr_auto_1fr] sm:text-left">
          <span className="byline text-meta">{dateLine}</span>
          <span className="stamp-21 justify-self-center">21+ · Adults Only</span>
          <span className="byline hidden text-meta sm:block sm:text-right">
            No ads · No data brokers · No algorithm
          </span>
        </div>

        {/* Section bar */}
        <nav className="flex gap-6 overflow-x-auto border-b border-rule py-3.5 sm:gap-7">
          {SECTIONS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              data-active={s.active ? "true" : undefined}
              className="section-tab whitespace-nowrap transition-colors hover:text-ink"
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {/* ===== Main broadsheet grid ===== */}
        <main id="main-content" className="grid grid-cols-1 pb-10 pt-8 lg:grid-cols-[2.1fr_1fr_1fr]">
          {posts.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="slug text-meta-dim mb-4">Nothing on the wire yet</p>
              <h2 className="type-display text-ink">Tonight&apos;s edition is still being set.</h2>
            </div>
          ) : (
            <>
              {/* Column 1 — lead + secondary */}
              <div className="lg:pr-9">
                {lead && (
                  <>
                    <FrontPageTile post={lead} prominence="lead" />
                    <TileEngagement
                      postId={lead.id}
                      comments={lead.stats?.comments}
                      likes={lead.stats?.likes}
                      voice={lead.stats?.voiceReactions}
                      reblogs={lead.stats?.reblogs}
                      hasLiked={lead.interactions?.hasLiked}
                      hasReblogged={lead.interactions?.hasReblogged}
                    />
                  </>
                )}
                {secondary.length > 0 && (
                  <div className="mt-9 grid grid-cols-1 gap-8 border-t border-rule pt-7 sm:grid-cols-2">
                    {secondary.map((p) => (
                      <div key={p.id}>
                        <FrontPageTile post={p} prominence="feature" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2 — More stories */}
              <div className="mt-10 border-rule lg:mt-0 lg:border-l lg:pl-8">
                <div className="slug border-b border-rule pb-3 text-meta">More stories</div>
                <div className="divide-y divide-rule">
                  {moreStories.map((p) => (
                    <div key={p.id} className="py-5 first:pt-5">
                      <FrontPageTile post={p} prominence="standard" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3 — Notes · Briefs / Listen / Poll */}
              <div className="mt-10 border-rule lg:mt-0 lg:border-l lg:pl-8">
                {briefs.length > 0 && (
                  <>
                    <div className="kicker kicker-accent border-b border-rule pb-3">Notes · Briefs</div>
                    {briefs.map((b) => (
                      <Link
                        key={b.id}
                        href={hrefOf(b)}
                        className="block border-b border-rule py-3.5 transition-colors hover:text-accent"
                      >
                        <p className="editorial-body text-ink-secondary">{briefText(b)}</p>
                        <span className="byline mt-1.5 block text-meta">
                          {b.author.username} · <TimeAgo iso={b.timestamp} />
                        </span>
                      </Link>
                    ))}
                  </>
                )}

                {listen.length > 0 && (
                  <>
                    <div className="slug border-b border-rule pb-3 pt-6 text-meta">Listen</div>
                    {listen.map((a) => {
                      const title = a.content.spotifyData?.name || (a.content.isVoiceNote ? "Voice note" : "Audio");
                      const subtitle = a.content.spotifyData?.artist || `@${a.author.username}`;
                      return (
                        <Link
                          key={a.id}
                          href={hrefOf(a)}
                          className="group flex items-center gap-3 border-b border-rule py-3.5"
                        >
                          <div className="ph-image h-14 w-14 flex-none" aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="type-heading truncate text-ink transition-colors group-hover:text-accent">
                              {title}
                            </div>
                            <div className="byline mt-1 truncate text-meta">{subtitle}</div>
                          </div>
                          <span aria-hidden="true" className="ml-auto text-lg leading-none text-ink">
                            ▸
                          </span>
                        </Link>
                      );
                    })}
                  </>
                )}

                {poll && pollQuestion && (
                  <>
                    <div className="slug border-b border-rule pb-3 pt-6 text-meta">Poll of the evening</div>
                    <Link href={hrefOf(poll)} className="block py-4 transition-colors hover:text-accent">
                      <p className="type-heading text-ink">{clamp(pollQuestion, 120)}</p>
                      <span className="byline mt-3 block text-meta">Cast your vote →</span>
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </main>

        {/* ===== The Terms (subscribe fold) ===== */}
        <section className="rule-double py-9">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2.6fr]">
            <div>
              <div className="kicker kicker-accent mb-3">The terms</div>
              <h2 className="font-display text-3xl leading-tight text-ink sm:text-[40px]">
                Made for people who&apos;d rather be honest.
              </h2>
              <Link
                href="/signup"
                className="mt-5 inline-block bg-accent px-6 py-3 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
              >
                Subscribe · 21+
              </Link>
            </div>
            <div className="gap-8 [column-rule:1px_solid_var(--rule)] sm:columns-2 lg:columns-3">
              {MANIFESTO.map((m) => (
                <p key={m.lead} className="editorial-body mb-3.5 break-inside-avoid text-editorial-body">
                  <span className="run-in mr-1.5">{m.lead}</span>
                  {m.body}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
