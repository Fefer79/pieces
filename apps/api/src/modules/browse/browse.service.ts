import { prisma } from '../../lib/prisma.js'
import { VEHICLE_BRANDS, BRAND_NAMES, getEngines as getEnginesData, enginesMatch, PART_CATEGORIES, UNIVERSAL_CATEGORIES, warrantyToDays } from 'shared/constants'
import type { WarrantyUnit } from 'shared/constants'
import { AppError } from '../../lib/appError.js'
import type { PartCondition, SupplyMode } from '@prisma/client'
import { importQuoteOptions, type ImportQuoteItem } from 'shared/constants'
import { fetchNhtsa, fetchFreeVinDecoder } from './vin.sources.js'

export interface VinDecodeResult {
  vin: string
  /** Marque du référentiel quand elle est reconnue, sinon libellé brut NHTSA. */
  make: string | null
  /** Modèle du référentiel, null quand le VIN ne permet pas de trancher. */
  model: string | null
  year: number | null
  /** Motorisation quand une seule reste plausible pour ce millésime. */
  engine: string | null
  /** Motorisations candidates (marque + modèle + millésime). */
  engines: string[]
  /** Modèles du millésime, à proposer quand le modèle reste indéterminé. */
  models: string[]
  /** true dès que la marque est reconnue dans le référentiel. */
  decoded: boolean
}

const VIN_YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789'

/**
 * Les deux millésimes que peut désigner le code de 10ᵉ position (ISO 3779) :
 * il boucle sur 30 ans. Les millésimes futurs sont écartés.
 */
export function vinYearCandidates(vin: string): number[] {
  const index = VIN_YEAR_CODES.indexOf(vin[9] ?? '')
  if (index < 0) return []
  const max = new Date().getFullYear() + 1
  return [1980 + index, 2010 + index].filter((year) => year <= max)
}

/**
 * Millésime déduit du VIN seul, et seulement quand il est déductible.
 *
 * La 7ᵉ position alphabétique signale le cycle 2010+ : c'est une règle FMVSS,
 * valable pour les véhicules vendus aux États-Unis. Un VIN européen y met ce
 * qu'il veut (WVWZZZ1KZAW… = Golf 2010 avec un chiffre en 7ᵉ), donc hors de ce
 * cas on renvoie null plutôt qu'un millésime faux : les sources tranchent.
 */
export function vinModelYear(vin: string): number | null {
  const index = VIN_YEAR_CODES.indexOf(vin[9] ?? '')
  if (index < 0 || !/[A-Z]/.test(vin[6] ?? '')) return null
  const year = 2010 + index
  return year > new Date().getFullYear() + 1 ? year - 30 : year
}

/** Clé de comparaison : « Land Rover », « LAND-ROVER » et « LANDROVER » égales. */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
}

/** Libellés NHTSA qui ne s'écrivent pas comme la clé du référentiel. */
const MAKE_ALIASES: Record<string, string> = {
  VW: 'VOLKSWAGEN',
  MERCEDES: 'MERCEDES-BENZ',
  MERCEDESBENZAG: 'MERCEDES-BENZ',
  ROVER: 'LAND ROVER',
  DSAUTOMOBILES: 'DS',
}

/**
 * Filet WMI (3 premiers caractères du VIN) → marque, pour les VIN que NHTSA ne
 * sait pas décoder : sa base couvre mal les véhicules d'import Europe/Asie,
 * très majoritaires à Abidjan. Seuls des codes constructeur sans ambiguïté.
 */
const WMI_BRANDS: Record<string, string> = {
  JT: 'TOYOTA', SB1: 'TOYOTA', SB3: 'TOYOTA', VNK: 'TOYOTA', MR0: 'TOYOTA', AHT: 'TOYOTA',
  JTH: 'LEXUS', JTJ: 'LEXUS',
  JN1: 'NISSAN', JN3: 'NISSAN', JN6: 'NISSAN', JN8: 'NISSAN', VSK: 'NISSAN', SJN: 'NISSAN', MDH: 'NISSAN',
  JHM: 'HONDA', JHL: 'HONDA', SHH: 'HONDA', MRH: 'HONDA',
  KMH: 'HYUNDAI', KMF: 'HYUNDAI', TMA: 'HYUNDAI', NLH: 'HYUNDAI',
  KNA: 'KIA', KNB: 'KIA', KND: 'KIA', U5Y: 'KIA',
  JA3: 'MITSUBISHI', JA4: 'MITSUBISHI', JMB: 'MITSUBISHI', JMY: 'MITSUBISHI', MMB: 'MITSUBISHI', MMC: 'MITSUBISHI',
  JS2: 'SUZUKI', JS3: 'SUZUKI', JSA: 'SUZUKI', TSM: 'SUZUKI', MMS: 'SUZUKI',
  JM1: 'MAZDA', JM7: 'MAZDA', JMZ: 'MAZDA',
  JAA: 'ISUZU', JAC: 'ISUZU', MPA: 'ISUZU',
  VF1: 'RENAULT', VF2: 'RENAULT', X7L: 'RENAULT', VNV: 'RENAULT',
  UU1: 'DACIA', UU5: 'DACIA',
  VF3: 'PEUGEOT', VR3: 'PEUGEOT',
  VF7: 'CITROEN', VR7: 'CITROEN',
  VR1: 'DS',
  WVW: 'VOLKSWAGEN', WV1: 'VOLKSWAGEN', WV2: 'VOLKSWAGEN', '3VW': 'VOLKSWAGEN', '9BW': 'VOLKSWAGEN',
  WAU: 'AUDI', WA1: 'AUDI', TRU: 'AUDI',
  WDB: 'MERCEDES-BENZ', WDC: 'MERCEDES-BENZ', WDD: 'MERCEDES-BENZ', WDF: 'MERCEDES-BENZ',
  W1K: 'MERCEDES-BENZ', W1N: 'MERCEDES-BENZ', W1V: 'MERCEDES-BENZ',
  WBA: 'BMW', WBS: 'BMW', WBY: 'BMW', WBW: 'BMW',
  WF0: 'FORD', WVG: 'VOLKSWAGEN',
  W0L: 'OPEL', W0V: 'OPEL',
  YV1: 'VOLVO', YV4: 'VOLVO',
  SAL: 'LAND ROVER', SAJ: 'JAGUAR',
  TMB: 'SKODA', VSS: 'SEAT',
  ZFA: 'FIAT', ZAR: 'ALFA ROMEO',
  WP0: 'PORSCHE', WP1: 'PORSCHE',
  LS5: 'CHANGAN', LGW: 'GREAT WALL',
}

/** Marque déduite du WMI : préfixe de 3 caractères, puis de 2. */
function brandFromWmi(vin: string): string | null {
  return WMI_BRANDS[vin.slice(0, 3)] ?? WMI_BRANDS[vin.slice(0, 2)] ?? null
}

function resolveBrandKey(make: string): string | null {
  const key = normalizeKey(make)
  if (!key) return null
  const aliased = MAKE_ALIASES[key]
  if (aliased) return aliased
  return Object.keys(VEHICLE_BRANDS).find((brand) => normalizeKey(brand) === key) ?? null
}

/**
 * Modèle NHTSA → modèle du référentiel. Exact d'abord, puis préfixe : NHTSA
 * renvoie souvent une déclinaison (« Corolla Sedan ») là où le référentiel ne
 * connaît que la famille (« Corolla »).
 */
function resolveModelKey(brandKey: string, model: string): string | null {
  const models = Object.keys(VEHICLE_BRANDS[brandKey]?.models ?? {})
  const key = normalizeKey(model)
  if (!key) return null
  const exact = models.find((m) => normalizeKey(m) === key)
  if (exact) return exact
  const prefixed = models.filter((m) => key.startsWith(normalizeKey(m)))
  if (prefixed.length === 0) return null
  return prefixed.reduce((longest, m) => (m.length > longest.length ? m : longest))
}

function modelsForYear(brandKey: string, year: number | null): string[] {
  const models = VEHICLE_BRANDS[brandKey]?.models ?? {}
  const names = Object.keys(models)
  if (!year) return names
  const matching = names.filter((m) => models[m]?.includes(year))
  return matching.length > 0 ? matching : names
}

const DIESEL_MARKERS = /(^|[\s-])(D|TD|HDI|BLUEHDI|TDI|DCI|CDI|CRDI|JTD|TDCI|D4D|DIESEL)([\s-]|$)/

/**
 * Motorisations plausibles : on part de celles du millésime puis on resserre
 * avec ce que la source a publié — cylindrée, carburant, ou un libellé moteur
 * complet (« 1.8L L4 DOHC 16V FWD ») rapproché par signature. Un filtre qui ne
 * laisse rien est ignoré — mieux vaut proposer trop que rien.
 */
function narrowEngines(
  all: string[],
  facts: { engine?: string | null; displacement?: string | null; fuel?: string | null },
): string[] {
  let candidates = all

  const label = facts.engine?.trim()
  if (label) {
    const byLabel = candidates.filter((option) => enginesMatch(label, option))
    if (byLabel.length > 0) candidates = byLabel
  }

  const litres = facts.displacement?.trim()
  if (litres && /^\d+(\.\d+)?$/.test(litres)) {
    const escaped = litres.replace('.', '\\.')
    const byDisplacement = candidates.filter((option) => new RegExp(`^${escaped}(?![0-9])`).test(option))
    if (byDisplacement.length > 0) candidates = byDisplacement
  }

  const fuel = facts.fuel ?? ''
  const isDiesel = /diesel|gazole/i.test(fuel)
  const isPetrol = /gasoline|petrol|essence/i.test(fuel)
  if (isDiesel || isPetrol) {
    const byFuel = candidates.filter((option) => DIESEL_MARKERS.test(option.toUpperCase()) === isDiesel)
    if (byFuel.length > 0) candidates = byFuel
  }

  return candidates
}

/**
 * Décodage VIN en deux temps.
 *
 * NHTSA d'abord : sans quota, et sa marque (tirée du WMI) est fiable même hors
 * USA. Elle s'arrête souvent là sur les VIN européens — or l'import Europe est
 * majoritaire à Abidjan. On complète alors avec freevindecoder.eu, qui rend le
 * modèle sur ces VIN mais plafonne à 10 requêtes/minute par IP : on ne
 * l'interroge donc QUE pour combler un trou, jamais en systématique.
 *
 * Tout le reste est rapproché du référentiel Pièces, seul capable de filtrer
 * les fitments. Si le modèle reste indéterminé, on renvoie ceux du millésime
 * pour que l'utilisateur tranche en un clic au lieu de repartir de zéro.
 */
export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const upperVin = vin.toUpperCase()
  const vinYear = vinModelYear(upperVin)
  const candidates = vinYearCandidates(upperVin)
  const fallback: VinDecodeResult = {
    vin: upperVin,
    make: null,
    model: null,
    // VIN non décodé : on affiche le millésime le plus récent que le code
    // autorise, présenté comme probable et non comme acquis.
    year: vinYear ?? candidates[candidates.length - 1] ?? null,
    engine: null,
    engines: [],
    models: [],
    decoded: false,
  }

  const nhtsa = await fetchNhtsa(upperVin, vinYear)
  let brandKey = (nhtsa.make ? resolveBrandKey(nhtsa.make) : null) ?? brandFromWmi(upperVin)
  let modelKey = brandKey && nhtsa.model ? resolveModelKey(brandKey, nhtsa.model) : null
  // Le millésime vient des sources : elles savent lever l'ambiguïté du cycle
  // sur les VIN non américains, là où le VIN seul ne le permet pas.
  let year = nhtsa.year ?? vinYear ?? null
  let engines =
    brandKey && modelKey ? narrowEngines(getEnginesData(brandKey, modelKey, year), nhtsa) : []

  // Second appel seulement quand le modèle manque. Sa fiche ne publie jamais
  // la puissance et souvent aucun moteur (rien sur la Golf, « 1.8L L4 DOHC
  // 16V FWD » sur la Prius) : elle ne trancherait donc pas une motorisation
  // ambiguë, alors que la cylindrée NHTSA le fait déjà. Le budget — 8 appels
  // par minute pour toute la plateforme — va là où il paie.
  if (!modelKey) {
    const free = await fetchFreeVinDecoder(upperVin)
    if (free) {
      brandKey = brandKey ?? (free.make ? resolveBrandKey(free.make) : null)
      const freeModelKey = brandKey && free.model ? resolveModelKey(brandKey, free.model) : null
      if (freeModelKey) modelKey = freeModelKey
      year = free.year ?? year
      if (brandKey && modelKey) {
        const all = getEnginesData(brandKey, modelKey, year)
        // Les deux sources se cumulent : NHTSA donne cylindrée et carburant,
        // freevindecoder un libellé moteur complet. Ce qui reste après les
        // deux tamis est la motorisation ; si l'un vide la liste, il est
        // ignoré par narrowEngines.
        engines = narrowEngines(narrowEngines(all, nhtsa), free)
      }
    }
  }

  if (!brandKey) {
    return { ...fallback, make: nhtsa.make || null }
  }

  return {
    vin: upperVin,
    make: brandKey,
    model: modelKey,
    year,
    engine: engines.length === 1 ? (engines[0] ?? null) : null,
    engines,
    models: modelKey ? [] : modelsForYear(brandKey, year),
    decoded: true,
  }
}

export function getBrands() {
  return BRAND_NAMES
}

/**
 * Résout la donnée d'une marque par clé, insensible à la casse. Les clés de
 * VEHICLE_BRANDS sont en MAJUSCULES (export depuis la base Global Auto) ; la
 * marque peut arriver d'une URL ou d'un véhicule utilisateur en casse libre.
 */
function resolveBrand(brand: string) {
  const direct = VEHICLE_BRANDS[brand]
  if (direct) return direct
  const lower = brand.toLowerCase()
  for (const [key, value] of Object.entries(VEHICLE_BRANDS)) {
    if (key.toLowerCase() === lower) return value
  }
  throw new AppError('BRAND_NOT_FOUND', 404, { message: `Marque "${brand}" introuvable` })
}

export function getModels(brand: string) {
  return Object.keys(resolveBrand(brand).models)
}

export function getYears(brand: string, model: string) {
  const brandData = resolveBrand(brand)
  const lower = model.toLowerCase()
  const modelKey = Object.keys(brandData.models).find((m) => m.toLowerCase() === lower)
  const years = modelKey ? brandData.models[modelKey] : undefined
  if (!years) {
    throw new AppError('MODEL_NOT_FOUND', 404, { message: `Modèle "${model}" introuvable pour ${brand}` })
  }
  return years.slice().reverse() // Most recent first
}

/**
 * Motorisations connues pour une marque/modèle, restreintes au millésime quand
 * il est fourni (une génération ne partage pas les moteurs des autres). Résout
 * d'abord les clés canoniques (casse exacte) car getEnginesData indexe
 * VEHICLE_DATA par clé exacte. Renvoie [] si le modèle existe mais n'a pas de
 * data moteur.
 */
export function getModelEngines(brand: string, model: string, year?: number): string[] {
  const lowerBrand = brand.toLowerCase()
  const brandKey = Object.keys(VEHICLE_BRANDS).find((b) => b.toLowerCase() === lowerBrand)
  if (!brandKey) {
    throw new AppError('BRAND_NOT_FOUND', 404, { message: `Marque "${brand}" introuvable` })
  }
  const lowerModel = model.toLowerCase()
  const brandModels = VEHICLE_BRANDS[brandKey]?.models ?? {}
  const modelKey = Object.keys(brandModels).find((m) => m.toLowerCase() === lowerModel)
  if (!modelKey) {
    throw new AppError('MODEL_NOT_FOUND', 404, { message: `Modèle "${model}" introuvable pour ${brand}` })
  }
  return getEnginesData(brandKey, modelKey, year)
}

export function getCategories() {
  return [...PART_CATEGORIES]
}

export interface VehicleCompatibilityFilters {
  brand?: string
  model?: string
  year?: number
  /** Motorisation choisie, libellé du référentiel (« 1.6 BlueHDi 100 cv »). */
  engine?: string
}

export interface BrowsePartsFilters extends VehicleCompatibilityFilters {
  category?: string
  q?: string
  /**
   * État de la pièce. Deux axes INDÉPENDANTS avec `supplyMode` : « Neuf à
   * importer » = condition NEW + supplyMode IMPORT. Sans ce filtre, les deux
   * rubriques d'import renverraient la même liste.
   */
  condition?: PartCondition[]
  /** Disponibilité : LOCAL = déjà à Abidjan, IMPORT = à faire venir. */
  supplyMode?: SupplyMode
  page?: number
  limit?: number
}

const PART_CONDITIONS: PartCondition[] = ['NEW', 'USED', 'REFURBISHED']

/** Conditions valides d'une liste brute (querystring), ou undefined si aucune. */
export function parseConditions(raw: string | undefined): PartCondition[] | undefined {
  if (!raw) return undefined
  const values = raw
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is PartCondition => (PART_CONDITIONS as string[]).includes(v))
  return values.length > 0 ? values : undefined
}

export function parseSupplyMode(raw: string | undefined): SupplyMode | undefined {
  const value = raw?.trim().toUpperCase()
  return value === 'LOCAL' || value === 'IMPORT' ? value : undefined
}

/**
 * Libellés de motorisation présents dans les fitments du modèle qui désignent
 * la motorisation choisie. Les vendeurs et les imports saisissent du texte
 * libre (« 1.6 BlueHDi S&S 100cv ») : le rapprochement se fait sur la
 * signature cylindrée + puissance, pas sur la chaîne. Le SQL ne sait pas le
 * faire, d'où ce passage par la liste des libellés distincts du modèle.
 *
 * Renvoie null quand aucune motorisation n'est demandée (= pas de filtre).
 */
async function resolveFitmentEngines(filters: VehicleCompatibilityFilters): Promise<string[] | null> {
  const engine = filters.engine?.trim()
  if (!engine || !filters.brand || !filters.model) return null

  const rows = await prisma.catalogItemFitment.findMany({
    where: {
      brand: { equals: filters.brand, mode: 'insensitive' },
      model: { equals: filters.model, mode: 'insensitive' },
      NOT: { engine: null },
    },
    select: { engine: true },
    distinct: ['engine'],
  })

  return rows
    .map((row) => row.engine)
    .filter((label): label is string => label !== null && enginesMatch(engine, label))
}

/**
 * Clause Prisma de compatibilité véhicule STRICTE : ne matche que les pièces
 * ayant un fitment structuré correspondant à la marque/modèle/année/moteur.
 * Les pièces universelles (fluides, outillage, accessoires) restent toujours
 * visibles. Retourne null si aucun véhicule n'est sélectionné.
 *
 * `matchingEngines` vient de resolveFitmentEngines ; null = pas de filtre
 * moteur. Un fitment sans moteur renseigné vaut « toutes motorisations » et
 * passe donc toujours, comme un fitment sans modèle.
 */
function buildVehicleCompatibilityClause(
  filters: VehicleCompatibilityFilters,
  matchingEngines: string[] | null = null,
): Record<string, unknown> | null {
  if (!filters.brand) return null

  const fitmentWhere: Record<string, unknown> = { brand: { equals: filters.brand, mode: 'insensitive' } }
  const conditions: Record<string, unknown>[] = []
  if (filters.model) {
    conditions.push({ OR: [{ model: null }, { model: { equals: filters.model, mode: 'insensitive' } }] })
  }
  if (filters.year) {
    conditions.push(
      { OR: [{ yearFrom: null }, { yearFrom: { lte: filters.year } }] },
      { OR: [{ yearTo: null }, { yearTo: { gte: filters.year } }] },
    )
  }
  if (matchingEngines) {
    conditions.push({ OR: [{ engine: null }, { engine: { in: matchingEngines } }] })
  }
  if (conditions.length > 0) {
    fitmentWhere.AND = conditions
  }

  return {
    OR: [
      { fitments: { some: fitmentWhere } },
      { category: { in: [...UNIVERSAL_CATEGORIES] } },
      { isUniversallyCompatible: true },
    ],
  }
}

/** Clause texte libre (nom de pièce ou référence OEM). Null si < 2 caractères. */
function buildTextClause(q?: string): Record<string, unknown> | null {
  const term = q?.trim()
  if (!term || term.length < 2) return null
  return {
    OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { oemReference: { contains: term, mode: 'insensitive' } },
    ],
  }
}

export async function browseParts(filters: BrowsePartsFilters = {}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
  }

  if (filters.category) {
    where.category = filters.category
  }
  if (filters.condition && filters.condition.length > 0) {
    where.condition = { in: filters.condition }
  }
  if (filters.supplyMode) {
    where.supplyMode = filters.supplyMode
  }

  // Filtrage strict : véhicule (fitments) + texte combinés en AND.
  const and: Record<string, unknown>[] = []
  const vehicleClause = buildVehicleCompatibilityClause(filters, await resolveFitmentEngines(filters))
  if (vehicleClause) and.push(vehicleClause)
  const textClause = buildTextClause(filters.q)
  if (textClause) and.push(textClause)
  if (and.length > 0) where.AND = and

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        condition: true,
        partSource: true,
        supplyMode: true,
        originCountry: true,
        oemReference: true,
        vehicleCompatibility: true,
        price: true,
        imageThumbUrl: true,
        imageMediumUrl: true,
        imageOriginalUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export interface CompareOffer {
  id: string
  vendorId: string
  vendorName: string
  vendorRating: number | null
  vendorOrdersDelivered: number
  price: number | null
  condition: string | null
  partSource: string | null
  warrantyValue: number | null
  warrantyUnit: WarrantyUnit | null
  inStock: boolean
  imageThumbUrl: string | null
  imageMediumUrl: string | null
  imageOriginalUrl: string | null
  // Score « rapport qualité-prix » sur 100 (rempli au moment du regroupement,
  // relatif aux autres offres du même groupe). Null si pas de prix.
  valueScore: number | null
}

export interface CompareGroup {
  groupKey: string
  oemReference: string | null
  name: string | null
  category: string | null
  offerCount: number
  minPrice: number | null
  offers: CompareOffer[]
  // id de l'offre au meilleur rapport qualité-prix du groupe.
  bestValueOfferId: string | null
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Pondération du score qualité-prix. Le prix domine (c'est un marché sensible au
// prix) mais la réputation vendeur et la garantie cassent les égalités et évitent
// de recommander la pièce la moins chère d'un vendeur non fiable.
const VALUE_W_PRICE = 0.55
const VALUE_W_RATING = 0.3
const VALUE_W_WARRANTY = 0.15

// Bonus de fiabilité par type de pièce — l'OEM/aftermarket reconnu rassure.
const SOURCE_QUALITY: Record<string, number> = {
  OEM: 1,
  AFTERMARKET: 0.85,
  COMPATIBLE: 0.6,
}

/**
 * Calcule un score qualité-prix sur 100 pour chaque offre d'un groupe, relatif
 * aux autres offres : le prix est normalisé sur l'offre la moins chère, la note
 * vendeur et la garantie viennent enrichir. Les offres sans prix restent à null.
 */
function scoreOffers(offers: CompareOffer[]): void {
  const prices = offers.map((o) => o.price).filter((p): p is number => p != null && p > 0)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxWarranty = Math.max(1, ...offers.map((o) => warrantyToDays(o.warrantyValue, o.warrantyUnit)))

  for (const o of offers) {
    if (o.price == null || o.price <= 0 || minPrice == null) {
      o.valueScore = null
      continue
    }
    // 1 pour la moins chère, décroît à mesure que le prix monte.
    const priceScore = minPrice / o.price
    // Note vendeur 0-100 → 0-1 ; 0,5 par défaut si pas encore noté.
    const ratingScore = o.vendorRating != null ? o.vendorRating / 100 : 0.5
    // Garantie relative + qualité de source.
    const warrantyScore = warrantyToDays(o.warrantyValue, o.warrantyUnit) / maxWarranty
    const sourceBonus = o.partSource ? (SOURCE_QUALITY[o.partSource] ?? 0.6) : 0.6
    const quality = ratingScore * 0.7 + sourceBonus * 0.3

    const raw =
      VALUE_W_PRICE * priceScore + VALUE_W_RATING * quality + VALUE_W_WARRANTY * warrantyScore
    o.valueScore = Math.round(raw * 100)
  }
}

export async function compareParts(
  filters: BrowsePartsFilters & { oem?: string; sort?: 'price' | 'value' } = {},
) {
  const sort = filters.sort === 'value' ? 'value' : 'price'
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
  }

  if (filters.category) where.category = filters.category
  if (filters.oem) where.oemReference = { equals: filters.oem, mode: 'insensitive' }

  if (filters.brand) {
    const compatParts: string[] = [filters.brand]
    if (filters.model) compatParts.push(filters.model)
    if (filters.year) compatParts.push(String(filters.year))
    const compatQuery = compatParts.join(' ')

    const matchingEngines = await resolveFitmentEngines(filters)
    const fitmentWhere: Record<string, unknown> = { brand: { equals: filters.brand, mode: 'insensitive' } }
    const conditions: Record<string, unknown>[] = []
    if (filters.model) {
      conditions.push({ OR: [{ model: null }, { model: { equals: filters.model, mode: 'insensitive' } }] })
    }
    if (filters.year) {
      conditions.push(
        { OR: [{ yearFrom: null }, { yearFrom: { lte: filters.year } }] },
        { OR: [{ yearTo: null }, { yearTo: { gte: filters.year } }] },
      )
    }
    if (matchingEngines) {
      conditions.push({ OR: [{ engine: null }, { engine: { in: matchingEngines } }] })
    }
    if (conditions.length > 0) {
      fitmentWhere.AND = conditions
    }

    const compatClauses: Record<string, unknown>[] = [{ fitments: { some: fitmentWhere } }]
    // Le repli texte legacy ne porte aucune motorisation : dès qu'une est
    // demandée, il laisserait passer toutes les versions du modèle. On le
    // retire alors plutôt que de rendre le filtre poreux.
    if (!matchingEngines) {
      compatClauses.push({ vehicleCompatibility: { contains: compatQuery, mode: 'insensitive' } })
    }
    where.OR = compatClauses
  }

  const items = await prisma.catalogItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      oemReference: true,
      condition: true,
      partSource: true,
      supplyMode: true,
      originCountry: true,
      supplierLeadDays: true,
      price: true,
      warrantyValue: true,
      warrantyUnit: true,
      inStock: true,
      imageThumbUrl: true,
      imageMediumUrl: true,
      imageOriginalUrl: true,
      vendor: {
        select: {
          id: true,
          shopName: true,
          aggregateRating: true,
          ordersDelivered: true,
        },
      },
    },
    take: 500,
  })

  const groups = new Map<string, CompareGroup>()
  for (const item of items) {
    const groupKey = item.oemReference
      ? `oem:${item.oemReference.toUpperCase()}`
      : `name:${normalizeName(item.name)}`
    if (!groupKey || groupKey === 'name:') continue

    const offer: CompareOffer = {
      id: item.id,
      vendorId: item.vendor.id,
      vendorName: item.vendor.shopName,
      vendorRating: item.vendor.aggregateRating,
      vendorOrdersDelivered: item.vendor.ordersDelivered,
      price: item.price,
      condition: item.condition,
      partSource: item.partSource,
      warrantyValue: item.warrantyValue,
      warrantyUnit: item.warrantyUnit,
      inStock: item.inStock,
      imageThumbUrl: item.imageThumbUrl,
      imageMediumUrl: item.imageMediumUrl,
      imageOriginalUrl: item.imageOriginalUrl,
      valueScore: null,
    }

    const existing = groups.get(groupKey)
    if (existing) {
      existing.offers.push(offer)
      existing.offerCount += 1
      if (offer.price != null && (existing.minPrice == null || offer.price < existing.minPrice)) {
        existing.minPrice = offer.price
      }
    } else {
      groups.set(groupKey, {
        groupKey,
        oemReference: item.oemReference,
        name: item.name,
        category: item.category,
        offerCount: 1,
        minPrice: offer.price,
        offers: [offer],
        bestValueOfferId: null,
      })
    }
  }

  const result = Array.from(groups.values()).map((g) => {
    // Le scoring qualité-prix est toujours calculé (affiché côté UI) ; le tri
    // dépend du paramètre demandé. Le meilleur rapport qualité-prix est marqué
    // dans les deux cas.
    scoreOffers(g.offers)
    const best = g.offers.reduce<CompareOffer | null>((acc, o) => {
      if (o.valueScore == null) return acc
      return acc == null || o.valueScore > (acc.valueScore ?? -1) ? o : acc
    }, null)
    g.bestValueOfferId = best?.id ?? null

    g.offers.sort((a, b) => {
      if (sort === 'value') {
        const av = a.valueScore ?? -1
        const bv = b.valueScore ?? -1
        if (bv !== av) return bv - av
      }
      const ap = a.price ?? Number.POSITIVE_INFINITY
      const bp = b.price ?? Number.POSITIVE_INFINITY
      return ap - bp
    })
    return g
  })

  result.sort((a, b) => b.offerCount - a.offerCount)

  return { groups: result, total: result.length }
}

export async function searchParts(query: string, filters: { category?: string; page?: number; limit?: number } = {}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  // Apply synonym correction
  let correctedQuery = query.toLowerCase().trim()
  const synonyms = await prisma.searchSynonym.findMany()
  for (const syn of synonyms) {
    if (correctedQuery.includes(syn.typo)) {
      correctedQuery = correctedQuery.replace(syn.typo, syn.correction)
    }
  }

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
    OR: [
      { name: { contains: correctedQuery, mode: 'insensitive' } },
      { category: { contains: correctedQuery, mode: 'insensitive' } },
      { oemReference: { contains: correctedQuery, mode: 'insensitive' } },
      { vehicleCompatibility: { contains: correctedQuery, mode: 'insensitive' } },
    ],
  }

  if (filters.category) {
    where.category = filters.category
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        condition: true,
        partSource: true,
        supplyMode: true,
        originCountry: true,
        oemReference: true,
        vehicleCompatibility: true,
        price: true,
        imageThumbUrl: true,
        imageMediumUrl: true,
        imageOriginalUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return {
    query: correctedQuery,
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

/**
 * Suggestions de NOMS de pièces pour l'autocomplétion. Si un véhicule est passé,
 * les suggestions sont restreintes aux pièces compatibles (mêmes règles strictes
 * que browseParts) pour rester pertinentes.
 */
export async function suggestParts(
  query: string,
  filters: VehicleCompatibilityFilters = {},
  limit = 8,
): Promise<{ suggestions: string[] }> {
  const term = query.trim()
  if (term.length < 2) return { suggestions: [] }

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
    name: { contains: term, mode: 'insensitive' },
  }

  const vehicleClause = buildVehicleCompatibilityClause(filters, await resolveFitmentEngines(filters))
  if (vehicleClause) where.AND = [vehicleClause]

  const rows = await prisma.catalogItem.findMany({
    where,
    select: { name: true },
    distinct: ['name'],
    orderBy: { name: 'asc' },
    take: Math.min(limit, 20),
  })

  return { suggestions: rows.map((r) => r.name).filter((n): n is string => n != null) }
}

/**
 * Détail public d'une fiche produit (pièce). Ne renvoie que les pièces
 * publiées d'un vendeur actif. Inclut photos, compatibilités véhicule et
 * coordonnées vendeur — utilisé par la fiche produit côté acheteur.
 */
export async function getPublicItemDetail(id: string) {
  const item = await prisma.catalogItem.findFirst({
    where: { id, status: 'PUBLISHED', vendor: { status: 'ACTIVE' } },
    select: {
      id: true,
      name: true,
      category: true,
      oemReference: true,
      vehicleCompatibility: true,
      condition: true,
      partSource: true,
      supplyMode: true,
      originCountry: true,
      supplierLeadDays: true,
      price: true,
      warrantyValue: true,
      warrantyUnit: true,
      inStock: true,
      isUniversallyCompatible: true,
      imageOriginalUrl: true,
      imageThumbUrl: true,
      imageSmallUrl: true,
      imageMediumUrl: true,
      imageLargeUrl: true,
      vendor: {
        select: {
          id: true,
          shopName: true,
          aggregateRating: true,
          avgReviewRating: true,
          ordersDelivered: true,
        },
      },
      photos: {
        orderBy: { position: 'asc' },
        select: { id: true, urlThumb: true, urlMedium: true, urlLarge: true, urlOriginal: true },
      },
      fitments: {
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        select: { id: true, brand: true, model: true, yearFrom: true, yearTo: true, engine: true },
      },
    },
  })

  if (!item) {
    throw new AppError('ITEM_NOT_FOUND', 404, { message: 'Pièce introuvable' })
  }

  // Le numéro de téléphone du vendeur n'est JAMAIS exposé aux acheteurs/visiteurs,
  // y compris pour les annonces externes (Jumia/CoinAfrique). Seuls l'admin et les
  // liaisons y ont accès, via leurs endpoints dédiés et protégés par rôle. Le nom
  // du vendeur (shopName) reste visible ; la provenance (source) n'est pas divulguée.

  // Avis d'acheteurs vérifiés : chaque SellerReview est liée à une commande, donc
  // émise par un acheteur réel. Sert à afficher les étoiles « façon Amazon ».
  const reviewsCount = await prisma.sellerReview.count({
    where: { vendorId: item.vendor.id },
  })

  return { ...item, vendor: { ...item.vendor, reviewsCount } }
}

/**
 * Devis d'acheminement (bateau / avion éco / avion express) pour un lot de
 * pièces à importer.
 *
 * Calculé CÔTÉ SERVEUR et pas dans le navigateur, parce que la douane s'assied
 * sur la valeur déclarée — le coût d'achat réel chez le partenaire — qui ne doit
 * jamais quitter le serveur. Le client reçoit trois montants, pas leur base.
 */
export async function quoteImportOptions(input: Array<{ catalogItemId: string; quantity: number }>) {
  const ids = input.map((i) => i.catalogItemId)
  if (ids.length === 0) return { options: [], items: 0 }

  const rows = await prisma.catalogItem.findMany({
    where: { id: { in: ids }, status: 'PUBLISHED', supplyMode: 'IMPORT' },
    select: { id: true, name: true, category: true, weightKg: true, price: true, sourceCostFcfa: true },
  })

  const qtyById = new Map(input.map((i) => [i.catalogItemId, Math.max(1, i.quantity)]))
  const quoteItems: ImportQuoteItem[] = rows.map((row) => ({
    name: row.name,
    category: row.category,
    weightKg: row.weightKg,
    quantity: qtyById.get(row.id) ?? 1,
    // Valeur en douane = coût d'achat réel ; repli sur le prix public si la
    // fiche n'a pas de coût renseigné (saisie manuelle plutôt qu'ingestion).
    customsValue: row.sourceCostFcfa ?? row.price ?? 0,
  }))

  return { options: importQuoteOptions(quoteItems), items: quoteItems.length }
}
