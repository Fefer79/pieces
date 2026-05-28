import { z } from 'zod'
import { fetchText } from '../lib/http.ts'

const SITEMAP_INDEX_URL = 'https://3hautoparts.com/sitemap_index.xml'

const ProductOffer = z.object({
  '@type': z.literal('Offer'),
  price: z.union([z.string(), z.number()]),
  priceCurrency: z.string(),
  availability: z.string().optional(),
  itemCondition: z.string().optional(),
  url: z.string().url().optional(),
})

const ProductImage = z.object({
  '@type': z.literal('ImageObject'),
  url: z.string().url(),
  height: z.union([z.string(), z.number()]).optional(),
  width: z.union([z.string(), z.number()]).optional(),
})

const ProductSchema = z.object({
  '@type': z.literal('Product'),
  name: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  image: z.union([ProductImage, z.array(ProductImage)]).optional(),
  offers: ProductOffer.optional(),
  '@id': z.string().optional(),
})

const RankMathGraph = z.object({
  '@context': z.string(),
  '@graph': z.array(z.unknown()),
})

export type ThreeHProductRaw = z.infer<typeof ProductSchema> & {
  sourceUrl: string
}

/**
 * Rank Math emits invalid JSON-LD escapes ("d\\'Ivoire" instead of "d'Ivoire").
 * The string parses but contains literal backslashes — strip them here.
 */
function sanitizeRankMathJson(raw: string): string {
  return raw.replace(/\\\\'/g, "'").replace(/\\'/g, "'")
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function extractLocs(xml: string): string[] {
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g)
  const out: string[] = []
  for (const m of matches) {
    const loc = m[1]
    if (loc) out.push(loc.trim())
  }
  return out
}

export async function fetchProductUrls(): Promise<string[]> {
  const indexXml = await fetchText(SITEMAP_INDEX_URL)
  const subSitemaps = extractLocs(indexXml).filter((u) => u.includes('product-sitemap'))
  const urls: string[] = []
  for (const subUrl of subSitemaps) {
    const subXml = await fetchText(subUrl)
    for (const loc of extractLocs(subXml)) {
      if (loc.match(/\/produit\/[^/]+\/?$/)) urls.push(loc)
    }
  }
  return urls
}

export async function fetchProduct(url: string): Promise<ThreeHProductRaw | null> {
  const html = await fetchText(url)
  const scriptMatch = html.match(
    /<script type="application\/ld\+json" class="rank-math-schema">([\s\S]*?)<\/script>/
  )
  if (!scriptMatch?.[1]) return null
  const sanitized = sanitizeRankMathJson(scriptMatch[1])
  let parsed: unknown
  try {
    parsed = JSON.parse(sanitized)
  } catch {
    return null
  }
  const graph = RankMathGraph.safeParse(parsed)
  if (!graph.success) return null
  for (const node of graph.data['@graph']) {
    const candidate = ProductSchema.safeParse(node)
    if (candidate.success) {
      return {
        ...candidate.data,
        name: decodeHtmlEntities(candidate.data.name),
        description: candidate.data.description ? decodeHtmlEntities(candidate.data.description) : undefined,
        category: candidate.data.category ? decodeHtmlEntities(candidate.data.category) : undefined,
        sourceUrl: url,
      }
    }
  }
  return null
}
