import { jsonLdScript } from "@/lib/jsonLd";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
import { getComparison, getComparisons } from "@/lib/comparisons";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

// Editorial marketing content — safe to cache aggressively.
export const revalidate = 86400;
// Only the known comparison slugs exist; anything else is a hard 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getComparisons().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  const title = `be.vocl vs ${c.competitor} — an honest comparison`;
  const url = `${APP_URL}/vs/${c.slug}`;
  return {
    title,
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "be.vocl",
      title,
      description: c.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: c.metaDescription,
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  // FAQPage-ish structured data: state the comparison plainly for answer engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `be.vocl vs ${c.competitor}`,
    description: c.metaDescription,
    url: `${APP_URL}/vs/${c.slug}`,
    isPartOf: { "@type": "WebSite", name: "be.vocl", url: APP_URL },
    about: [
      { "@type": "Thing", name: "be.vocl" },
      { "@type": "Thing", name: c.competitor },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-vocl-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
            Comparison
          </span>
          <h1 className="mt-3 type-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            be.vocl <span className="text-foreground/40">vs</span> {c.competitor}
          </h1>
          <p className="mt-4 type-body text-lg text-foreground/70">{c.tagline}</p>
          <p className="mt-6 max-w-2xl type-body text-foreground/65">{c.intro}</p>
        </div>
      </section>

      <main id="main-content" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        {/* Credit where due */}
        <section>
          <h2 className="type-display text-2xl font-bold text-foreground">
            What {c.competitor} does well
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {c.theirStrengths.map((s) => (
              <li key={s} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vocl-primary/10 text-vocl-primary">
                  <IconCheck size={13} stroke={2.5} />
                </span>
                <span className="type-body text-foreground/75">{s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 type-body text-sm text-foreground/55">
            Both are good tools. The difference is what they&apos;re built for —
            here&apos;s where be.vocl goes a different way.
          </p>
        </section>

        {/* Comparison table */}
        <section className="mt-14">
          <h2 className="type-display text-2xl font-bold text-foreground">
            How they differ
          </h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-vocl-border">
                  <th className="py-3 pr-4 type-meta uppercase tracking-wider text-foreground/50 font-semibold">
                    &nbsp;
                  </th>
                  <th className="py-3 pr-4 type-display text-base font-bold text-vocl-primary">
                    be.vocl
                  </th>
                  <th className="py-3 type-display text-base font-bold text-foreground/70">
                    {c.competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.dimension} className="border-b border-vocl-border align-top">
                    <th className="py-4 pr-4 type-body text-sm font-semibold text-foreground/80">
                      {row.dimension}
                    </th>
                    <td className="py-4 pr-4 type-body text-sm text-foreground/75">
                      {row.bevocl}
                    </td>
                    <td className="py-4 type-body text-sm text-foreground/60">
                      {row.them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom line */}
        <section className="mt-14 rounded-2xl border border-vocl-border bg-vocl-hover/40 p-6 sm:p-8">
          <h2 className="type-display text-xl font-bold text-foreground">
            The bottom line
          </h2>
          <p className="mt-3 type-body text-foreground/70">{c.bottomLine}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-vocl-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
            >
              Join be.vocl — it&apos;s free
            </Link>
            <Link
              href="/discover"
              className="rounded-xl border border-vocl-border px-6 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-vocl-hover"
            >
              Look around first
            </Link>
          </div>
        </section>

        {/* Other comparisons */}
        <nav className="mt-14" aria-label="Other comparisons">
          <span className="type-meta uppercase tracking-widest text-foreground/45 font-semibold">
            Compare with others
          </span>
          <div className="mt-4 flex flex-wrap gap-3">
            {getComparisons()
              .filter((o) => o.slug !== c.slug)
              .map((o) => (
                <Link
                  key={o.slug}
                  href={`/vs/${o.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-vocl-border px-4 py-2 type-body text-sm text-foreground/75 transition-colors hover:bg-vocl-hover"
                >
                  be.vocl vs {o.competitor}
                  <IconArrowRight size={15} />
                </Link>
              ))}
          </div>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
