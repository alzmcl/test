import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navigation from '@/components/Navigation'
import ProfileSetup from '@/components/ProfileSetup'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if profile exists; if not, show setup screen inline
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <ProfileSetup
        userId={user.id}
        email={user.email ?? null}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation user={user} profile={profile} />
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
