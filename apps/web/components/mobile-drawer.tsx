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
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
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
          className="fixed inset-0 z-50 bg-black/40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-64 flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <span className="text-sm font-semibold text-[#1A1A1A]">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
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
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {(isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS).map((link) => (
              <li key={link.href + link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#002366]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-4">
          {isAuthenticated ? (
            <a
              href="/browse"
              className="block rounded-lg bg-[#002366] px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#1565C0]"
            >
              Rechercher
            </a>
          ) : (
            <a
              href="/login"
              className="block rounded-lg bg-[#002366] px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#1565C0]"
            >
              Connexion
            </a>
          )}
        </div>
      </div>
    </>
  )
}
