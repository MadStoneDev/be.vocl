import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { getComparisons } from "@/lib/comparisons";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How be.vocl compares — honest platform comparisons",
  description:
    "See how be.vocl compares to Tumblr, Medium, and Substack — fair, factual side-by-side comparisons of privacy, identity, cost, and what each is built for.",
  alternates: { canonical: `${APP_URL}/vs` },
  openGraph: {
    type: "website",
    url: `${APP_URL}/vs`,
    siteName: "be.vocl",
    title: "How be.vocl compares",
    description:
      "Fair, factual comparisons of be.vocl with Tumblr, Medium, and Substack.",
  },
};

export default function ComparisonsIndex() {
  const comparisons = getComparisons();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MarketingHeader />

      <section className="border-b border-vocl-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
            Comparisons
          </span>
          <h1 className="mt-3 type-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            How be.vocl compares
          </h1>
          <p className="mt-4 max-w-2xl type-body text-lg text-foreground/70">
            Every platform is built for something. Here&apos;s an honest look at
            where be.vocl lines up with the places you might be coming from — and
            where it goes its own way.
          </p>
        </div>
      </section>

      <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2">
          {comparisons.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/vs/${c.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-vocl-border p-6 transition-colors hover:bg-vocl-hover"
              >
                <h2 className="type-display text-xl font-bold text-foreground">
                  be.vocl <span className="text-foreground/40">vs</span>{" "}
                  {c.competitor}
                </h2>
                <p className="mt-2 flex-1 type-body text-sm text-foreground/65">
                  {c.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 type-meta font-semibold text-vocl-primary">
                  Read the comparison
                  <IconArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
