import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink-2 text-white hover:bg-ink',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-card text-ink border border-border-strong hover:bg-surface hover:border-ink',
  ghost: 'bg-transparent text-ink hover:bg-border',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4.5 py-2.5 text-sm',
  lg: 'px-5.5 py-3.5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  children,
  className = '',
  ...rest
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
