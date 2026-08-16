import Link from "next/link";

/** Shared top bar for public/marketing pages. Mirrors the landing-page header. */
export function MarketingHeader() {
  return (
    <header className="border-b border-vocl-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
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
  );
}
