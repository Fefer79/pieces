/**
 * Taux de change vers le FCFA (XOF) — utilisés pour ramener au même étalon les
 * prix d'offres relevés sur des sites étrangers, et pour alimenter le
 * `tauxChange` d'un bon de commande.
 *
 * ⚠ Un seul taux est une constante au sens propre : l'EUR, arrimé au XOF par
 * parité fixe (1 € = 655,957 F). Tous les autres sont des ORDRES DE GRANDEUR
 * qui dérivent avec le marché. Ils sont surchargeables par variable
 * d'environnement (`CURRENCY_RATE_USD=…`) précisément pour que l'ops puisse les
 * corriger sans redéploiement, et le `tauxChange` du BC reste modifiable à la
 * main : c'est lui qui fait foi une fois la commande passée.
 */

export const SUPPORTED_CURRENCIES = [
  'FCFA',
  'XOF',
  'EUR',
  'USD',
  'AED',
  'CNY',
  'TRY',
  'GBP',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/** Parité fixe XOF/EUR, définie par l'accord de coopération monétaire. */
export const EUR_XOF_PARITY = 655.957

/** 1 unité de devise = N FCFA. Révisés manuellement — cf. en-tête. */
export const CURRENCY_RATES_FCFA: Record<SupportedCurrency, number> = {
  FCFA: 1,
  XOF: 1,
  EUR: EUR_XOF_PARITY,
  USD: 600,
  AED: 163,
  CNY: 83,
  TRY: 17,
  GBP: 760,
}

export const CURRENCY_LABEL: Record<SupportedCurrency, string> = {
  FCFA: 'Franc CFA',
  XOF: 'Franc CFA',
  EUR: 'Euro',
  USD: 'Dollar américain',
  AED: 'Dirham des Émirats',
  CNY: 'Yuan chinois',
  TRY: 'Livre turque',
  GBP: 'Livre sterling',
}

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code.toUpperCase())
}

/**
 * Taux courant d'une devise. `overrides` sert à injecter les valeurs
 * d'environnement côté API sans faire dépendre `shared` de `process.env`.
 * Renvoie `null` pour une devise inconnue : mieux vaut pas de prix FCFA qu'un
 * prix faux.
 */
export function currencyRate(
  currency: string,
  overrides?: Partial<Record<string, number>>,
): number | null {
  const code = currency.trim().toUpperCase()
  const override = overrides?.[code]
  if (typeof override === 'number' && override > 0) return override
  if (!isSupportedCurrency(code)) return null
  return CURRENCY_RATES_FCFA[code as SupportedCurrency]
}

/**
 * Convertit un montant vers le FCFA, arrondi à l'unité. `null` si la devise est
 * inconnue ou le montant absent — l'appelant laisse alors `priceFcfa` vide
 * plutôt que d'inventer une valeur.
 */
export function toFcfa(
  amount: number | null | undefined,
  currency: string | null | undefined,
  overrides?: Partial<Record<string, number>>,
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount < 0) return null
  if (!currency) return null
  const rate = currencyRate(currency, overrides)
  if (rate == null) return null
  return Math.round(amount * rate)
}
