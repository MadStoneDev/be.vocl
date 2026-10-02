import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunity } from "@/actions/communities";
import { canonicalUrl } from "@/lib/metadata";
import SettingsClient from "./SettingsClient";

type Props = { params: Promise<{ slug: string }> };

// Community settings is owner/moderator-only (the client gates the content).
// Never indexed; still 404s for a desk that doesn't exist.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) {
    return { title: { absolute: "Page not found | be.vocl" } };
  }
  return {
    title: `Settings — ${c.community.name}`,
    alternates: { canonical: canonicalUrl(`/c/${c.community.slug}/settings`) },
    robots: { index: false, follow: false },
  };
}

export default async function CommunitySettingsPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) notFound();
  return <SettingsClient />;
}
