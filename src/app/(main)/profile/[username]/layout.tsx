import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { children: React.ReactNode; params: Promise<{ username: string }> };

/**
 * Gate the profile route (and its nested /archive) on the username existing.
 * This runs BEFORE loading.tsx and before any body streams, so an unknown
 * username returns a real 404 status in normal browsers too — a notFound() in
 * the page or generateMetadata is too late (Next streams page metadata for
 * non-bot user agents since 15.2, so the 200 is already on the wire).
 *
 * Admin client so a private-but-existing profile is NOT falsely 404'd (RLS
 * would hide it). Only a genuinely missing username has no row.
 */
export default async function ProfileLayout({ children, params }: Props) {
  const { username } = await params;
  const admin = createAdminClient();
  const { data: exists } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!exists) notFound();
  return <>{children}</>;
}
