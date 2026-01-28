import { createServerClient as createSSRClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Mock client for development without Supabase configured
function createMockClient(): SupabaseClient<Database> {
  const mockResponse = { data: null, error: null };
  const mockAuthResponse = { data: { user: null, session: null }, error: null };

  return {
    auth: {
      getUser: async () => mockAuthResponse,
      getSession: async () => mockAuthResponse,
      signInWithPassword: async () => mockAuthResponse,
      signUp: async () => mockAuthResponse,
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => mockResponse,
      update: () => mockResponse,
      delete: () => mockResponse,
      eq: () => ({ data: [], error: null }),
    }),
  } as unknown as SupabaseClient<Database>;
}

export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return mock client if Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase not configured. Using mock client.");
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createSSRClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
