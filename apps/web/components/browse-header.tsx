'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MobileDrawer } from './mobile-drawer'
import { PartSearchAutocomplete } from './part-search-autocomplete'
import { useAuth } from '@/lib/auth-context'
import { useSelectedVehicle } from '@/lib/selected-vehicle'

const WA_URL = 'https://wa.me/2250706846268'

// Header de /browse. Même gabarit que le chrome des vitrines
// (components/vitrine/VitrineShell.tsx) : barre h-16, libellé de section à
// CÔTÉ du logo (pas dessous). Ici le fond reste clair (carte) — c'est le navy
// qui est réservé aux vitrines.
//  - mobile  : logo + email / téléphone à droite, puis le menu (drawer)
//  - desktop : loupe qui déploie la recherche à la demande (la recherche
//    permanente existe déjà dans le corps de page, « Trouvez votre pièce »)
export function BrowseHeader() {
  const { isAuthenticated, user } = useAuth()
  const { vehicle, clearVehicle } = useSelectedVehicle()
  const isAdmin = user?.roles?.includes('ADMIN') ?? false
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Recherche scopée au véhicule sélectionné si présent
  // (le /search retombe sinon sur le véhicule en localStorage).
  const goSearch = (term: string) => {
    const q = term.trim()
    if (q.length < 2) return
    const params = new URLSearchParams({ q })
    if (vehicle?.brand) {
      params.set('brand', vehicle.brand)
      if (vehicle.model) params.set('model', vehicle.model)
      if (vehicle.year) params.set('year', vehicle.year)
    }
    setSearchOpen(false)
    router.push(`/search?${params.toString()}`)
  }

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 lg:gap-4 lg:px-6">
        <Link
          href="/"
          aria-label="Pièces — accueil"
          className="flex-shrink-0 font-display text-2xl leading-none text-ink"
        >
          Pièces<span className="text-accent">.</span>
        </Link>
        <Link
          href="/browse"
          className="hidden border-l border-border pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted hover:text-ink lg:block"
        >
          Marketplace
        </Link>

        {/* Mobile : contacts à droite du logo */}
        <div className="flex min-w-0 flex-col items-end gap-0.5 text-[11px] leading-tight lg:hidden ml-auto">
          <a href="mailto:contact@pieces.ci" className="truncate text-ink hover:text-accent">
            contact@pieces.ci
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:text-accent"
          >
            (225) 07 06 84 62 68
          </a>
        </div>
        <div className="lg:hidden">
          <MobileDrawer />
        </div>

        {/* Desktop */}
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {vehicle && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
              <span className="text-muted">Véhicule :</span>
              <span className="font-medium text-ink">
                {vehicle.brand} · {vehicle.model}
                {vehicle.year ? ` · ${vehicle.year}` : ''}
              </span>
              <button
                type="button"
                onClick={clearVehicle}
                className="text-muted-2 transition-colors hover:text-ink"
                aria-label="Supprimer le véhicule"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Rechercher une pièce"
            aria-expanded={searchOpen}
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isAdmin && (
            <>
              <a
                href="/admin"
                className="rounded-md border border-ink-2 px-4 py-2 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-ink-2 hover:text-white"
              >
                Admin
              </a>
              <a
                href="/liaison"
                className="rounded-md border border-ink-2 px-4 py-2 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-ink-2 hover:text-white"
              >
                Liaison
              </a>
            </>
          )}

          <a
            href={isAuthenticated ? '/profile' : '/login'}
            className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {isAuthenticated ? 'Mon compte' : 'Connexion'}
          </a>
        </div>
      </div>

      {/* Recherche déployée (desktop) */}
      {searchOpen && (
        <div className="hidden border-t border-border bg-card lg:block">
          <div className="mx-auto max-w-[1280px] px-6 py-3">
            <PartSearchAutocomplete
              value={query}
              onChange={setQuery}
              onSubmit={goSearch}
              vehicle={vehicle ? { brand: vehicle.brand, model: vehicle.model, year: vehicle.year } : null}
              placeholder="Nom de la pièce ou référence OEM…"
              autoFocus
              className="mx-auto w-full max-w-2xl"
            />
          </div>
        </div>
      )}
    </header>
  )
}
