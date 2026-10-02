import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunity } from "@/actions/communities";
import { canonicalUrl, truncateWords } from "@/lib/metadata";
import AboutClient from "./AboutClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) {
    return { title: { absolute: "Page not found | be.vocl" } };
  }
  const comm = c.community;
  const description = comm.description
    ? truncateWords(comm.description, 155)
    : `About the ${comm.name} desk on be.vocl.`;
  return {
    title: `About — ${comm.name}`,
    description,
    alternates: { canonical: canonicalUrl(`/c/${comm.slug}/about`) },
    robots:
      comm.visibility === "public"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function CommunityAboutPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c.success || !c.community) notFound();
  return <AboutClient />;
}
