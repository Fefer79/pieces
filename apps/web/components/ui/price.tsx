export function formatFCFA(amount: number): string {
  return amount.toLocaleString('fr-FR')
}

export function Price({
  amount,
  currency = true,
  className = '',
}: {
  amount: number
  currency?: boolean
  className?: string
}) {
  return (
    <span className={`font-mono tabular ${className}`}>
      {formatFCFA(amount)}
      {currency && <span className="ml-1">FCFA</span>}
    </span>
  )
}
