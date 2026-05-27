interface Props {
  acceptedAt: string | null | undefined
  size?: 'sm' | 'xs'
}

export function CommissionBadge({ acceptedAt, size = 'xs' }: Props) {
  const accepted = acceptedAt != null
  const cls = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10.5px]'
  return accepted ? (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${cls} font-medium bg-[rgba(20,140,80,0.12)] text-[#148C50]`}
    >
      ✓ Agréée
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${cls} font-medium bg-[rgba(255,107,0,0.12)] text-accent`}
    >
      ⏳ À agréer
    </span>
  )
}
