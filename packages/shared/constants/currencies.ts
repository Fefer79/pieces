/**
 * Conversion des devises d'achat vers le FCFA (XOF).
 *
 * L'euro est le seul taux CERTAIN : le franc CFA est arrimé à l'euro par une
 * parité fixe (1 € = 655,957 F), inchangée depuis 1999. Tous les autres taux
 * sont des ordres de grandeur de cadrage, à réviser périodiquement — d'où
 * `PurchaseOrder.tauxChange`, surchargeable par l'ops au moment de la commande.
 *
 * ⚠ `PurchaseOrder.tauxChange` est un entier. Sur les devises à faible valeur
 * unitaire (TRY ≈ 16,4 F), l'arrondi introduit jusqu'à ~3 % d'écart sur le
 * montant estimé du bon de commande. C'est `SourcingOffer.priceFcfa`, calculé
 * ici en flottant, qui reste la référence pour l'arbitrage.
 */

export const CURRENCY_CODES = ['XOF', 'EUR', 'USD', 'AED', 'CNY', 'TRY', 'GBP', 'MAD'] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]

/** 1 unité de devise = N FCFA. */
export const CURRENCY_RATES_FCFA: Record<CurrencyCode, number> = {
  XOF: 1,
  EUR: 655.957, // parité fixe XOF/EUR — la seule valeur non révisable
  USD: 600,
  AED: 163,
  CNY: 84,
  TRY: 16.4,
  GBP: 780,
  MAD: 60,
}

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  XOF: 'FCFA',
  EUR: 'Euro',
  USD: 'Dollar US',
  AED: 'Dirham EAU',
  CNY: 'Yuan',
  TRY: 'Livre turque',
  GBP: 'Livre sterling',
  MAD: 'Dirham marocain',
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(code)
}

/**
 * Convertit un montant en FCFA. Renvoie `null` sur un montant absent ou une
 * devise inconnue : mieux vaut une case vide dans la matrice qu'un total faux.
 */
export function toFcfa(
  amount: number | null | undefined,
  currency: string | null | undefined,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null
  if (!currency || !isCurrencyCode(currency)) return null
  return Math.round(amount * CURRENCY_RATES_FCFA[currency])
}
