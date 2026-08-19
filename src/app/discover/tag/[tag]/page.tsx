import { jsonLdScript } from "@/lib/jsonLd";
import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getPublicPostsByTag } from "@/actions/posts";
import { FrontPageGrid } from "@/components/feed/frontpage";
import type { FeedPost } from "@/components/feed/FeedList";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

// Editorial, not live — revalidate every few minutes.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const title = `#${name}`;
  const description = `Public posts tagged #${name} on be.vocl — shared by people writing freely under their own name or a pen name.`;
  const url = `${APP_URL}/discover/tag/${encodeURIComponent(name)}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${APP_URL}/rss/tag/${encodeURIComponent(name)}` },
    },
    openGraph: { type: "website", url, siteName: "be.vocl", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const posts = (await getPublicPostsByTag(name, { limit: 48 })) as unknown as FeedPost[];

  const tagUrl = `${APP_URL}/discover/tag/${encodeURIComponent(name)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `#${name} — be.vocl`,
        description: `Public posts tagged #${name} on be.vocl.`,
        url: tagUrl,
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
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "be.vocl", item: APP_URL },
          { "@type": "ListItem", position: 2, name: "Discover", item: `${APP_URL}/discover` },
          { "@type": "ListItem", position: 3, name: `#${name}`, item: tagUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <MarketingHeader />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 type-meta font-semibold text-foreground/55 transition-colors hover:text-foreground"
        >
          <IconArrowLeft size={15} />
          Discover
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="type-display text-3xl font-bold text-foreground sm:text-4xl">
            <span className="text-vocl-primary">#</span>
            {name}
          </h1>
          <p className="mt-3 max-w-2xl type-body text-foreground/65">
            Public posts tagged{" "}
            <span className="font-semibold text-foreground/80">#{name}</span>. Join
            be.vocl to follow this tag and add your own.
          </p>
        </div>

        {posts.length > 0 ? (
          <FrontPageGrid posts={posts} />
        ) : (
          <div className="rounded-2xl border border-vocl-border py-16 text-center">
            <p className="text-foreground/50">
              No public posts tagged #{name} yet.
            </p>
            <Link
              href="/discover"
              className="mt-4 inline-block type-meta font-semibold text-vocl-primary hover:opacity-80"
            >
              Back to Discover
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
