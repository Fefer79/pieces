'use client'

import { useState } from 'react'

/**
 * Meilleure URL d'image disponible pour une pièce, dans l'ordre de préférence
 * vignette → moyenne → originale. Les annonces importées (scrapers) n'ont
 * souvent QUE `imageOriginalUrl` — les variantes thumb/medium ne sont générées
 * que pour les uploads passés par Sharp/R2. Sans ce fallback, ~99% du catalogue
 * s'affiche sans photo.
 */
export function bestPartImage(item: {
  imageThumbUrl?: string | null
  imageMediumUrl?: string | null
  imageOriginalUrl?: string | null
}): string | null {
  return item.imageThumbUrl ?? item.imageMediumUrl ?? item.imageOriginalUrl ?? null
}

/**
 * Vignette de pièce — affiche TOUJOURS quelque chose.
 * Si l'image existe et charge : photo (object-cover).
 * Sinon (pas d'URL ou URL cassée) : placeholder SVG « pas de photo » cohérent
 * sur toutes les surfaces (résultats de sélection, listings, commandes, admin).
 *
 * Remplit son conteneur (h-full w-full) — le conteneur (Link, div…) porte
 * la taille, le rounded et le bg-surface. Drop-in pour les blocs
 * `{src ? <img/> : <div>—</div>}`.
 */
export function PartThumb({
  src,
  alt = '',
  className = '',
}: {
  src?: string | null
  alt?: string | null
  className?: string
}) {
  const [broken, setBroken] = useState(false)

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover ${className}`.trim()}
      />
    )
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-surface text-muted-2 ${className}`.trim()}
      aria-label="Pas de photo"
      role="img"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-2/5 max-h-8 min-h-4 w-2/5 min-w-4 max-w-8"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  )
}
