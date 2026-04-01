import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server Component / Route Handler / Server Action Supabase client.
 * Reads and writes auth cookies via next/headers.
 * Import ONLY in server-side code.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Calling setAll from a Server Component is fine to ignore —
            // middleware handles session refresh.
          }
        },
      },
    }
  )
}
