import Link from "next/link";

/** Reusable footer for public/marketing pages (home, discover, comparison pages).
 *  Only links destinations that exist and are publicly reachable — extend the
 *  columns as new public pages (explore, comparisons, guidelines) ship. */

type FooterLink = { label: string; href: string };

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Explore",
    links: [{ label: "Discover", href: "/discover" }],
  },
  {
    heading: "Compare",
    links: [
      { label: "vs Tumblr", href: "/vs/tumblr" },
      { label: "vs Medium", href: "/vs/medium" },
      { label: "vs Substack", href: "/vs/substack" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Join be.vocl", href: "/signup" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-vocl-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="type-display text-2xl font-bold text-vocl-primary">
              be.vocl
            </span>
            <p className="mt-3 type-body text-sm text-foreground/60">
              A calmer corner of the social web — write, vent and share under your
              name or a pen name. You choose who sees it. We don&apos;t sell you.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="type-meta uppercase tracking-widest text-foreground/45 font-semibold">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="type-body text-sm text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-vocl-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-meta text-foreground/45">
            &copy; 2026 be.vocl. Your voice, your terms.
          </p>
          <p className="type-meta text-foreground/45">
            Made for people who&apos;d rather be honest.
          </p>
        </div>
      </div>
    </footer>
  );
}
