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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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

      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</div>
      </main>

      <footer className="border-t border-vocl-border">
        <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6">
          <p className="type-display text-xl font-bold text-foreground">
            Like what you&apos;re reading?
          </p>
          <p className="type-body text-foreground/65 mt-2">
            Join be.vocl to follow voices you love and share your own.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-block rounded-xl bg-vocl-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
          >
            Join be.vocl
          </Link>
        </div>
      </footer>
    </div>
  );
}
