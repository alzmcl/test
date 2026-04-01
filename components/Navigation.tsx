'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

interface NavigationProps {
  user: { id: string; email?: string } | null
  profile: Pick<Profile, 'name' | 'role'> | null
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/modeller', label: 'Modeller' },
  { href: '/budget', label: 'Budget' },
]

export default function Navigation({ user, profile }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'

  return (
    <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center">
              <span className="text-gold text-sm font-bold">R</span>
            </div>
            <span className="hidden sm:block text-sm font-semibold text-text-primary">
              Retirement Planner
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-navy text-gold'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-raised'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* User / sign-out */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-text-muted">
              {displayName}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex sm:hidden items-center gap-1 pb-2">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-navy text-gold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
