'use client'

import { useMemo } from 'react'
import { PART_CATALOG, splitCategory, joinCategory } from 'shared/constants'

const CATEGORY_NAMES = Object.keys(PART_CATALOG)

/**
 * Sélecteur cascade catégorie → sous-catégorie, adossé au référentiel partagé
 * `PART_CATALOG`. Pilote une valeur unique combinée "Catégorie / Sous-catégorie"
 * (cf. splitCategory/joinCategory de shared/constants). Émet la chaîne combinée
 * via `onChange` — vide si aucune catégorie.
 *
 * Rend deux `<select>` empilés (le second n'apparaît que si la catégorie a des
 * sous-catégories). Le libellé extérieur (« Catégorie ») est fourni par l'appelant
 * (Field/label de la page) pour respecter le style de chaque formulaire.
 *
 * Les valeurs héritées hors référentiel (anciennes annonces, imports) sont
 * conservées et restent sélectionnées pour ne pas être perdues à l'édition.
 */
export function CategoryCascadeSelect({
  value,
  onChange,
  className = '',
  disabled = false,
  categoryPlaceholder = 'Choisir…',
  subcategoryPlaceholder = 'Sous-catégorie (optionnel)',
}: {
  value?: string | null
  onChange: (combined: string) => void
  className?: string
  disabled?: boolean
  categoryPlaceholder?: string
  subcategoryPlaceholder?: string
}) {
  const { category, subcategory } = splitCategory(value)

  const categoryOptions = useMemo(
    () =>
      category && !CATEGORY_NAMES.includes(category)
        ? [category, ...CATEGORY_NAMES]
        : CATEGORY_NAMES,
    [category],
  )

  const subcategoryOptions = useMemo(() => {
    const subs = PART_CATALOG[category as keyof typeof PART_CATALOG] ?? []
    return subcategory && !subs.includes(subcategory) ? [subcategory, ...subs] : subs
  }, [category, subcategory])

  return (
    <div className="space-y-2">
      <select
        aria-label="Catégorie de la pièce"
        value={category}
        disabled={disabled}
        onChange={(e) => onChange(joinCategory(e.target.value, ''))}
        className={className}
      >
        <option value="">{categoryPlaceholder}</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {category && subcategoryOptions.length > 0 && (
        <select
          aria-label="Sous-catégorie de la pièce"
          value={subcategory}
          disabled={disabled}
          onChange={(e) => onChange(joinCategory(category, e.target.value))}
          className={className}
        >
          <option value="">{subcategoryPlaceholder}</option>
          {subcategoryOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
