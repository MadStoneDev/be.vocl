import type { Metadata } from "next";
import { appPageMetadata } from "@/lib/metadata";

// Server-side title + noindex for the whole settings tree (a private surface).
// Subpages refine the tab title client-side; none of it is indexed.
export const metadata: Metadata = appPageMetadata("Settings");

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="px-4 sm:px-6">{children}</div>;
}
