import Link from 'next/link'
import { Price } from './price'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from './chip'
import { bestPartImage } from './part-thumb'

export interface ProductGridItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  partSource: string | null
  price: number | null
  imageThumbUrl: string | null
  imageMediumUrl: string | null
  imageOriginalUrl: string | null
  vendor: { shopName: string }
}

// Carte produit du grid catalogue (4/3/2 colonnes, cf. DESIGN.md) : média 4:3,
// chips condition/source en absolu top-left (first-class), prix Gloock.
// Partagée entre /catalogue, /browse et la cascade /browse/[brand]/[model]/[year].
export function ProductGridCard({ item }: { item: ProductGridItem }) {
  const imageUrl = bestPartImage(item)
  return (
    <Link
      href={`/produit/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-[rgba(0,35,102,0.06)] to-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.name ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-muted-2"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="h-9 w-9 opacity-50"
            >
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.4" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
            </svg>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {item.condition && <ConditionChip condition={item.condition as Condition} />}
          {item.partSource && <PartSourceChip source={item.partSource as PartSource} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
          {item.category ?? '—'}
        </span>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {item.name ?? 'Pièce'}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{item.vendor.shopName}</p>

        <div className="mt-auto flex items-end justify-between pt-3">
          {item.price != null ? (
            <div>
              <Price amount={item.price} className="text-[17px]" />
              <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-2">
                Prix détaillé →
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-2">Sur demande</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ProductGridCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-surface" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
        <div className="mt-2 h-4 w-2/5 animate-pulse rounded bg-surface" />
      </div>
    </div>
  )
}
