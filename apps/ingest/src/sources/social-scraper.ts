import * as cheerio from 'cheerio'
import { fetchText } from '../lib/http'

export interface ScrapedPageInfo {
  url: string
  title: string | null
  description: string | null
  phoneNumbers: string[]
  whatsappLinks: string[]
  facebookLinks: string[]
  instagramLinks: string[]
  images: string[]
  textContent: string
  htmlTitle: string | null
}

export async function scrapeFacebookUrl(url: string): Promise<ScrapedPageInfo | null> {
  try {
    const html = await fetchText(url)
    const $ = cheerio.load(html)

    const title = $('meta[property="og:title"]').attr('content') ?? $('title').text().trim()
    const description = $('meta[property="og:description"]').attr('content') ?? $('meta[name="description"]').attr('content') ?? null
    const htmlTitle = $('title').text().trim() || null

    const phoneNumbers: string[] = []
    const whatsappLinks: string[] = []
    const facebookLinks: string[] = []
    const instagramLinks: string[] = []
    const images: string[] = []

    const pageText = $('body').text()
    const phoneRegex = /(?:\+225|00225)?\s*[0-9]{2}\s*[0-9]{2}\s*[0-9]{2}\s*[0-9]{2}\s*[0-9]{2}/g
    let match
    while ((match = phoneRegex.exec(pageText)) !== null) {
      const cleaned = match[0].replace(/\s+/g, '')
      if (!phoneNumbers.includes(cleaned)) phoneNumbers.push(cleaned)
    }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      if (href.includes('wa.me') || href.includes('api.whatsapp.com') || href.includes('chat.whatsapp.com')) {
        if (!whatsappLinks.includes(href)) whatsappLinks.push(href)

        const phoneInUrl = extractPhoneFromWhatsAppUrl(href)
        if (phoneInUrl && !phoneNumbers.includes(phoneInUrl)) phoneNumbers.push(phoneInUrl)
      }

      if (href.includes('web.facebook.com') || href.includes('www.facebook.com') || href.includes('fb.com')) {
        if (!facebookLinks.includes(href)) facebookLinks.push(href)
      }

      if (href.includes('instagram.com')) {
        if (!instagramLinks.includes(href)) instagramLinks.push(href)
      }
    })

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (src && !images.includes(src)) images.push(src)
    })

    return {
      url,
      title: title || null,
      description,
      phoneNumbers,
      whatsappLinks,
      facebookLinks,
      instagramLinks,
      images: images.slice(0, 10),
      textContent: pageText.slice(0, 5000),
      htmlTitle,
    }
  } catch {
    return null
  }
}

function extractPhoneFromWhatsAppUrl(url: string): string | null {
  const patterns = [
    /wa\.me\/([0-9]+)/,
    /phone=([0-9]+)/,
    /send\?phone=([0-9]+)/,
    /whatsapp:\/\/send\?phone=([0-9]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) {
      const phone = m[1]
      if (phone.length >= 8 && phone.length <= 15) return phone
    }
  }
  return null
}

export function isWhatsAppUrl(url: string): boolean {
  return /wa\.me|whatsapp\.com|whatsapp:\/\//.test(url)
}

export function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/.test(url)
}
