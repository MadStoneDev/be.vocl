import type { Metadata } from "next";
import { Gloock, Lexend } from "next/font/google";
import { QueryProvider } from "@/components/providers";
import { Toaster } from "@/components/ui";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${gloock.variable} ${lexend.variable} antialiased`}
      >
        <QueryProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
