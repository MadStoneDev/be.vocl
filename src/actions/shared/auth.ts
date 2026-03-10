import { createClient } from "@/lib/supabase/server";

/**
 * Shared auth helper: creates a Supabase client and gets the current user.
 * Callers still handle their own "not authenticated" error response shape.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}
