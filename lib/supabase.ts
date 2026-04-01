import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser / Client Component Supabase client.
 * Uses @supabase/ssr so cookies are handled automatically.
 * Call this inside Client Components or browser-side hooks.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
