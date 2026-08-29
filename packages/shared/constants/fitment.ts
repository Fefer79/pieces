/**
 * Parsing du texte de compatibilité véhicule legacy (`CatalogItem.vehicleCompatibility`)
 * vers des fitments structurés (`CatalogItemFitment`).
 *
 * Format typique rencontré : "Toyota Corolla 2010-2020", "Peugeot 308 2014-2021",
 * "Mercedes Sprinter 2014-2020", éventuellement une année simple ou un "présent".
 *
 * Réutilisé par : le backfill (apps/ingest), le seed (packages/shared/prisma) et
 * potentiellement l'API. Volontairement tolérant — retourne null si rien d'exploitable.
 */
import { BRAND_NAMES, VEHICLE_BRANDS } from './vehicles'

export interface ParsedFitment {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
}

const YEAR_RANGE = /\b(\d{4})\s*[-–—]\s*(\d{4})\b/
const YEAR_OPEN = /\b(\d{4})\s*[-–—]\s*(?:présent|present|aujourd'?hui|\.\.\.|auj\.?)\b/i
const YEAR_SINGLE = /\b(\d{4})\b/

// Marques connues, triées par longueur décroissante pour matcher « Land Rover »
// avant « Land », « Mercedes-Benz » avant « Mercedes », etc.
const SORTED_BRANDS = [...BRAND_NAMES].sort((a, b) => b.length - a.length)

function toYear(value: string | undefined): number | null {
  if (!value) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

function extractYears(text: string): { yearFrom: number | null; yearTo: number | null; rest: string } {
  const range = text.match(YEAR_RANGE)
  if (range) {
    return {
      yearFrom: toYear(range[1]),
      yearTo: toYear(range[2]),
      rest: text.slice(0, range.index).trim(),
    }
  }
  const open = text.match(YEAR_OPEN)
  if (open) {
    return { yearFrom: toYear(open[1]), yearTo: null, rest: text.slice(0, open.index).trim() }
  }
  const single = text.match(YEAR_SINGLE)
  if (single) {
    return { yearFrom: toYear(single[1]), yearTo: null, rest: text.slice(0, single.index).trim() }
  }
  return { yearFrom: null, yearTo: null, rest: text.trim() }
}

/**
 * Parse une chaîne de compatibilité en un fitment structuré.
 * Retourne null si la chaîne est vide ou ne contient aucune marque/modèle exploitable.
 */
export function parseCompatibilityText(text: string | null | undefined): ParsedFitment | null {
  if (!text) return null
  const cleaned = text.trim()
  if (!cleaned) return null

  const { yearFrom, yearTo, rest } = extractYears(cleaned)
  const head = rest.replace(/[,;].*$/, '').trim() // garde le premier véhicule si liste
  if (!head) return null

  const lower = head.toLowerCase()
  // Match d'une marque connue en tête de chaîne. La liste ne sert qu'à détecter
  // la frontière marque/modèle ; on conserve la marque telle qu'écrite dans le
  // texte (et non la clé de la liste, en MAJUSCULES) pour ne pas réécrire la casse.
  for (const brand of SORTED_BRANDS) {
    const b = brand.toLowerCase()
    if (lower === b || lower.startsWith(`${b} `)) {
      const matchedBrand = head.slice(0, brand.length)
      const model = head.slice(brand.length).trim()
      return { brand: matchedBrand, model: model || null, yearFrom, yearTo }
    }
  }

  // Fallback : premier mot = marque, reste = modèle.
  const parts = head.split(/\s+/)
  if (parts.length === 0 || !parts[0]) return null
  const brand = parts[0]
  const model = parts.slice(1).join(' ').trim()
  return { brand, model: model || null, yearFrom, yearTo }
}

/* -------------------------------------------------------------------------- */
/* Extraction de fitments depuis un TITRE de pièce (marque noyée dans le nom)  */
/* -------------------------------------------------------------------------- */

/**
 * Certaines sources (CoinAfrique, Jumia) n'ont pas de champ de compatibilité : le
 * véhicule est noyé dans le titre, ex. « Phare BMW », « Filtre à huile Renault »,
 * « Moteur BMW E46 », « Filtre à huile Suzuki Baleno ». `parseCompatibilityText`
 * ne suffit pas car il suppose une chaîne qui COMMENCE par la marque. Ici on
 * scanne tout le titre à la recherche de marques connues (avec alias/typos
 * courants) puis, pour chaque marque, de ses modèles.
 *
 * ⚠️ Enjeu de compatibilité : un fitment sans modèle est INCLUSIF côté filtrage
 * (`browseParts` le fait matcher tous les modèles de la marque). Rater le modèle
 * dans « Filtre à huile Suzuki Baleno » fait donc remonter cette annonce pour une
 * Suzuki Ertiga. L'extraction du modèle est ici agressive à dessein :
 *   1. index des modèles du référentiel, comparés en clé « écrasée » (sans
 *      accents, espaces ni tirets) — « S presso » = « S-PRESSO », « Santafe » =
 *      « SANTA FE », « Dmax » = « D-Max », « CRV » = « CR-V » ;
 *   2. alias par marque : codes châssis BMW (E46 → Serie 3), désignations
 *      Mercedes (W203, C200, Cclass → Classe C), typos locales (« C Claz » →
 *      CIAZ, « e viatara » → VITARA) ;
 *   3. repli : le mot qui suit la marque, s'il n'est ni un mot de vocabulaire
 *      pièce, ni une autre marque, ni purement numérique, est conservé TEL QUEL
 *      comme modèle (« Toyota Obama » → OBAMA). On ne sait pas à quoi il
 *      correspond, mais on sait qu'il désigne un véhicule précis : mieux vaut un
 *      fitment trop étroit qu'un fitment marque qui pollue tous les modèles.
 *
 * Le titre est scanné en entier, donc plusieurs modèles d'une même marque
 * peuvent être retournés (« … compatible avec Corolla, Yaris, Camry et RAV4 »).
 * Toujours pas d'extraction d'année (les titres regorgent de nombres parasites —
 * « 12v-150ah », « 16 pouces », « R15 »).
 */
export interface NameFitment {
  brand: string
  model: string | null
  yearFrom: null
  yearTo: null
}

/** Alias / fautes de frappe fréquents → clé de marque canonique du catalogue. */
const BRAND_ALIASES: Record<string, string> = {
  MERCEDES: 'MERCEDES-BENZ',
  BENZ: 'MERCEDES-BENZ',
  'RANGE ROVER': 'LAND ROVER',
  VW: 'VOLKSWAGEN',
  HUYNDAI: 'HYUNDAI',
  HUNDAI: 'HYUNDAI',
  CHEVY: 'CHEVROLET',
}

/**
 * Alias de modèles par marque : `alias` → clé de modèle du référentiel.
 * Comparés en clé écrasée, donc « C Claz », « c-claz » et « CCLAZ » sont
 * équivalents ; inutile de lister les variantes de casse/ponctuation.
 */
const MODEL_ALIASES: Record<string, Record<string, string>> = {
  // Codes châssis : c'est ainsi que le marché abidjanais désigne les BMW.
  BMW: {
    E21: 'Serie 3', E30: 'Serie 3', E36: 'Serie 3', E46: 'Serie 3', E90: 'Serie 3',
    E91: 'Serie 3', E92: 'Serie 3', E93: 'Serie 3', F30: 'Serie 3', F31: 'Serie 3',
    F34: 'Serie 3', F35: 'Serie 3', G20: 'Serie 3', G21: 'Serie 3',
    E81: 'Serie 1', E82: 'Serie 1', E87: 'Serie 1', E88: 'Serie 1', F20: 'Serie 1', F21: 'Serie 1',
    F22: 'Serie 2', F23: 'Serie 2', F32: 'Serie 4', F33: 'Serie 4', F36: 'Serie 4',
    E12: 'Serie 5', E28: 'Serie 5', E34: 'Serie 5', E39: 'Serie 5', E60: 'Serie 5',
    E61: 'Serie 5', F07: 'Serie 5', F10: 'Serie 5', F11: 'Serie 5', F18: 'Serie 5', G30: 'Serie 5',
    E63: 'Serie 6', E64: 'Serie 6', F12: 'Serie 6', F13: 'Serie 6',
    E23: 'Série 7', E32: 'Série 7', E38: 'Série 7', E65: 'Série 7', E66: 'Série 7',
    F01: 'Série 7', F02: 'Série 7', G11: 'Série 7',
    E84: 'X1', F48: 'X1', E83: 'X3', F25: 'X3', G01: 'X3',
    E53: 'X5', E70: 'X5', F15: 'X5', G05: 'X5', E71: 'X6', F16: 'X6', E89: 'Z4 (E89)',
  },
  'MERCEDES-BENZ': {
    'C CLASS': 'Classe C', 'CLASS C': 'Classe C', W202: 'Classe C', W203: 'Classe C',
    W204: 'Classe C', W205: 'Classe C', W206: 'Classe C',
    'E CLASS': 'Classe E', 'CLASS E': 'Classe E', W210: 'Classe E', W211: 'Classe E',
    W212: 'Classe E', W213: 'Classe E',
    'S CLASS': 'Classe S', 'CLASS S': 'Classe S', W220: 'Classe S', W221: 'Classe S', W222: 'Classe S',
    'A CLASS': 'Classe A', 'CLASS A': 'Classe A', W168: 'Classe A', W169: 'Classe A', W176: 'Classe A',
    'B CLASS': 'Classe B', 'CLASS B': 'Classe B', W245: 'Classe B', W246: 'Classe B',
    ML: 'Classe ML', W163: 'Classe ML', W164: 'Classe ML', W166: 'Classe ML',
    GLE: 'Classe GLE', GLC: 'Classe GLC', GLA: 'Classe GLA', GLK: 'Classe GLK',
    CLA: 'Classe CLA', CLK: 'Classe CLK', CLS: 'Classe CLS', 'G CLASS': 'Classe G',
  },
  SUZUKI: {
    'C CLAZ': 'CIAZ', CLAZ: 'CIAZ', SIAZ: 'CIAZ',
    EXPRESSO: 'S-PRESSO', ESPRESSO: 'S-PRESSO',
    VIATARA: 'VITARA', 'E VIATARA': 'VITARA', 'GRAND VIATARA': 'GRAND VITARA',
    'WAGONR': 'WAGON R', CARRY: 'SUPER CARRY',
  },
  TOYOTA: {
    'LAND CRUISE': 'Land Cruiser', LANDCRUISER: 'Land Cruiser', PRADO: 'Land Cruiser Prado',
    'LAND CRUISER PRADO': 'Land Cruiser Prado', RAV: 'Rav4', 'RAV 4': 'Rav4',
  },
  HYUNDAI: { SANTAFE: 'SANTA FE', 'SANTA FÉ': 'SANTA FE' },
  ISUZU: { DMAX: 'D-Max' },
  NISSAN: { XTRAIL: 'X-Trail' },
  FORD: { TRANSIT: 'Transit/Tourneo', TOURNEO: 'Transit/Tourneo' },
}

/**
 * Motifs de modèles déduits d'une désignation commerciale (lettre + cylindrée),
 * appliqués quand ni le référentiel ni les alias ne matchent : « C200 » →
 * Classe C, « ML350 » → Classe ML.
 */
const MODEL_PATTERNS: Record<string, Array<{ re: RegExp; model: string }>> = {
  'MERCEDES-BENZ': [
    { re: /^ML\d{2,3}$/, model: 'Classe ML' },
    { re: /^GLE\d{2,3}$/, model: 'Classe GLE' },
    { re: /^GLC\d{2,3}$/, model: 'Classe GLC' },
    { re: /^GLA\d{2,3}$/, model: 'Classe GLA' },
    { re: /^CLA\d{2,3}$/, model: 'Classe CLA' },
    { re: /^CLK\d{2,3}$/, model: 'Classe CLK' },
    { re: /^CLS\d{2,3}$/, model: 'Classe CLS' },
    { re: /^A\d{3}$/, model: 'Classe A' },
    { re: /^B\d{3}$/, model: 'Classe B' },
    { re: /^C\d{3}$/, model: 'Classe C' },
    { re: /^E\d{3}$/, model: 'Classe E' },
    { re: /^S\d{3}$/, model: 'Classe S' },
  ],
}

/**
 * Vocabulaire « pièce » : mots qui suivent parfois la marque sans désigner un
 * modèle. Sert uniquement au repli (étape 3) — un mot d'ici n'est jamais capturé
 * comme modèle inconnu.
 */
const PART_STOPWORDS = new Set(
  (
    'PIECE PIECES DETACHE DETACHEE DETACHEES DETACHES ACCESSOIRE ACCESSOIRES VOITURE VOITURES AUTO ' +
    'MOTEUR MOTEURS FILTRE FILTRES HUILE AIR POLLEN CABIN CABINE HABITACLE GASOIL GAZOLE ESSENCE ' +
    'CARBURANT PLAQUETTE PLAQUETTES DISQUE DISQUES FREIN FREINS JANTE JANTES PHARE PHARES FEU FEUX ' +
    'AMORTISSEUR AMORTISSEURS EMBRAYAGE BOUGIE BOUGIES POMPE POMPES COURROIE JOINT JOINTS CULASSE ' +
    'VOLANT TAPIS COFFRE PORTIERE PORTIERES PORTE SERRURE SERRURES CAPOT PARE CHOC CHOCS CALANDRE ' +
    'RETROVISEUR VITRE VITRES ECRAN AUTORADIO BATTERIE PNEU PNEUS RADIATEUR TURBO DISTRIBUTION ' +
    'AVANT ARRIERE GAUCHE DROIT DROITE HAUT BAS COURT COURTE LONG LONGUE MINCE QUEUE TETE ' +
    'ORIGINE ORIGINAL NEUF NEUVE OCCASION IMPORTE IMPORTEE IMPORTES IMPORTEES COMPLET COMPLETE ' +
    'KIT JEU LOT SET PAIRE ENSEMBLE MODELE MODELES TYPE SERIE REF REFERENCE OEM NUMERO ' +
    'POUCE POUCES CYLINDRE CYLINDRES CV LITRE LITRES SPORT LUXE ALU ALUMINIUM NOIR BLANC GRIS ' +
    'POUR AVEC SANS TOUS TOUTE TOUTES ETC COMPATIBLE COMPATIBLES RECHERCHE VENDS ' +
    'BOITE VITESSE VITESSES LEVIER POMMEAU CONSOLE BOUTON BOUTONS ACCOUDOIR BAQUET BAQUETS ' +
    'AILE AILES CAISSE CASSE PROTECTION SUPPORT TIRANT BIELLETTE CREMAILLERE DEBITMETRE ' +
    'ECHAPPEMENT TUYAU CABLE FIL LOGO GAGE GAGES DEVIS METRE AUTOMATE PALIER COUSSINET ' +
    'TENDEUR BALAI GLACE ESSUI SPI VILBREQUIN BOITIER TACTILE POIGNEE INTERIEURE COULISSANTE ' +
    'POSTE RADIO AUTORADIO ANDROID DEVANTURE VENTILATEUR KOMPRESSOR COMPRESSOR KAMATIC ' +
    'ESSENCE DIESEL HYBRIDE TURBODIESEL MANUELLE AUTOMATIQUE CLIMATISATION ' +
    'VERROUILLAGE PROTECTIONS BANDES BANDE AUTOCOLLANT COLLISION ANTI BORD CLE DIRECTION ' +
    'ROTULE INTEGREE SUSPENSION TRIANGLE MACHOIRE MACHOIRES GARNITURE SILENCIEUX'
  ).split(' '),
)

/** Retire les accents et met en MAJUSCULES (« Hyundaï » → « HYUNDAI »). */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

/** Clé de comparaison « écrasée » : sans accents, ni espaces, ni ponctuation. */
function squash(text: string): string {
  return foldText(text).replace(/[^A-Z0-9]/g, '')
}

/** Découpe en jetons alphanumériques (la ponctuation devient une frontière). */
function tokenize(text: string): string[] {
  return foldText(text)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
}

// Candidats de marque : marques du catalogue + alias, en clé écrasée. On écarte
// « DS » (2 lettres, trop ambigu dans un titre libre).
const BRAND_CANDIDATES: Array<{ key: string; tokens: number; canonical: string }> = [
  ...BRAND_NAMES.filter((b) => b.length >= 3).map((b) => ({ needle: b, canonical: b })),
  ...Object.entries(BRAND_ALIASES).map(([alias, canonical]) => ({ needle: alias, canonical })),
].map(({ needle, canonical }) => ({
  key: squash(needle),
  tokens: tokenize(needle).length,
  canonical,
}))

const BRAND_KEYS = new Set(BRAND_CANDIDATES.map((c) => c.key))

/** Index modèle (clé écrasée → clé canonique du référentiel) par marque, mémoïsé. */
const MODEL_INDEX_CACHE = new Map<string, Map<string, string>>()

function modelIndex(canonicalBrand: string): Map<string, string> {
  const cached = MODEL_INDEX_CACHE.get(canonicalBrand)
  if (cached) return cached

  const index = new Map<string, string>()
  const models = Object.keys(VEHICLE_BRANDS[canonicalBrand]?.models ?? {})
  for (const key of models) index.set(squash(key), key)
  for (const [alias, target] of Object.entries(MODEL_ALIASES[canonicalBrand] ?? {})) {
    // La cible doit exister au référentiel ; sinon l'alias est ignoré (garde-fou
    // contre une faute de frappe dans la table ci-dessus).
    const canonical = index.get(squash(target))
    if (canonical) index.set(squash(alias), canonical)
  }
  MODEL_INDEX_CACHE.set(canonicalBrand, index)
  return index
}

/** Nombre maximum de jetons consécutifs testés pour un nom de modèle. */
const MAX_MODEL_TOKENS = 3

/** Résout un jeton isolé via les motifs commerciaux (« C200 » → Classe C). */
function modelFromPattern(canonicalBrand: string, token: string): string | null {
  for (const { re, model } of MODEL_PATTERNS[canonicalBrand] ?? []) {
    if (re.test(token)) return modelIndex(canonicalBrand).get(squash(model)) ?? model
  }
  return null
}

export function extractFitmentsFromName(name: string | null | undefined): NameFitment[] {
  if (!name) return []
  const tokens = tokenize(name)
  if (tokens.length === 0) return []

  // 1. Marques présentes dans le titre, avec la position de fin de chaque occurrence.
  const brandHits = new Map<string, number>() // marque canonique → index du jeton suivant
  for (let i = 0; i < tokens.length; i += 1) {
    for (let span = 2; span >= 1; span -= 1) {
      if (i + span > tokens.length) continue
      const key = tokens.slice(i, i + span).join('')
      const hit = BRAND_CANDIDATES.find((c) => c.key === key && c.tokens === span)
      if (!hit) continue
      if (!brandHits.has(hit.canonical)) brandHits.set(hit.canonical, i + span)
      break
    }
  }
  if (brandHits.size === 0) return []

  const out: NameFitment[] = []
  for (const [brand, afterIndex] of brandHits) {
    const index = modelIndex(brand)
    const models: string[] = []

    // 2. Modèles connus, cherchés dans TOUT le titre (« … Corolla, Yaris et RAV4 »).
    for (let i = 0; i < tokens.length; i += 1) {
      let matched = 0
      for (let span = MAX_MODEL_TOKENS; span >= 1; span -= 1) {
        if (i + span > tokens.length) continue
        const key = tokens.slice(i, i + span).join('')
        // Un jeton qui est lui-même une marque n'est jamais un modèle.
        if (span === 1 && BRAND_KEYS.has(key)) continue
        const model = index.get(key) ?? (span === 1 ? modelFromPattern(brand, key) : null)
        if (!model) continue
        if (!models.includes(model)) models.push(model)
        matched = span
        break
      }
      if (matched > 1) i += matched - 1
    }

    // 3. Repli : le mot qui suit la marque désigne un véhicule qu'on ne connaît
    //    pas encore (« Toyota Obama »). On le garde tel quel plutôt que d'émettre
    //    un fitment marque qui matcherait tous les modèles.
    //    Désactivé sur les titres multi-marques (« … BMW / AUDI / LAND ROVER ») :
    //    le mot qui suit une marque y est le plus souvent une autre marque, y
    //    compris une marque absente du référentiel (BAIC, Samsung…).
    if (models.length === 0 && brandHits.size === 1) {
      const next = tokens[afterIndex]
      if (
        next &&
        next.length >= 3 &&
        /[A-Z]/.test(next) &&
        !BRAND_KEYS.has(next) &&
        !PART_STOPWORDS.has(next)
      ) {
        models.push(next)
      }
    }

    if (models.length === 0) {
      out.push({ brand, model: null, yearFrom: null, yearTo: null })
    } else {
      for (const model of models) out.push({ brand, model, yearFrom: null, yearTo: null })
    }
  }

  return out
}
