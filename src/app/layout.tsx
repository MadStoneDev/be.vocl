import type { Metadata } from "next";
import { Gloock, Lexend } from "next/font/google";
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
  title: "be.vocl",
  description: "Share your voice freely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${gloock.variable} ${lexend.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
