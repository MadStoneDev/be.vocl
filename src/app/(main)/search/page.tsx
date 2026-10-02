import type { Metadata } from "next";
import { Suspense } from "react";
import { appPageMetadata, truncateWords } from "@/lib/metadata";
import SearchClient from "./SearchClient";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

// Server title so the tab/HTML reads "food" — Search | be.vocl for a query,
// Search | be.vocl otherwise. Search results are never indexed.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim();
  return appPageMetadata(q ? `"${truncateWords(q, 40)}" — Search` : "Search");
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchClient />
    </Suspense>
  );
}
