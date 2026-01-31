// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

// let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
    // if (client) return client

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    //
    //
    // return client
}