'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { spaceForRole, spacesForRoles } from '@/lib/spaces'

// Menu « Aller à… » : liste les espaces de l'utilisateur et navigue vers leur
// racine — la bascule de contexte est faite par le SpaceGuard à l'arrivée
// (un seul mécanisme). Mono-espace : simple lien vers le profil, le concept
// d'espaces reste invisible.
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
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null

  const mySpaces = spacesForRoles(user.roles ?? [])
  const current = spaceForRole(user.activeContext)
  const multiSpace = mySpaces.length > 1

  const dark = variant === 'dark'
  const triggerCls = dark
    ? 'bg-white/[0.07] hover:bg-white/[0.12]'
    : 'bg-surface border border-border hover:border-border-strong'
  const nameCls = dark ? 'text-white' : 'text-ink'
  const roleCls = dark ? 'text-white/55' : 'text-muted'
  const chevCls = dark ? 'text-white/50' : 'text-muted-2'

  const triggerContent = (
    <>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white">
        {initials(user)}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-[13px] font-semibold ${nameCls}`}>
          {displayName(user)}
        </span>
        <span className={`block font-mono text-[10px] uppercase tracking-[0.1em] ${roleCls}`}>
          {current?.label ?? 'Mon compte'}
        </span>
      </span>
      {multiSpace && (
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
      )}
    </>
  )

  // Un seul espace : le bloc mène au profil, pas de menu.
  if (!multiSpace) {
    return (
      <Link
        href="/profile"
        className={`flex w-full items-center gap-2.5 rounded-md p-2.5 transition-colors ${triggerCls}`}
      >
        {triggerContent}
      </Link>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-md p-2.5 transition-colors ${triggerCls}`}
      >
        {triggerContent}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-border bg-card py-1 shadow-md">
          <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
            Aller à…
          </p>
          {mySpaces.map((space) => (
            <Link
              key={space.key}
              href={space.root}
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface"
            >
              <span>{space.label}</span>
              {space.key === current?.key && <span className="text-accent">●</span>}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link
            href="/profile/espaces"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            + Activer un autre espace
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            Mon profil
          </Link>
        </div>
      )}
    </div>
  )
}
