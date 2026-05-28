export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' | 'LPG' | 'CNG' | 'OTHER'

const HP_TO_KW = 0.7355

export interface ParsedTrim {
  displacementCc: number | null
  fuelType: FuelType | null
  powerKw: number | null
  /** Original trim_name preserved verbatim. */
  code: string
}

export interface ParsedSeries {
  yearStart: number | null
  yearEnd: number | null
  /** Variant prefix (everything before the date paren), e.g. "II (B7) SW". */
  code: string | null
}

/**
 * Parse a global-auto trim label such as:
 *   "2.0 Blue HDi S&S 136 cv"
 *   "1.6 THP EAT6 S&S 165 cv Boite auto"
 *   "Entreprise 1.6 HDi FAP 92cv Véhicule commercial"
 *   "E-C4 136 cv"
 *
 * Best-effort: leaves a field null if it can't be extracted with high confidence.
 */
export function parseTrim(trimName: string): ParsedTrim {
  const out: ParsedTrim = { displacementCc: null, fuelType: null, powerKw: null, code: trimName }
  const normalized = trimName.replace(/\s+/g, ' ').trim()

  // Displacement: decimal liters like "2.0", "1.6", "1.2" or "1.6VTi" (compact).
  const dispMatch = normalized.match(/(?:^|\s)(\d)\.(\d)(?=[A-Za-z\s])/)
  if (dispMatch) {
    const liters = Number(dispMatch[1]) + Number(dispMatch[2]) / 10
    out.displacementCc = Math.round(liters * 1000)
  }

  // Horsepower: "136 cv", "92cv", "150Cv", "109 CV" — first hp number wins.
  const hpMatch = normalized.match(/(\d{2,4})\s*(?:cv|CV|Cv|ch|CH)\b/)
  if (hpMatch) {
    const hp = Number(hpMatch[1])
    if (hp >= 30 && hp <= 1500) {
      out.powerKw = Math.round(hp * HP_TO_KW)
    }
  }

  out.fuelType = inferFuelType(normalized)

  return out
}

function inferFuelType(s: string): FuelType | null {
  const low = s.toLowerCase()
  if (low.includes('hybrid')) return 'HYBRID'
  if (/\b(electric|électrique|e-c\d|ev\b)/i.test(s)) return 'ELECTRIC'
  if (low.includes('gpl') || low.includes('lpg')) return 'LPG'
  if (low.includes('cng') || low.includes('gnv')) return 'CNG'
  if (low.includes('bioflex') || low.includes('flexfuel') || low.includes('flex-fuel')) return 'OTHER'
  if (/(hdi|tdi|bluehdi|blue hdi|dci|cdi|crdi|jtd|tdci|d-4d|fdi|e-fdi)\b/i.test(s)) return 'DIESEL'
  if (/\b(thp|tfsi|tsi|puretech|gdi|vvt-i|mpi|fsi)\b/i.test(s)) return 'PETROL'
  // Compact "VTi" without word boundary (e.g. "1.6VTi") + spaced variant.
  if (/(^|[^a-z])vti/i.test(s)) return 'PETROL'
  // Fallback: bare "i 16V" usually petrol; "HDi" already caught above.
  if (/\b(i 16v|16v i)\b/i.test(s)) return 'PETROL'
  return null
}

/**
 * Parse a global-auto series label such as:
 *   "(05/2015 - 04/2018)"
 *   "I Sedan (02/2007 - 12/2010)"
 *   "II (B7) (09/2010 - 06/2018)"
 *   "III (P5) SW (07/2021 - ...)"
 *   "I Berline(09/2010-09/2014)"
 */
export function parseSeries(seriesName: string): ParsedSeries {
  const out: ParsedSeries = { yearStart: null, yearEnd: null, code: null }
  const normalized = seriesName.replace(/\s+/g, ' ').trim()

  // Find the date paren. Tolerates: missing spaces, spaces inside the date,
  // 3+ trailing dots, "Aujourd'hui" / "Today" as open-ended sentinel.
  const dateMatch = normalized.match(
    /\(\s*(\d{2})\s*\/\s*(\d{4})\s*-\s*(?:(\d{2})\s*\/\s*(\d{4})|\.{3,}|Aujourd'?hui|Today)\s*\)/i,
  )
  if (dateMatch) {
    out.yearStart = Number(dateMatch[2])
    if (dateMatch[4]) out.yearEnd = Number(dateMatch[4])
    // Everything before the date paren is the variant code.
    const codeRaw = normalized.slice(0, dateMatch.index).trim()
    if (codeRaw.length > 0) out.code = codeRaw
  } else {
    // No date paren — preserve the whole label as the code (defensive fallback).
    out.code = normalized.length > 0 ? normalized : null
  }

  return out
}
