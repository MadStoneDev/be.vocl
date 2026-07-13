import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { getFeaturedPost, getFeaturedPosts, featuredBodyToHtml } from "@/lib/featured";

// Pre-render all featured slugs at build time.
export function generateStaticParams() {
  return getFeaturedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getFeaturedPost(slug);
  if (!post) return { title: "Story not found | be.vocl" };
  return {
    title: `${post.title} | be.vocl`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function FeaturedArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getFeaturedPost(slug);
  if (!post) notFound();

  const html = featuredBodyToHtml(post.body);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Masthead — matches the public landing page */}
      <header className="border-b border-vocl-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="type-display text-2xl font-bold text-vocl-primary">
            be.vocl
          </Link>
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

      <main id="main-content" className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 type-meta uppercase tracking-wide text-foreground/55 hover:text-vocl-primary transition-colors mb-6"
          >
            <IconArrowLeft size={15} /> Back
          </Link>

          {/* Tags / kicker */}
          {post.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="type-meta uppercase tracking-wide text-vocl-primary font-semibold"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Headline */}
          <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight text-foreground text-balance">
            {post.title}
          </h1>

          {post.author && (
            <p className="mt-3 type-meta text-foreground/55">by {post.author}</p>
          )}

          {/* Hero image */}
          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image}
              alt=""
              className="mt-6 w-full rounded-sm border border-vocl-border object-cover"
            />
          )}

          {/* Body */}
          <div
            className="mt-8 font-serif text-lg leading-relaxed text-foreground/90 [&_p]:my-5 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_li]:my-1.5 [&_blockquote]:border-l-4 [&_blockquote]:border-vocl-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_a]:text-vocl-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Teaser payoff — the sign-up CTA */}
          <div className="mt-12 border-t-4 border-double border-vocl-border pt-8 text-center">
            <p className="font-display text-xl font-bold text-foreground">
              Stories like this, from people finding their voice.
            </p>
            <p className="type-body text-foreground/65 mt-2">
              Join be.vocl to read more, follow the writers, and share your own.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-block rounded-xl bg-vocl-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
            >
              Join be.vocl
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
