import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunity } from "@/actions/communities";
import { canonicalUrl } from "@/lib/metadata";
import { MembersClient } from "./MembersClient";

type Props = { params: Promise<{ slug: string }> };

// Server wrapper: real titles/canonical + a genuine 404 for a missing desk.
// getCommunity runs under the viewer's session, so community visibility (RLS)
// is honoured — anyone who can view the desk can see its members.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) {
    return { title: { absolute: "Page not found | be.vocl" } };
  }
  return {
    title: `Members — ${c.community.name}`,
    description: `The members of ${c.community.name} on be.vocl.`,
    alternates: { canonical: canonicalUrl(`/c/${c.community.slug}/members`) },
    // A member roster is a utility surface, not search-result material.
    robots: { index: false, follow: true },
  };
}

export default async function CommunityMembersPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) {
    notFound();
  }
  return <MembersClient />;
}
