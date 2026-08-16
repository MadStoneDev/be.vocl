import type { Metadata } from "next";
import { Gloock, Lexend } from "next/font/google";
import { QueryProvider, ThemeProvider } from "@/components/providers";
import { Toaster } from "@/components/ui";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
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

export const metadata: Metadata = {
  title: {
    default: "be.vocl",
    template: "%s | be.vocl",
  },
  description: "Share your voice freely",
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
        <GoogleAnalytics />
      </body>
    </html>
  );
}
