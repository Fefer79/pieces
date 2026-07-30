'use client'

import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

// Champs de formulaire du back-office.
//
// Règle DESIGN.md non négociable : **toujours un label explicite**, jamais un
// placeholder seul. `Field` rend donc le label obligatoire et lie l'id
// automatiquement, pour qu'on ne puisse pas l'oublier.
//
// Focus visible unifié : anneau navy à 8 % + bordure ink-2.

const inputBase =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-[14px] text-ink ' +
  'transition-colors placeholder:text-muted-2 ' +
  'focus:border-ink-2 focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] ' +
  'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted'

const errorRing = 'border-error-fg focus:border-error-fg focus:shadow-[0_0_0_3px_rgba(180,35,24,0.10)]'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted"
      >
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] text-error-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextInput({
  label,
  hint,
  error,
  required,
  className,
  ...rest
}: {
  label: string
  hint?: string
  error?: string | null
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${inputBase} ${error ? errorRing : ''}`}
        {...rest}
      />
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  rows = 4,
  ...rest
}: {
  label: string
  hint?: string
  error?: string | null
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${inputBase} resize-y ${error ? errorRing : ''}`}
        {...rest}
      />
    </Field>
  )
}

export function Select({
  label,
  hint,
  error,
  required,
  className,
  children,
  ...rest
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${inputBase} ${error ? errorRing : ''}`}
        {...rest}
      >
        {children}
      </select>
    </Field>
  )
}

/**
 * Montant en FCFA.
 *
 * Entier strict : la monnaie n'a pas de subdivision en usage, et tous les
 * montants sont stockés en `Int` côté base. On refuse donc la virgule au lieu
 * de l'arrondir en silence. Affichage mono tabular pour aligner les colonnes.
 */
export function MoneyInput({
  label,
  hint,
  error,
  required,
  className,
  value,
  onValueChange,
  ...rest
}: {
  label: string
  hint?: string
  error?: string | null
  value: number | null
  onValueChange: (value: number | null) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          required={required}
          aria-invalid={error ? true : undefined}
          value={value === null ? '' : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onValueChange(digits === '' ? null : Number.parseInt(digits, 10))
          }}
          className={`${inputBase} pr-12 font-mono tabular ${error ? errorRing : ''}`}
          {...rest}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-muted">
          FCFA
        </span>
      </div>
    </Field>
  )
}

export function DateInput({
  label,
  hint,
  error,
  required,
  className,
  ...rest
}: {
  label: string
  hint?: string
  error?: string | null
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <input
        id={id}
        type="date"
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${inputBase} font-mono tabular ${error ? errorRing : ''}`}
        {...rest}
      />
    </Field>
  )
}
