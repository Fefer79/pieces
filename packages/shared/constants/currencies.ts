// Conversion des prix fournisseurs en FCFA.
//
// Les offres remontées par l'agent de sourcing sont affichées dans la devise du
// site source (USD sur eBay, AED à Dubaï, CNY sur Alibaba…). L'arbitrage
// (computeArbitrageMatrix) travaille lui exclusivement en FCFA : c'est ici que
// se fait la bascule.
//
// ⚠ Les taux hors EUR sont des CONSTANTES, pas un flux de marché. Ils dérivent
// silencieusement si personne ne les met à jour — d'où `RATES_UPDATED_AT`, qui
// permet à l'UI de signaler l'âge du taux. Le `tauxChange` d'un PurchaseOrder
// reste surchargeable par l'ops : c'est lui qui fait foi sur un achat réel.

/** Devises acceptées en entrée d'une offre de sourcing. */
export type SupportedCurrency = 'FCFA' | 'XOF' | 'EUR' | 'USD' | 'AED' | 'CNY' | 'TRY' | 'GBP'

/**
 * 1 unité de devise = N FCFA.
 *
 * EUR est une PARITÉ FIXE (arrimage XOF/EUR, 1 EUR = 655,957 F) : elle ne bouge
 * pas et ne doit jamais être « mise à jour ». Les autres sont des ordres de
 * grandeur à réviser périodiquement.
 */
export const CURRENCY_RATES_FCFA: Record<SupportedCurrency, number> = {
  FCFA: 1,
  XOF: 1,
  EUR: 655.957, // parité fixe — ne pas modifier
  USD: 605,
  AED: 165,
  CNY: 84,
  TRY: 15,
  GBP: 765,
}

/** Date de dernière révision des taux flottants (ISO court). */
export const RATES_UPDATED_AT = '2026-08-03'

/** La seule devise dont le taux n'a pas besoin d'être révisé. */
export const FIXED_PARITY_CURRENCIES: SupportedCurrency[] = ['FCFA', 'XOF', 'EUR']

const ALIASES: Record<string, SupportedCurrency> = {
  '€': 'EUR',
  $: 'USD',
  US$: 'USD',
  USD$: 'USD',
  '£': 'GBP',
  '¥': 'CNY',
  RMB: 'CNY',
  DH: 'AED',
  DHS: 'AED',
  XOF: 'XOF',
  CFA: 'FCFA',
  'F CFA': 'FCFA',
  FCFA: 'FCFA',
  '₺': 'TRY',
  TL: 'TRY',
}

/** Normalise un code ou symbole libre en devise supportée. `null` si inconnue. */
export function normalizeCurrency(raw: string | null | undefined): SupportedCurrency | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const upper = trimmed.toUpperCase()
  if (upper in CURRENCY_RATES_FCFA) return upper as SupportedCurrency
  return ALIASES[upper] ?? ALIASES[trimmed] ?? null
}

/**
 * Convertit un montant en FCFA, arrondi à la centaine (aucun prix ne s'affiche
 * à l'unité près chez nous). `null` si la devise est inconnue ou le montant
 * absent : un prix manquant reste manquant, il n'est jamais remplacé par 0.
 */
export function toFcfa(
  amount: number | null | undefined,
  currency: string | null | undefined,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null
  const code = normalizeCurrency(currency)
  if (!code) return null
  return Math.round((amount * CURRENCY_RATES_FCFA[code]) / 100) * 100
}

/** Libellé court pour l'UI : « 120 USD ». */
export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amount == null) return null
  const code = normalizeCurrency(currency)
  const shown = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100
  return `${shown.toLocaleString('fr-FR')} ${code ?? currency ?? ''}`.trim()
}
