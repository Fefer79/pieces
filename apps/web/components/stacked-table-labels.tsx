'use client'

import { useEffect } from 'react'

/**
 * Recopie l'en-tête de colonne de chaque cellule dans `data-label`, pour toutes
 * les tables `.pi-table` de la page. Sous 640px, `globals.css` empile ces tables
 * en cartes et affiche ce libellé en préfixe de cellule — sans quoi une valeur
 * isolée (« 12 400 F », « Yopougon ») ne veut plus rien dire.
 *
 * Monté une fois dans le layout racine plutôt que dans le composant `Table` :
 * les lignes sont souvent rendues par un sous-composant que le parent ne peut
 * pas inspecter, et certaines tables sont du markup brut dans des composants
 * serveur, qui ne peuvent pas porter de hook.
 */
export function StackedTableLabels() {
  useEffect(() => {
    let frame = 0

    const apply = () => {
      frame = 0
      for (const table of Array.from(document.querySelectorAll('table.pi-table'))) {
        const heads = Array.from(table.querySelectorAll('thead tr:last-child th')).map((th) =>
          (th.textContent ?? '').trim(),
        )
        if (heads.length === 0) continue
        for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
          const cells = Array.from(row.children) as HTMLTableCellElement[]
          // Ligne d'état (« Chargement… », « Aucune commande ») : une cellule
          // fusionnée, aucun libellé de colonne n'a de sens.
          if (cells.length === 1 && cells[0] && cells[0].colSpan > 1) {
            cells[0].removeAttribute('data-label')
            continue
          }
          cells.forEach((cell, i) => {
            const label = heads[i] ?? ''
            if (label) {
              if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label)
            } else cell.removeAttribute('data-label')
          })
        }
      }
    }

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(apply)
    }

    schedule()
    // Les lignes arrivent après un fetch, et la navigation App Router remplace
    // l'arbre sans remonter ce composant. On n'observe que childList, donc nos
    // propres setAttribute ne rebouclent pas.
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
