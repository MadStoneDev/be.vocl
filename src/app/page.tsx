import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicFrontPagePosts } from "@/actions/posts";
import { FrontPageGrid } from "@/components/feed/frontpage";
import type { FeedPost } from "@/components/feed/FeedList";
import { getFeaturedPosts } from "@/lib/featured";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { HeroAmbience } from "@/components/home/HeroAmbience";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

export const metadata: Metadata = {
  title: "be.vocl — Share your voice freely",
  description:
    "be.vocl is a place to write, share, and discover — a calmer corner of the social web. Read what people are publishing, then join the conversation.",
  alternates: { canonical: APP_URL },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "be.vocl",
    title: "be.vocl — Share your voice freely",
    description:
      "A calmer corner of the social web. Read what people are publishing, then join the conversation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "be.vocl — Share your voice freely",
    description:
      "A calmer corner of the social web. Read what people are publishing, then join the conversation.",
  },
};

// Revalidate the public landing every few minutes — content is editorial, not live.
export const revalidate = 300;

export default async function Home() {
  // Logged-in users belong in their feed. The proxy already handles this for `/`,
  // but guard here too so a direct render still redirects.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/feed");
  }

  const posts = (await getPublicFrontPagePosts({ limit: 24 })) as unknown as FeedPost[];
  const featured = getFeaturedPosts();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-vocl-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="type-display text-2xl font-bold text-vocl-primary">
            be.vocl
          </span>
          <nav className="flex items-center gap-3">
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
          </nav>
        </div>
      </header>

      {/* Featured carousel hero */}
      {featured.length > 0 && (
        <section className="relative isolate overflow-hidden py-10 sm:py-14">
          <HeroAmbience />
          <FeaturedCarousel items={featured} />
        </section>
      )}

      {/* Public front page */}
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
            From the community
          </span>
          <span className="h-px flex-1 bg-vocl-border" />
        </div>

        {posts.length > 0 ? (
          <FrontPageGrid posts={posts} />
        ) : (
          <div className="rounded-2xl border border-vocl-border py-16 text-center">
            <p className="text-foreground/50">
              Nothing to show yet. Be the first to share your voice.
            </p>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="border-t border-vocl-border">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="type-display text-2xl font-bold text-foreground sm:text-3xl">
            Ready to publish your first post?
          </h2>
          <p className="mt-3 type-body text-foreground/65">
            Join be.vocl and start sharing with a community that listens.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="rounded-xl bg-vocl-primary px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
            >
              Join be.vocl
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
