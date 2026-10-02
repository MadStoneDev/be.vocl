import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTagByName } from "@/actions/tags";
import { canonicalUrl } from "@/lib/metadata";
import TagClient from "./TagClient";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const res = await getTagByName(decodeURIComponent(name));
  if (!res.success || !res.tag) {
    return { title: { absolute: "Page not found | be.vocl" } };
  }
  const tag = res.tag.name;
  const description = `Posts tagged #${tag} on be.vocl`;
  return {
    title: `#${tag}`,
    description,
    alternates: { canonical: canonicalUrl(`/tag/${encodeURIComponent(tag)}`) },
    openGraph: { title: `#${tag} | be.vocl`, description, type: "website" },
  };
}

export default async function TagPage({ params }: Props) {
  const { name } = await params;
  const res = await getTagByName(decodeURIComponent(name));
  if (!res.success || !res.tag) notFound();
  return <TagClient />;
}
