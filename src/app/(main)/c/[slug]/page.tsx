import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunity } from "@/actions/communities";
import { canonicalUrl, truncateWords } from "@/lib/metadata";
import CommunityDeskClient from "./CommunityDeskClient";

type Props = { params: Promise<{ slug: string }> };

// getCommunity runs under the viewer's session; RLS decides what resolves, so a
// desk the viewer can't see 404s for them. Public desks are indexable.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) {
    return { title: { absolute: "Page not found | be.vocl" } };
  }
  const comm = c.community;
  const description = comm.description
    ? truncateWords(comm.description, 155)
    : `The ${comm.name} desk on be.vocl.`;
  const indexable = comm.visibility === "public";
  return {
    title: comm.name,
    description,
    alternates: { canonical: canonicalUrl(`/c/${comm.slug}`) },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: `${comm.name} | be.vocl`,
      description,
      type: "website",
      ...(comm.iconUrl ? { images: [{ url: comm.iconUrl }] } : {}),
    },
  };
}

export default async function CommunityDeskPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) notFound();
  return <CommunityDeskClient />;
}
