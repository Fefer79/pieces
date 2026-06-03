'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/role-labels'
import { apiFetch } from '@/lib/enterprise-api'

function initials(user: { email: string | null; phone: string | null }): string {
  if (user.email) return user.email.slice(0, 2).toUpperCase()
  if (user.phone) return user.phone.replace(/\D/g, '').slice(-2)
  return '··'
}

function displayName(user: { email: string | null; phone: string | null }): string {
  if (user.email) return user.email.split('@')[0] ?? user.email
  return user.phone ?? 'Mon compte'
}

export function ContextSwitcher({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null

  const roles = user.roles ?? []
  const active = user.activeContext

  async function switchTo(role: string) {
    if (switching || role === active) {
      setOpen(false)
      return
    }
    setSwitching(role)
    const res = await apiFetch('/users/me/context', {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
    setSwitching(null)
    setOpen(false)
    if (res.ok) {
      await refreshProfile()
      router.refresh()
    }
  }

  const dark = variant === 'dark'
  const triggerCls = dark
    ? 'bg-white/[0.07] hover:bg-white/[0.12]'
    : 'bg-surface border border-border hover:border-border-strong'
  const nameCls = dark ? 'text-white' : 'text-ink'
  const roleCls = dark ? 'text-white/55' : 'text-muted'
  const chevCls = dark ? 'text-white/50' : 'text-muted-2'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-md p-2.5 transition-colors ${triggerCls}`}
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white">
          {initials(user)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-[13px] font-semibold ${nameCls}`}>
            {displayName(user)}
          </span>
          <span className={`block font-mono text-[10px] uppercase tracking-[0.1em] ${roleCls}`}>
            {active ? (ROLE_LABELS[active] ?? active) : 'Aucun rôle'}
          </span>
        </span>
        <svg
          className={chevCls}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && roles.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-border bg-card py-1 shadow-md">
          <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
            Changer de contexte
          </p>
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => switchTo(role)}
              disabled={switching !== null}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              <span>{ROLE_LABELS[role] ?? role}</span>
              {role === active ? (
                <span className="text-accent">●</span>
              ) : switching === role ? (
                <span className="text-xs text-muted">…</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
