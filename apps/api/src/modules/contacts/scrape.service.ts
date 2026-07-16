interface ScrapedInfo {
  url: string
  title: string | null
  description: string | null
  phoneNumbers: string[]
  whatsappLinks: string[]
  facebookLinks: string[]
  instagramLinks: string[]
  images: string[]
  textPreview: string
}

export async function scrapeUrl(html: string, url: string): Promise<ScrapedInfo> {
  const phoneNumbers: string[] = []
  const whatsappLinks: string[] = []
  const facebookLinks: string[] = []
  const instagramLinks: string[] = []
  const images: string[] = []

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
  const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
    ?? html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)

  const title = ogTitleMatch?.[1] ?? titleMatch?.[1]?.trim() ?? null
  const description = descMatch?.[1] ?? null

  const strippedHtml = html.replace(/<[^>]+>/g, ' ')
  const phoneRegex = /(?:\+225|00225)?[\d]{2}[\s.-]*[\d]{2}[\s.-]*[\d]{2}[\s.-]*[\d]{2}[\s.-]*[\d]{2}/g
  let phoneMatch
  while ((phoneMatch = phoneRegex.exec(strippedHtml)) !== null) {
    const cleaned = phoneMatch[0].replace(/[\s.-]+/g, '')
    if (cleaned.length >= 8 && !phoneNumbers.includes(cleaned)) {
      phoneNumbers.push(cleaned)
    }
  }

  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const rawHref = linkMatch[1]
    if (!rawHref) continue
    const href = decodeURIComponent(rawHref).trim()
    if (!href) continue

    if (/wa\.me|whatsapp\.com|whatsapp:\/\//.test(href)) {
      if (!whatsappLinks.includes(href)) whatsappLinks.push(href)
      const phoneFromWa = extractPhoneFromWhatsApp(href)
      if (phoneFromWa && !phoneNumbers.includes(phoneFromWa)) phoneNumbers.push(phoneFromWa)
    }
    if (/facebook\.com|fb\.com|fb\.me/.test(href) && !facebookLinks.includes(href)) {
      facebookLinks.push(href)
    }
    if (/instagram\.com/.test(href) && !instagramLinks.includes(href)) {
      instagramLinks.push(href)
    }
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let imgMatch
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1]
    if (src && !images.includes(src) && images.length < 10) images.push(src)
  }

  const textPreview = strippedHtml.replace(/\s+/g, ' ').trim().slice(0, 1000)

  return {
    url,
    title,
    description,
    phoneNumbers,
    whatsappLinks,
    facebookLinks,
    instagramLinks,
    images,
    textPreview,
  }
}

function extractPhoneFromWhatsApp(url: string): string | null {
  const m = url.match(/(?:wa\.me\/|phone=)(\d{8,15})/)
  return m?.[1] ?? null
}
