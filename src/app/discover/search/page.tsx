import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconHash } from "@tabler/icons-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  searchPublicPosts,
  searchPublicTags,
  searchPublicUsers,
} from "@/actions/posts";
import { FrontPageGrid } from "@/components/feed/frontpage";
import type { FeedPost } from "@/components/feed/FeedList";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PublicSearchBox } from "@/components/marketing/PublicSearchBox";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const title = query ? `Search: ${query}` : "Search";
  const description = query
    ? `Public posts, people, and tags matching “${query}” on be.vocl.`
    : "Search public posts, people, and tags on be.vocl.";
  return {
    title,
    description,
    // Query result pages are thin/duplicative — keep them out of the index but
    // let crawlers follow through to the real post and tag pages.
    robots: query ? { index: false, follow: true } : undefined,
    alternates: { canonical: `${APP_URL}/discover/search` },
    openGraph: { type: "website", url: `${APP_URL}/discover/search`, siteName: "be.vocl", title, description },
  };
}

export default async function PublicSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const hasQuery = query.length >= 2;

  const [posts, tags, people] = hasQuery
    ? await Promise.all([
        searchPublicPosts(query, { limit: 48 }),
        searchPublicTags(query, { limit: 12 }),
        searchPublicUsers(query, { limit: 8 }),
      ])
    : [[], [], []];

  const feedPosts = posts as unknown as FeedPost[];
  const nothing = hasQuery && posts.length === 0 && tags.length === 0 && people.length === 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MarketingHeader />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 type-meta font-semibold text-foreground/55 transition-colors hover:text-foreground"
        >
          <IconArrowLeft size={15} />
          Discover
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="type-display text-3xl font-bold text-foreground sm:text-4xl">
            {hasQuery ? (
              <>
                Results for{" "}
                <span className="text-vocl-primary">{query}</span>
              </>
            ) : (
              "Search be.vocl"
            )}
          </h1>
          <div className="mt-5">
            <PublicSearchBox defaultValue={query} autoFocus={!hasQuery} />
          </div>
        </div>

        {!hasQuery && (
          <p className="max-w-xl type-body text-foreground/60">
            Search public posts, the people writing them, and the tags they use.
            Type at least two characters to begin.
          </p>
        )}

        {nothing && (
          <div className="rounded-sm border border-vocl-border py-16 text-center">
            <p className="type-body text-foreground/60">
              Nothing public matches “{query}” yet.
            </p>
            <Link
              href="/discover"
              className="mt-4 inline-block type-meta font-semibold text-vocl-primary hover:opacity-80"
            >
              Browse Discover instead
            </Link>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 type-meta font-semibold uppercase tracking-wide text-foreground/50">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t.name}
                  href={`/discover/tag/${encodeURIComponent(t.name)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-vocl-border bg-background px-3.5 py-1.5 type-meta font-semibold text-foreground/80 transition-colors hover:border-vocl-primary hover:text-vocl-primary"
                >
                  <IconHash size={14} className="text-vocl-primary" />
                  {t.name}
                  <span className="ml-1 text-foreground/40">{t.postCount}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* People */}
        {people.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 type-meta font-semibold uppercase tracking-wide text-foreground/50">
              People
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((u) => (
                <Link
                  key={u.username}
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 rounded-sm border border-vocl-border bg-background p-3 transition-colors hover:border-vocl-primary"
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" className="flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate type-body font-semibold text-foreground">
                      {u.displayName || `@${u.username}`}
                    </p>
                    <p className="truncate type-meta text-foreground/50">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Posts */}
        {feedPosts.length > 0 && (
          <section>
            <h2 className="mb-4 type-meta font-semibold uppercase tracking-wide text-foreground/50">
              Posts
            </h2>
            <FrontPageGrid posts={feedPosts} />
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
