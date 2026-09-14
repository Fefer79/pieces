/**
 * Sources de décodage VIN.
 *
 * Deux services, complémentaires :
 * - NHTSA (API publique, sans quota) connaît bien les VIN nord-américains et
 *   sort presque toujours la marque, même hors USA, car elle vient du WMI.
 *   Sur les VIN européens elle s'arrête là : pas de modèle.
 * - freevindecoder.eu (site public, pas d'API) rend le modèle sur ces mêmes
 *   VIN européens (WVWZZZ1KZ… → Volkswagen Golf 2010), mais plafonne à
 *   10 requêtes/minute par IP — or l'API sort par une seule IP Render.
 *
 * D'où la règle : NHTSA d'abord, freevindecoder seulement pour combler un
 * modèle manquant, sous budget et avec cache. Une source indisponible ne doit
 * jamais faire échouer un décodage : on rend null, l'appelant continue.
 */

export interface VinFacts {
  make: string | null
  model: string | null
  year: number | null
  /** Libellé moteur libre (« 1.8L L4 DOHC 16V FWD »), à rapprocher du référentiel. */
  engine: string | null
  /** Cylindrée en litres, telle que publiée par la source. */
  displacement: string | null
  fuel: string | null
}

const EMPTY: VinFacts = { make: null, model: null, year: null, engine: null, displacement: null, fuel: null }

/** Décodages déjà obtenus. Un VIN ne change jamais : le cache n'expire pas. */
const CACHE_LIMIT = 1000
const cache = new Map<string, VinFacts>()

function cached(key: string): VinFacts | undefined {
  return cache.get(key)
}

function remember(key: string, facts: VinFacts): VinFacts {
  // Map conserve l'ordre d'insertion : la plus ancienne entrée sort en premier.
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, facts)
  return facts
}

/** Vide le cache — tests uniquement. */
export function clearVinCache(): void {
  cache.clear()
  freeVinCalls.length = 0
  freeVinCooldownUntil = 0
}

const FETCH_TIMEOUT_MS = 6_000

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface NhtsaRow {
  Make?: string
  Model?: string
  ModelYear?: string
  DisplacementL?: string
  FuelTypePrimary?: string
}

/**
 * NHTSA vPIC. `yearHint` améliore nettement le décodage hors USA — sans lui, le
 * service choisit souvent le mauvais tour du cycle d'années.
 */
export async function fetchNhtsa(vin: string, yearHint: number | null): Promise<VinFacts> {
  const key = `nhtsa:${vin}:${yearHint ?? ''}`
  const hit = cached(key)
  if (hit) return hit

  const params = new URLSearchParams({ format: 'json' })
  if (yearHint) params.set('modelyear', String(yearHint))
  const res = await fetchWithTimeout(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?${params.toString()}`,
  )
  if (!res || !res.ok) return EMPTY

  let row: NhtsaRow | undefined
  try {
    const data = (await res.json()) as { Results?: NhtsaRow[] }
    row = data.Results?.[0]
  } catch {
    return EMPTY
  }
  if (!row) return EMPTY

  const year = row.ModelYear ? parseInt(row.ModelYear, 10) : NaN
  return remember(key, {
    make: row.Make?.trim() || null,
    model: row.Model?.trim() || null,
    year: Number.isFinite(year) ? year : null,
    engine: null,
    displacement: row.DisplacementL?.trim() || null,
    fuel: row.FuelTypePrimary?.trim() || null,
  })
}

/**
 * Budget d'appels à freevindecoder.eu : 10 par minute et par IP, annoncé par
 * ses en-têtes x-ratelimit-*. On tient le compte localement pour ne pas partir
 * sciemment dans le mur, et on respecte le `retry-after` d'un 429.
 */
const FREE_VIN_WINDOW_MS = 60_000
const FREE_VIN_BUDGET = 8 // marge sous les 10 annoncés
const freeVinCalls: number[] = []
let freeVinCooldownUntil = 0

function freeVinBudgetAvailable(now: number): boolean {
  if (now < freeVinCooldownUntil) return false
  while (freeVinCalls.length > 0 && now - (freeVinCalls[0] ?? 0) > FREE_VIN_WINDOW_MS) {
    freeVinCalls.shift()
  }
  return freeVinCalls.length < FREE_VIN_BUDGET
}

/** Valeur d'une ligne du tableau « General information ». */
function readInfoRow(html: string, label: string): string | null {
  const pattern = new RegExp(
    `<td class="info-left">\\s*${label}\\s*</td>[\\s\\S]*?<td class="info-right">([\\s\\S]*?)</td>`,
    'i',
  )
  const raw = html.match(pattern)?.[1]
  if (!raw) return null
  const value = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return value || null
}

/**
 * freevindecoder.eu — pas d'API : la fiche est servie en GET sur /<VIN> et
 * lue dans le tableau « General information ». Renvoie null quand le budget
 * est épuisé, que le site refuse ou qu'il ne reconnaît pas le VIN : l'appelant
 * garde alors ce que NHTSA lui a donné.
 */
export async function fetchFreeVinDecoder(vin: string): Promise<VinFacts | null> {
  const key = `freevin:${vin}`
  const hit = cached(key)
  if (hit) return hit

  const now = Date.now()
  if (!freeVinBudgetAvailable(now)) return null
  freeVinCalls.push(now)

  // Le site est localisé et négocie la langue : sans forcer l'anglais il sert
  // parfois une autre langue, et les libellés du tableau — notre seul contrat
  // de lecture — changent avec elle (« Make » devient « Napravite »).
  const res = await fetchWithTimeout(`https://www.freevindecoder.eu/en/${vin}`, {
    headers: {
      'User-Agent': 'PiecesBot/1.0 (+https://pieces.ci)',
      Accept: 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!res) return null
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') ?? '', 10)
    freeVinCooldownUntil = Date.now() + (Number.isFinite(retryAfter) ? retryAfter * 1000 : FREE_VIN_WINDOW_MS)
    return null
  }
  if (!res.ok) return null

  const html = await res.text().catch(() => '')
  const make = readInfoRow(html, 'Make')
  if (!make) return null

  const year = parseInt(readInfoRow(html, 'Model year') ?? '', 10)
  return remember(key, {
    make,
    model: readInfoRow(html, 'Model'),
    year: Number.isFinite(year) ? year : null,
    engine: readInfoRow(html, 'Engine type') ?? readInfoRow(html, 'Engine'),
    displacement: readInfoRow(html, 'Displacement'),
    fuel: readInfoRow(html, 'Fuel type'),
  })
}
