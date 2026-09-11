import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppChrome } from "./AppChrome";

/**
 * Server layout for the main app group. Authenticated users get the full app
 * chrome (sidebar, nav, chat, FAB). Logged-out visitors — who can only reach
 * public surfaces here, e.g. a Public post at /post/[id] — get a clean,
 * newspaper-style reading view with a simple masthead and no app chrome.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return <AppChrome>{children}</AppChrome>;
  }

  // Logged-out reading view — masthead + centered column + sign-up footer.
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="font-display text-2xl leading-none text-accent">
            be.vocl
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/login"
              className="byline text-ink transition-colors hover:text-accent"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-accent px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
            >
              Subscribe
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">{children}</div>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
          <p className="kicker kicker-accent mb-3">Keep reading</p>
          <p className="type-display text-ink">Like what you&apos;re reading?</p>
          <p className="editorial-body text-meta mt-3 mx-auto max-w-[46ch]">
            Subscribe to be.vocl to follow the voices you love and file your own.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block bg-accent px-6 py-3 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
          >
            Subscribe · 21+
          </Link>
        </div>
      </footer>
    </div>
  );
}
