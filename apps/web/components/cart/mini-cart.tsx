'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart'

export function MiniCartButton({ className = '' }: { className?: string }) {
  const { count } = useCart()

  return (
    <Link
      href="/panier"
      aria-label={`Sélection${count > 0 ? ` (${count})` : ''}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface ${className}`}
    >
      <CartIcon />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[11px] tabular leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function CartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}
