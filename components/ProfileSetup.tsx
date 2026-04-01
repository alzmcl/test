'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/types'

interface Props {
  userId: string
  email: string | null
}

export default function ProfileSetup({ userId, email }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('husband')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('profiles').insert({
      id: userId,
      name: name.trim(),
      role,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy mb-2">
            <span className="text-gold text-xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Welcome</h1>
          <p className="text-sm text-text-muted">
            {email ? `Signed in as ${email}` : 'Set up your profile to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="label">Your first name</label>
            <input
              id="name"
              type="text"
              autoFocus
              required
              className="input-field w-full"
              placeholder="e.g. James"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <span className="label">I am the…</span>
            <div className="grid grid-cols-2 gap-3">
              {(['husband', 'wife'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-xl border font-medium text-sm capitalize transition-colors duration-150 ${
                    role === r
                      ? 'bg-navy border-gold text-gold'
                      : 'bg-bg-raised border-bg-border text-text-muted hover:border-gold/40 hover:text-text-secondary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-negative text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="btn-primary w-full mt-1"
          >
            {saving ? 'Setting up…' : 'Get started →'}
          </button>
        </form>

        <p className="text-center mt-4 text-xs text-text-subtle">
          Your partner will create their own account and pick the other role.
        </p>
      </div>
    </div>
  )
}
