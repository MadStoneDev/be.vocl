import Link from "next/link";

/** Broadsheet "classified" footer for public/marketing pages (home, discover,
 *  comparison pages). Rules, not cards; a mono colophon on the right. Only links
 *  destinations that exist and are publicly reachable — extend as new public
 *  pages ship. */

type FooterLink = { label: string; href: string };

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Compared",
    links: [
      { label: "be.vocl vs Tumblr", href: "/vs/tumblr" },
      { label: "be.vocl vs Medium", href: "/vs/medium" },
      { label: "be.vocl vs Substack", href: "/vs/substack" },
    ],
  },
  {
    heading: "The paper",
    links: [
      { label: "Front Page", href: "/" },
      { label: "The Newsstand", href: "/discover" },
      { label: "Get started", href: "/signup" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Content policy · 21+", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="slug text-ink mb-3">{col.heading}</h3>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs leading-relaxed text-caption transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Colophon */}
          <div className="col-span-2 text-left slug leading-loose text-meta-dim sm:col-span-1 sm:text-right">
            be.vocl
            <br />
            Late edition · No. 0311
            <br />
            © 2026 · Adults only
          </div>
        </div>
      </div>
    </footer>
  );
}
