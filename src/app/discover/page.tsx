import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicFrontPagePosts } from "@/actions/posts";
import { FrontPageGrid } from "@/components/feed/frontpage";
import type { FeedPost } from "@/components/feed/FeedList";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export const metadata: Metadata = {
  title: "Discover | be.vocl",
  description:
    "Discover public posts from the be.vocl community — essays, art, audio, and conversation from people sharing their voice freely.",
  alternates: { canonical: `${APP_URL}/discover` },
  openGraph: {
    type: "website",
    url: `${APP_URL}/discover`,
    siteName: "be.vocl",
    title: "Discover | be.vocl",
    description:
      "Public posts from the be.vocl community — essays, art, audio, and conversation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover | be.vocl",
    description: "Public posts from the be.vocl community.",
  },
};

// Editorial, not live — revalidate every few minutes.
export const revalidate = 300;

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const posts = (await getPublicFrontPagePosts({ limit: 48 })) as unknown as FeedPost[];

  // CollectionPage JSON-LD so search/answer engines understand this is a curated
  // public index of articles.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Discover — be.vocl",
    description:
      "Public posts from the be.vocl community — essays, art, audio, and conversation.",
    url: `${APP_URL}/discover`,
    isPartOf: { "@type": "WebSite", name: "be.vocl", url: APP_URL },
    hasPart: posts.slice(0, 20).map((p) => ({
      "@type": "Article",
      headline:
        (typeof p.content?.text === "string" && p.content.text.slice(0, 110)) ||
        `Post by @${p.author.username}`,
      url: `${APP_URL}/post/${p.id}`,
      author: { "@type": "Person", name: `@${p.author.username}` },
      datePublished: p.timestamp,
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top bar */}
      <header className="border-b border-vocl-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="type-display text-2xl font-bold text-vocl-primary">
            be.vocl
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link
                href="/feed"
                className="rounded-xl bg-vocl-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
              >
                Go to your feed
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-vocl-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
                >
                  Join be.vocl
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
            Discover
          </span>
          <h1 className="type-display text-3xl font-bold text-foreground sm:text-4xl mt-1">
            Public posts from the community
          </h1>
          <p className="type-body text-foreground/65 mt-3 max-w-2xl">
            A reading room of posts people chose to share with the whole web. Join
            be.vocl to follow voices you love and share your own.
          </p>
        </div>

        {posts.length > 0 ? (
          <FrontPageGrid posts={posts} />
        ) : (
          <div className="rounded-2xl border border-vocl-border py-16 text-center">
            <p className="text-foreground/50">
              Nothing public to show yet. Be the first to share your voice.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
