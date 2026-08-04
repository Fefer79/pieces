'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { erpFetch, SEARCH_KIND_LABELS, type ErpSearchHit } from '@/lib/erp-api'

// Recherche transverse de la console.
//
// C'est la sortie de secours qui rend une navigation à neuf sections
// confortable : quand on sait ce qu'on cherche, on ne navigue pas. Ouverture au
// clavier (⌘K / Ctrl+K) depuis n'importe quel écran.
//
// L'API garde chaque famille de résultats par la capacité de la section qui
// l'héberge : la recherche n'est pas un contournement des habilitations.

export function ErpSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<ErpSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⚠ La remise à zéro se fait à la fermeture (gestionnaire d'événement), pas
  // dans un effet sur `open` : un setState synchrone dans un effet déclenche un
  // rendu en cascade — et la règle react-hooks/set-state-in-effect le refuse.
  const close = useCallback(() => {
    setOpen(false)
    setQ('')
    setHits([])
    setCursor(0)
  }, [])

  // Raccourci global. `keydown` sur document : l'utilisateur peut être
  // n'importe où dans la page, y compris dans un tableau qui a le focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Recherche débouncée : évite un appel par frappe. Sous deux caractères on ne
  // touche pas à l'état — l'affichage est dérivé de `q` (voir `shown`).
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      void (async () => {
        const res = await erpFetch<{ hits: ErpSearchHit[] }>(
          `/search?q=${encodeURIComponent(term)}`,
        )
        if (cancelled) return
        setHits(res.ok ? res.data.hits : [])
        setCursor(0)
        setLoading(false)
      })()
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  const term = q.trim()
  const shown = term.length >= 2 ? hits : []
  const searching = term.length >= 2 && loading

  function go(hit: ErpSearchHit) {
    close()
    router.push(hit.href)
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, Math.max(shown.length - 1, 0)))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    }
    if (e.key === 'Enter' && shown[cursor]) {
      e.preventDefault()
      go(shown[cursor])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-sm border border-border-strong bg-card px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface"
      >
        <span>Rechercher…</span>
        <kbd className="rounded-xs border border-border px-1 font-mono text-[10px] text-muted-2">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh]"
          onClick={close}
          role="presentation"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-md border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Recherche"
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Compte, vendeur, pièce, commande, dossier, expédition…"
              className="w-full border-b border-border bg-transparent px-4 py-3.5 text-[14.5px] text-ink outline-none placeholder:text-muted-2"
            />

            <div className="max-h-[52vh] overflow-y-auto">
              {searching && <p className="px-4 py-6 text-center text-[13px] text-muted">Recherche…</p>}

              {!searching && term.length >= 2 && shown.length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-muted">Aucun résultat.</p>
              )}

              {!searching && term.length < 2 && (
                <p className="px-4 py-6 text-center text-[13px] text-muted">
                  Deux caractères au minimum.
                </p>
              )}

              {!searching &&
                shown.map((hit, i) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => go(hit)}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === cursor ? 'bg-surface' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {hit.label}
                      </span>
                      {hit.hint && (
                        <span className="block truncate text-[12px] text-muted">{hit.hint}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {SEARCH_KIND_LABELS[hit.kind]}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
