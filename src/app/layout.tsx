import type { Metadata } from "next";
import { Gloock, Lexend } from "next/font/google";
import { QueryProvider, ThemeProvider } from "@/components/providers";
import { Toaster } from "@/components/ui";
import { Analytics } from "@/components/analytics/Analytics";
import { ACCENT_BOOT_SCRIPT } from "@/lib/accent";
import "./globals.css";

const gloock = Gloock({
  variable: "--font-gloock--display",
  subsets: ["latin"],
  weight: "400",
});

const lexend = Lexend({
  variable: "--font-lexend-sans",
  subsets: ["latin"],
  weight: ["200", "400", "700"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs (incl. the default opengraph-image) —
  // without this Next warns and falls back to localhost in some contexts.
  metadataBase: new URL(APP_URL),
  title: {
    default: "be.vocl",
    template: "%s | be.vocl",
  },
  description: "Share your voice freely",
  // Default social card + branding; pages override per-route as needed. The
  // default share image comes from app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: "be.vocl",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
  // Google Search Console ownership verification — set GSC_VERIFICATION to the
  // token from GSC's "HTML tag" method. Omitted (no meta tag) until then.
  verification: process.env.GSC_VERIFICATION
    ? { google: process.env.GSC_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${gloock.variable} ${lexend.variable} antialiased`}
      >
        {/* Apply the saved UI accent before first paint (no colour flash). */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOT_SCRIPT }} />
        <ThemeProvider>
          <QueryProvider>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
