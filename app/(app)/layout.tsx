import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navigation from '@/components/Navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation user={user} profile={profile} />
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
