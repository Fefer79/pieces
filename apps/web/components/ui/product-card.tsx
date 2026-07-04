'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Price } from './price'
import { ConditionChip, type Condition } from './chip'
import { PartThumb, bestPartImage } from './part-thumb'
import { useCart } from '@/lib/cart'

export interface ProductCardItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  partSource?: string | null
  price: number | null
  imageThumbUrl: string | null
  imageMediumUrl?: string | null
  imageOriginalUrl?: string | null
  vendor: { id?: string; shopName: string }
}

export function ProductCard({ item }: { item: ProductCardItem }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const imageUrl = bestPartImage(item)

  function handleAdd() {
    if (!item.vendor.id) return
    addItem(
      {
        catalogItemId: item.id,
        name: item.name ?? 'Pièce',
        category: item.category,
        vendorId: item.vendor.id,
        vendorShopName: item.vendor.shopName,
        price: item.price,
        condition: item.condition,
        partSource: item.partSource ?? null,
        imageThumbUrl: imageUrl,
      },
      1,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <li className="flex gap-3 px-3 py-3 transition-colors hover:bg-surface">
      <Link
        href={`/produit/${item.id}`}
        className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface"
      >
        <PartThumb src={imageUrl} alt={item.name} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/produit/${item.id}`}
          className="block truncate text-sm font-medium text-ink hover:underline"
        >
          {item.name ?? 'Pièce'}
        </Link>
        <p className="truncate text-xs text-muted">
          {item.category ?? '—'} · {item.vendor.shopName}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {item.condition && <ConditionChip condition={item.condition as Condition} />}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center gap-1.5">
        {item.price != null && <Price amount={item.price} className="text-sm" />}
        {item.vendor.id && (
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-sm border border-border-strong px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-ink hover:bg-card"
          >
            {added ? 'Ajouté ✓' : '+ Ajouter'}
          </button>
        )}
      </div>
    </li>
  )
}
