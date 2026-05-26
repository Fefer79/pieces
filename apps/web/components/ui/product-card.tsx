'use client'

import { Price } from './price'
import { ConditionChip, type Condition } from './chip'

export interface ProductCardItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { shopName: string }
}

export function ProductCard({ item }: { item: ProductCardItem }) {
  return (
    <li className="flex gap-3 px-3 py-3 transition-colors hover:bg-surface">
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
        {item.imageThumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageThumbUrl}
            alt={item.name ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {item.name ?? 'Pièce'}
        </p>
        <p className="truncate text-xs text-muted">
          {item.category ?? '—'} · {item.vendor.shopName}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {item.condition && (
            <ConditionChip condition={item.condition as Condition} />
          )}
        </div>
      </div>
      {item.price != null && (
        <Price amount={item.price} className="self-center text-sm" />
      )}
    </li>
  )
}
