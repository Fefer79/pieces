/**
 * Opérateurs mobile money encaissés en Côte d'Ivoire.
 *
 * Miroir de `MOBILE_MONEY_OPERATORS` côté API. Couleurs de marque : voir la
 * table « Mobile money (brand-accurate) » de DESIGN.md — ce sont des tokens
 * Tailwind (`bg-om`, `bg-mtn`, `bg-moov`, `bg-wave`), pas des valeurs en dur.
 */

export type MobileMoneyOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

export interface MobileMoneyConfig {
  id: MobileMoneyOperator
  label: string
  /** Texte du pastillon 44×44. */
  short: string
  subtitle: string
  bg: string
  fg: string
  /** Préfixes de numéro de l'opérateur, pour orienter la saisie. */
  prefixes: string[]
}

export const MOBILE_MONEY: Record<MobileMoneyOperator, MobileMoneyConfig> = {
  ORANGE_MONEY: {
    id: 'ORANGE_MONEY',
    label: 'Orange Money',
    short: 'OM',
    subtitle: 'Numéros 07',
    bg: 'bg-om',
    fg: 'text-white',
    prefixes: ['07'],
  },
  MTN_MOMO: {
    id: 'MTN_MOMO',
    label: 'MTN MoMo',
    short: 'MTN',
    subtitle: 'Numéros 05',
    bg: 'bg-mtn',
    fg: 'text-ink',
    prefixes: ['05'],
  },
  MOOV_MONEY: {
    id: 'MOOV_MONEY',
    label: 'Moov Money',
    short: 'MOOV',
    subtitle: 'Numéros 01',
    bg: 'bg-moov',
    fg: 'text-white',
    prefixes: ['01'],
  },
  WAVE: {
    id: 'WAVE',
    label: 'Wave',
    short: 'W',
    subtitle: 'Tous numéros',
    bg: 'bg-wave',
    fg: 'text-white',
    prefixes: ['01', '05', '07'],
  },
}

export const MOBILE_MONEY_LIST: MobileMoneyConfig[] = [
  MOBILE_MONEY.ORANGE_MONEY,
  MOBILE_MONEY.MTN_MOMO,
  MOBILE_MONEY.MOOV_MONEY,
  MOBILE_MONEY.WAVE,
]

/** Format attendu par l'API : +225 suivi de 10 chiffres commençant par 01/05/07. */
export const IVORIAN_PHONE_RE = /^\+225(01|05|07)\d{8}$/

/**
 * Ramène une saisie libre au format API. Les gens tapent « 07 07 07 07 07 »,
 * « 0707070707 » ou « 225 07… » — tout doit aboutir au même numéro.
 */
export function normalizeIvorianPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  const local = digits.startsWith('225') ? digits.slice(3) : digits
  return local ? `+225${local}` : ''
}
