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

export interface OemCompatibility {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  engine: string | null
}

export interface OemLabelExtraction {
  oemReferences: string[]
  partName: string | null
  partBrand: string | null
  compatibilities: OemCompatibility[]
  confidence: number
}

const OEM_LABEL_PROMPT = `You are reading a photo of an auto part label, box or barcode sticker (OEM or aftermarket), taken in a spare parts shop in Côte d'Ivoire.
Extract the text printed on the label (including numbers under barcodes) and use your knowledge of auto part references to identify the part.
Return ONLY a valid JSON object with these fields:
{
  "oemReferences": ["Every part number / OEM reference visible on the label, most prominent first. Keep original formatting (dashes, dots). Empty array if none readable."],
  "partName": "Part name in French if identifiable from the label or the reference (e.g. 'Filtre à huile'), null otherwise",
  "partBrand": "Manufacturer brand printed on the label (e.g. 'Toyota', 'Bosch', 'Denso'), null otherwise",
  "compatibilities": [
    {
      "brand": "Vehicle brand (e.g. 'Toyota')",
      "model": "Vehicle model (e.g. 'Hilux'), null if unknown",
      "yearFrom": 2005,
      "yearTo": 2015,
      "engine": "Engine code or description (e.g. '2.5 D-4D'), null if unknown"
    }
  ],
  "confidence": "Number between 0 and 1: confidence that the references were read correctly"
}
For "compatibilities": list the vehicles this part fits, based on the OEM references you read and your knowledge. Only include vehicles you are reasonably sure about; empty array if the references are unknown to you. yearFrom/yearTo are integers or null.
Only return valid JSON, no markdown, no other text.`

/**
 * Lit une photo d'étiquette / code-barres de pièce : extrait les références
 * OEM et propose les compatibilités véhicule connues pour ces références.
 */
export async function extractOemLabel(
  imageBuffer: Buffer,
  mimeType: string,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
): Promise<OemLabelExtraction | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger?.warn({ event: 'GEMINI_NOT_CONFIGURED' }, 'Gemini API key not configured — skipping OEM label extraction')
    return null
  }

  callCount++

  try {
    if (!genAIInstance) genAIInstance = new GoogleGenerativeAI(apiKey)
    const model = genAIInstance.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent([
      OEM_LABEL_PROMPT,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ])

    const text = result.response.text().trim()
    const jsonText = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(jsonText)

    const toYear = (v: unknown): number | null => {
      const n = typeof v === 'number' ? Math.trunc(v) : Number.parseInt(String(v ?? ''), 10)
      return Number.isFinite(n) && n >= 1950 && n <= 2100 ? n : null
    }
    const toStr = (v: unknown, max: number): string | null => {
      if (typeof v !== 'string') return null
      const t = v.trim().slice(0, max)
      return t.length > 0 ? t : null
    }

    const oemReferences = Array.isArray(parsed.oemReferences)
      ? parsed.oemReferences
          .map((r: unknown) => toStr(r, 80))
          .filter((r: string | null): r is string => r !== null)
          .slice(0, 10)
      : []

    const compatibilities: OemCompatibility[] = Array.isArray(parsed.compatibilities)
      ? parsed.compatibilities
          .map((c: Record<string, unknown>) => {
            const brand = toStr(c?.brand, 60)
            if (!brand) return null
            const yearFrom = toYear(c?.yearFrom)
            const yearTo = toYear(c?.yearTo)
            return {
              brand,
              model: toStr(c?.model, 80),
              yearFrom,
              yearTo: yearFrom != null && yearTo != null && yearTo < yearFrom ? null : yearTo,
              engine: toStr(c?.engine, 60),
            }
          })
          .filter((c: OemCompatibility | null): c is OemCompatibility => c !== null)
          .slice(0, 20)
      : []

    return {
      oemReferences,
      partName: toStr(parsed.partName, 120),
      partBrand: toStr(parsed.partBrand, 60),
      compatibilities,
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    }
  } catch {
    logger?.warn({ event: 'GEMINI_OEM_LABEL_FAILED', callCount }, 'Gemini Flash API error — OEM label extraction failed')
    return null
  }
}

export interface InterviewAnswerExtraction {
  /** questionId → réponse en français (extraite ou synthétisée). Clé absente si non abordée. */
  answers: Record<string, string>
  /** Résumé libre de l'entretien, 3–4 phrases, ou null. */
  summary: string | null
}

/**
 * Lit la transcription d'un entretien de démarchage vendeur et en extrait les
 * réponses aux questions de la « bible du démarcheur ». Le transcript vient du
 * moteur de dictée du terminal ; il peut être bruité, non ponctué, en français
 * ivoirien parlé.
 */
export async function extractInterviewAnswers(
  transcript: string,
  questions: ReadonlyArray<{ id: string; label: string }>,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
): Promise<InterviewAnswerExtraction | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger?.warn(
      { event: 'GEMINI_NOT_CONFIGURED' },
      'Gemini API key not configured — skipping interview answer extraction',
    )
    return null
  }

  const trimmed = transcript.trim()
  if (trimmed.length < 20) return { answers: {}, summary: null }

  callCount++

  const questionsBlock = questions.map((q) => `- ${q.id}: ${q.label}`).join('\n')
  const prompt = `Tu analyses la transcription d'un entretien de démarchage entre un commercial de la marketplace "Pièces" (pièces auto d'occasion à Abidjan) et un vendeur de pièces.
La transcription est brute : dictée automatique, français parlé ivoirien, ponctuation approximative, coupures.

Voici les questions de la trame d'entretien (identifiant: question) :
${questionsBlock}

Transcription :
"""
${trimmed.slice(0, 24000)}
"""

Renvoie UNIQUEMENT un objet JSON valide :
{
  "answers": {
    "<identifiant de question>": "La réponse du vendeur, en français clair, extraite ou synthétisée depuis la transcription. N'inclure la clé QUE si le sujet a réellement été abordé. Ne rien inventer."
  },
  "summary": "Résumé de l'entretien en 3 à 4 phrases : qui est le vendeur, son intérêt, les points bloquants, la prochaine étape. null si la transcription est inexploitable."
}
Pas de markdown, pas de texte hors du JSON.`

  try {
    if (!genAIInstance) genAIInstance = new GoogleGenerativeAI(apiKey)
    const model = genAIInstance.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonText = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(jsonText)

    const validIds = new Set(questions.map((q) => q.id))
    const answers: Record<string, string> = {}
    if (parsed.answers && typeof parsed.answers === 'object') {
      for (const [key, value] of Object.entries(parsed.answers)) {
        if (!validIds.has(key)) continue
        if (typeof value !== 'string') continue
        const t = value.trim().slice(0, 4000)
        if (t.length > 0) answers[key] = t
      }
    }

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim().slice(0, 4000)
        : null

    return { answers, summary }
  } catch {
    logger?.warn(
      { event: 'GEMINI_INTERVIEW_EXTRACT_FAILED', callCount },
      'Gemini Flash API error — interview answer extraction failed',
    )
    return null
  }
}

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
