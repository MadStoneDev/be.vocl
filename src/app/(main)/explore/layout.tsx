import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover posts, people and desks across be.vocl.",
  alternates: { canonical: canonicalUrl("/explore") },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
