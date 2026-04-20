'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

const PUBLIC_LINKS = [
  { href: '/info#a-propos', label: 'À Propos' },
  { href: '/info#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/info#contact', label: 'Contact' },
]

const AUTH_LINKS = [
  { href: '/dashboard', label: 'Mon Tableau de Bord' },
  { href: '/profile', label: 'Mon Profil' },
  { href: '/vehicles', label: 'Mes Véhicules' },
  { href: '/orders', label: 'Mes Commandes' },
]

export function MobileDrawer() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        aria-label="Ouvrir le menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-card shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header with brand + close */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-display text-2xl text-ink">
            Pièces<span className="text-accent">.</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Fermer le menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-2">
            {isAuthenticated ? 'Mon compte' : 'Informations'}
          </p>
          <ul className="space-y-1">
            {(isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS).map((link) => (
              <li key={link.href + link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface hover:text-ink-2"
                >
                  <span>{link.label}</span>
                  <span className="text-muted-2">→</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {isAuthenticated ? (
            <a
              href="/browse"
              className="block rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Rechercher des pièces
            </a>
          ) : (
            <a
              href="/login"
              className="block rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Connexion
            </a>
          )}
        </div>
      </div>
    </>
  )
}
