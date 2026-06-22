import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThreadPageClient } from "./ThreadPageClient";

interface Props {
  params: Promise<{ threadId: string }>;
}

// Threads are a members-only conversation view: a single Public post is readable
// at /post/[id] (server-gated), but the aggregated thread — which can include
// Members-only siblings — requires login. Never indexed.
export const metadata: Metadata = {
  title: "Thread | be.vocl",
  robots: { index: false, follow: false },
};

export default async function ThreadPage({ params }: Props) {
  const { threadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/thread/${threadId}`)}`);
  }

  return <ThreadPageClient threadId={threadId} />;
}
