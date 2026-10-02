import type { Metadata } from "next";
import { Suspense } from "react";
import { appPageMetadata } from "@/lib/metadata";
import CreateClient from "./CreateClient";

type Props = { searchParams: Promise<{ edit?: string | string[] }> };

// New post | be.vocl, or Edit post | be.vocl with ?edit=<id>. Never indexed.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const isEdit = !!(Array.isArray(sp.edit) ? sp.edit[0] : sp.edit);
  return appPageMetadata(isEdit ? "Edit post" : "New post");
}

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateClient />
    </Suspense>
  );
}
