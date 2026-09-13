/**
 * Canonicalisation des libellés de motorisation Global Auto.
 *
 * La source livre une ligne par déclinaison commerciale, pas par moteur : le
 * même bloc y revient sous des orthographes et des équipements différents.
 * Pour la Peugeot 308, ces six lignes désignent un seul moteur :
 *
 *   1.2 THP Puretech 12V 130 c v
 *   1.2 e- THP 12V 130 cv
 *   1.2 e-THP 12V 130c v Boite auto
 *   1.2 THP Puretech 12V EAT6 130 c v Boite auto
 *   1.2 THP Puretech 12V GPF EAT8 130 cv Boite auto
 *   1.2 THP Puretech 12V GPF EAT8 S&S 130 c v Boite auto
 *
 * On ne garde donc que ce qui identifie le MOTEUR — cylindrée, famille
 * technique, transmission, puissance — et on écarte ce qui n'en relève pas :
 * boîte de vitesses, dépollution, nombre de soupapes, carrosserie, codes
 * d'usine. Le libellé affiché est reconstruit à partir de ces éléments, dans
 * l'orthographe la plus fréquente du corpus.
 */

/** Boîtes de vitesses : une déclinaison automatique n'est pas un autre moteur. */
const GEARBOX = new RegExp(
  '^(?:e-?)?(?:' +
  [
    'boite',
    'boîte',
    'auto',
    'eat\\d?',
    'dct\\d?',
    'dsg\\d?',
    'cvt',
    'xtronic',
    'multidrive',
    'selespeed',
    'tct',
    'asg',
    'q-?tronic',
    's-?tronic',
    '\\d?g-?[a-z]*shift', // 7G-SPEEDSHIFT, powershift…
    'tiptronic',
    'steptronic',
    '\\d?g-?tronic\\+?',
    'sequentronic',
    'easytronic',
    'mta',
    'amt',
    'multimode', // boîte robotisée Toyota (MMT)
    'mmt',
    'bva\\d?',
    'bvm\\d?',
    'bmp\\d?',
    'bmv\\d?',
    'bpm\\d?',
    'etg\\d?',
  ]
    .map((p) => `(?:${p})`)
    .join('|') +
  ')$',
  'i',
)

/** Dépollution, équipement, carrosserie : hors identité du moteur. */
const NOISE = new RegExp(
  '^(?:' +
  [
    'dpf',
    'gpf',
    'fap',
    'scr',
    'adblue',
    'bluee?ff?[a-z]*', // BlueEFFICIENCY et ses fautes de frappe
    'bluetec', // kit de dépollution, pas une famille de bloc (à la différence de BlueHDi)
    's\\s*&\\s*s',
    'start',
    'stop',
    'ecoflex',
    'bluemotion',
    'greenline',
    'phase',
    'v[eé]hicule',
    'commercial',
    'utilitaire',
    'pickup',
    'pick-up',
    'double',
    'simple',
    'cabine',
    'fourgon',
    'break',
    'berline',
    'coup[eé]',
    'cabriolet',
    'sw',
    'monospace',
    'xtra',
    'cab',
    'crew',
    'king',
    '\\d{1,2}\\s*v', // 16V, 12 V, 8v
    '\\d{2,3}\\s*kw',
    'kw',
    'ch',
    'cv',
    'euro\\d?',
    'l[123]', // longueur de caisse d'un utilitaire
    'h[123]', // hauteur de caisse
    'cc', // cylindrée en cm³ : « 658 cc »
  ]
    .map((p) => `(?:${p})`)
    .join('|') +
  ')$',
  'i',
)

/** Transmission : identifiante (un 4WD n'a pas les mêmes pièces qu'un 2WD). */
const DRIVE_ALIASES: Record<string, string> = {
  '2wd': '2WD',
  fwd: '2WD',
  rwd: 'RWD',
  '4wd': '4WD',
  awd: '4WD',
  '4x4': '4WD',
  '4x2': '2WD',
  '4matic': '4MATIC',
  '4motion': '4MOTION',
  quattro: 'quattro',
  xdrive: 'xDrive',
  q4: 'Q4',
}

/** Cumul de puissance d'un hybride : « 230 Hybrid », « 320 EQ Power ». */
const SYSTEM_POWER_NEXT = /^(hybrid|hybride|eq|plug)/i

export interface EngineParts {
  /** Désignation de tête (Mercedes « 220 CDi », BMW « 320 d »), sinon null. */
  num: number | null
  /** Cylindrée en litres. */
  displacement: number | null
  /**
   * Jetons techniques placés AVANT la cylindrée : le suffixe de désignation
   * (« 220 CDi 2.1 », « 300 h 2.1 », « 63 S AMG 4.0 »).
   */
  prefix: string[]
  /** Jetons techniques placés après la cylindrée : THP, Puretech, D-4D, V6… */
  tech: string[]
  drive: string | null
  /** Puissance en chevaux. */
  powerCv: number | null
}

/** Puissance : « 130 cv », « 130c v », « 130 c v », « 115CV », « / 170 CH ) ». */
function readPower(label: string): number | null {
  // « 1.6 i 1 02 c v » : la source coupe parfois le nombre en deux. On teste ce
  // cas d'abord, sinon la lecture directe ne retient que « 02 ». La graphie
  // espacée « c v » est exigée, sinon la règle mord sur « 1.0 61 cv ».
  const split = label.match(/(?<![.,\d])\b(\d)\s+(\d{2})\s*c\s+v\b/i)
  if (split) return Number(`${split[1]}${split[2]}`)
  const direct = label.match(/(\d{2,4})\s*[-\s]?\s*(?:c\s*v|ch|hp)\b/i)
  if (direct?.[1]) return Number(direct[1])
  return null
}

export function parseEngineParts(label: string): EngineParts {
  const stripped = label
    // Les codes d'usine entre parenthèses — « (GUN125_) » — ne servent pas ici.
    .replace(/\([^)]*\)/g, ' ')
    // La puissance est déjà lue : on l'ôte sous toutes ses graphies, sinon ses
    // morceaux (« 130c », « v ») ressortent comme des jetons techniques.
    .replace(/(?<![.,\d])\b\d\s+\d{2}\s*c\s+v\b/gi, ' ')
    .replace(/\d{2,4}\s*[-\s]?\s*(?:c\s*v|cv|ch|hp)\b/gi, ' ')
    .replace(/\d{2,4}\s*kw/gi, ' ')
    .replace(/\bc\s+v\b/gi, ' ')
    // « e- THP » et « e-THP » désignent le même bloc.
    .replace(/-\s+/g, '-')
    // « 0.8i » : la cylindrée collée à la lettre du bloc.
    .replace(/(\d[.,]\d)(?=[a-z])/gi, '$1 ')
    // « Blue HDi » et « BlueHDi » désignent le même bloc.
    .replace(/\bblue\s+(hdi|dci)\b/gi, (_m, fam: string) => `Blue${fam[0]?.toUpperCase()}${fam.slice(1)}`)
    // « 4×4 » s'écrit aussi « 4x4 ».
    .replace(/×/g, 'x')
    // Bruit en plusieurs jetons, hors de portée d'un filtre jeton par jeton.
    .replace(/\bs\s*&\s*s\b/gi, ' ')
    .replace(/\bstop\s*&?\s*start\b/gi, ' ')
    .replace(/\bblue\s*lion\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // La désignation est lue sur le libellé DÉBARRASSÉ de la puissance : sinon
  // « 83 cv » se lit comme une désignation 83 et ressort en « 83 83 cv ».
  // 1 à 3 chiffres : « 08 i 52cv » existe, et la désignation doit se relire à
  // l'identique après canonicalisation (« 8 i 52 cv »).
  const num = stripped.match(/^\s*(\d{1,3})(?=\s|$)/)
  const disp = stripped.match(/(\d)[.,](\d)/)
  const powerCv = readPower(label)

  const prefix: string[] = []
  const tech: string[] = []
  let drive: string | null = null
  let seenDisplacement = false
  const tokens = stripped.split(/[\s]+/)
  tokens.forEach((raw, i) => {
    const token = raw.replace(/^[-,.]+|[-,.]+$/g, '')
    if (!token) return
    const low = token.toLowerCase()
    if (num && i === 0) return
    if (DRIVE_ALIASES[low]) {
      drive = DRIVE_ALIASES[low]
      return
    }
    if (/^\d[.,]\d$/.test(token)) {
      seenDisplacement = true
      return // cylindrée, déjà lue
    }
    const bucket = seenDisplacement ? tech : prefix
    if (/^\d+$/.test(token)) {
      // Un nombre nu ne compte que comme puissance cumulée d'un hybride.
      const next = tokens[i + 1]
      if (next && SYSTEM_POWER_NEXT.test(next)) bucket.push(token)
      return
    }
    if (GEARBOX.test(token) || NOISE.test(token)) return
    if (/^\d{2,4}(c\s*v|cv|ch)$/i.test(token)) return
    // « 16 V » se coupe en deux jetons : le « V » orphelin compte le nombre de
    // soupapes, à la différence d'un « V6 » ou d'un « V8 ».
    if (/^v$/i.test(token)) return
    // Restes de ponctuation : « 1.6 THP * 156 cv ».
    if (!/[a-z0-9]/i.test(token)) return
    bucket.push(token)
  })

  // « 180 CDi 1.6 CDi 16V » répète le bloc : une seule occurrence suffit, et
  // c'est celle du suffixe de désignation qui prime.
  const seen = new Set(prefix.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const deduped: string[] = []
  for (const t of tech) {
    const key = t.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(t)
  }

  return {
    num: num ? Number(num[1]) : null,
    displacement: disp ? Number(`${disp[1]}.${disp[2]}`) : null,
    prefix,
    tech: deduped,
    drive,
    powerCv,
  }
}

/**
 * Orthographe de référence d'un jeton technique : la plus fréquente du corpus,
 * pour que « T-jet » et « T-Jet » — ou « CDi » et « CDI » — convergent.
 */
/**
 * Clé d'un jeton : casse ET ponctuation ignorées, pour que « VVT-i », « VVTi »
 * et « VVT-I » — ou « D-4D » et « D4-D » — convergent vers une seule graphie.
 */
export function spellingKey(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function buildSpellingMap(labels: string[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()
  for (const label of labels) {
    const parts = parseEngineParts(label)
    for (const token of [...parts.prefix, ...parts.tech]) {
      const key = spellingKey(token)
      const variants = counts.get(key) ?? new Map<string, number>()
      variants.set(token, (variants.get(token) ?? 0) + 1)
      counts.set(key, variants)
    }
  }
  const out = new Map<string, string>()
  for (const [key, variants] of counts) {
    let best = key
    let bestCount = -1
    for (const [spelling, n] of variants) {
      // À fréquence égale, la graphie la plus capitalisée tranche : « D-4D »
      // plutôt que « d-4d », puis la plus courte (déterminisme).
      const caps = (v: string) => v.replace(/[^A-Z]/g, '').length
      const better =
        n === bestCount &&
        (caps(spelling) > caps(best) || (caps(spelling) === caps(best) && spelling.length < best.length))
      if (n > bestCount || better) {
        best = spelling
        bestCount = n
      }
    }
    out.set(key, best)
  }
  return out
}

/**
 * Libellé affiché, reconstruit : « 1.2 THP Puretech 130 cv »,
 * « 2.4 D-4D 4WD 150 cv », « 220 CDi 2.1 170 cv ».
 *
 * Renvoie null quand il n'y a ni cylindrée ni puissance à afficher : le libellé
 * d'origine est alors conservé tel quel plutôt que réduit à néant.
 */
export function canonicalEngineLabel(parts: EngineParts, spelling?: Map<string, string>): string | null {
  if (parts.displacement === null && parts.powerCv === null) return null
  const spell = (t: string) => spelling?.get(spellingKey(t)) ?? t
  const bits = [
    parts.num === null ? null : String(parts.num),
    ...parts.prefix.map(spell),
    parts.displacement === null ? null : parts.displacement.toFixed(1),
    ...parts.tech.map(spell),
    parts.drive,
    parts.powerCv === null ? null : `${parts.powerCv} cv`,
  ].filter((b): b is string => Boolean(b))
  return bits.join(' ')
}
