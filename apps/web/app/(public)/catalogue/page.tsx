'use client'

import Link from 'next/link'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { MiniCartButton } from '@/components/cart/mini-cart'
import { CatalogueSection } from '@/components/catalogue-section'

export default function CataloguePage() {
  const { vehicle, clearVehicle } = useSelectedVehicle()

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Catalogue</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-ink-2 hover:underline">
              ← Accueil
            </Link>
            <MiniCartButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {/* Vehicle pill */}
        <div
          className={`flex items-center justify-between gap-3 rounded-md border-2 px-4 py-2.5 lg:px-5 ${
            vehicle
              ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
              : 'border-accent bg-[rgba(255,107,0,0.06)]'
          }`}
          style={{ minHeight: 48 }}
        >
          {vehicle ? (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-2 text-white"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                  </svg>
                </span>
                <p className="truncate text-sm">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">
                    Véhicule sélectionné ·{' '}
                  </span>
                  <span className="font-semibold text-ink">
                    {vehicle.brand} · {vehicle.model}
                    {vehicle.year ? ` · ${vehicle.year}` : ''}
                    {vehicle.motor ? ` · ${vehicle.motor}` : ''}
                  </span>
                </p>
              </div>
              <button
                onClick={clearVehicle}
                className="flex-shrink-0 p-1 text-muted-2 transition-colors hover:text-ink"
                aria-label="Supprimer le véhicule"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/browse"
              className="flex w-full items-center gap-2.5 text-left"
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white"
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
              </span>
              <span className="truncate text-sm">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">
                  Sélectionnez votre véhicule ·{' '}
                </span>
                <span className="text-ink">
                  Toutes les pièces sont affichées
                </span>
              </span>
            </Link>
          )}
        </div>

        {/* Catalogue (titre + chips catégories + grille + pagination) */}
        <div className="mt-6">
          <CatalogueSection titleAs="h1" />
        </div>
      </div>
    </div>
  )
}
