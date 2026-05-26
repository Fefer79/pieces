'use client'

export type CategoryTile = {
  id: string
  title: string
  href: string
  image?: string
  emoji?: string
  gradient?: string
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#00113A 0%,#002366 100%)'

export function CategoryCarousel({
  tiles,
  heading = 'Parcourir par catégorie',
}: {
  tiles: CategoryTile[]
  heading?: string
}) {
  return (
    <section aria-label={heading}>
      <div className="mb-3 flex items-baseline justify-between px-1 md:mb-4">
        <h2 className="font-display text-lg tracking-[-0.01em] text-ink md:text-2xl">
          {heading}
        </h2>
        <a
          href="/catalogue"
          className="text-xs font-medium text-accent hover:text-accent-hover md:text-sm"
        >
          Tout voir →
        </a>
      </div>

      <div
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {tiles.map((tile) => (
          <a
            key={tile.id}
            href={tile.href}
            role="listitem"
            className="group relative flex w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-150 hover:shadow-md md:w-[180px]"
          >
            <div
              className="relative aspect-[4/3] w-full overflow-hidden"
              style={
                tile.image
                  ? undefined
                  : { backgroundImage: tile.gradient ?? DEFAULT_GRADIENT }
              }
            >
              {tile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[44px] md:text-[56px]"
                  aria-hidden
                >
                  {tile.emoji ?? '🔧'}
                </div>
              )}
            </div>
            <div className="px-2.5 py-2 md:px-3 md:py-2.5">
              <div className="line-clamp-2 font-display text-[13px] leading-tight tracking-[-0.005em] text-ink md:text-[15px]">
                {tile.title}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
