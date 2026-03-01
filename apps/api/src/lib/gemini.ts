import { GoogleGenerativeAI } from '@google/generative-ai'

export interface PartIdentification {
  name: string
  category: string
  oemReference: string | null
  vehicleCompatibility: string | null
  suggestedPrice: number | null
  confidence: number
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
const QUOTA_ALERT_THRESHOLD = parseFloat(process.env.GEMINI_QUOTA_ALERT_THRESHOLD ?? '0.8')

let genAIInstance: GoogleGenerativeAI | null = null
let callCount = 0
let quotaAlerted = false

const PROMPT = `Analyze this auto part image from an Ivory Coast (Côte d'Ivoire) marketplace.
Return ONLY a valid JSON object with these fields:
{
  "name": "Part name in French",
  "category": "One of: Filtration, Freinage, Suspension, Moteur, Transmission, Electricité, Carrosserie, Echappement, Refroidissement, Autre",
  "oemReference": "OEM reference if visible on the part, null otherwise",
  "vehicleCompatibility": "Suggested vehicle compatibility if identifiable (e.g. 'Toyota Hilux 2005-2015'), null otherwise",
  "suggestedPrice": "Estimated price in FCFA for Abidjan market, null if unknown",
  "confidence": "Number between 0 and 1 indicating identification confidence"
}
Only return valid JSON, no markdown, no other text.`

export async function identifyPart(
  imageBuffer: Buffer,
  mimeType: string,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
): Promise<PartIdentification | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger?.warn({ event: 'GEMINI_NOT_CONFIGURED' }, 'Gemini API key not configured — skipping AI identification')
    return null
  }

  callCount++

  // Quota alert (rough estimate — real quota tracking is per-project in Google Cloud)
  if (!quotaAlerted && callCount > 100 * QUOTA_ALERT_THRESHOLD) {
    quotaAlerted = true
    logger?.warn(
      { event: 'GEMINI_QUOTA_ALERT', callCount, threshold: QUOTA_ALERT_THRESHOLD },
      `Gemini API usage at ${Math.round(QUOTA_ALERT_THRESHOLD * 100)}% of estimated quota`,
    )
  }

  try {
    if (!genAIInstance) genAIInstance = new GoogleGenerativeAI(apiKey)
    const model = genAIInstance.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ])

    const text = result.response.text().trim()
    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(jsonText)

    return {
      name: parsed.name ?? 'Pièce non identifiée',
      category: parsed.category ?? 'Autre',
      oemReference: parsed.oemReference ?? null,
      vehicleCompatibility: parsed.vehicleCompatibility ?? null,
      suggestedPrice: typeof parsed.suggestedPrice === 'number' ? parsed.suggestedPrice : null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    }
  } catch {
    logger?.warn({ event: 'GEMINI_API_FAILED', callCount }, 'Gemini Flash API error — fallback to manual')
    return null
  }
}
