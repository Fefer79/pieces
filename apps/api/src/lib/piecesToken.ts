import crypto from 'node:crypto'
import { AppError } from './appError.js'

// ---------------------------------------------------------------------------
// Pièces-native session tokens (HS256 JWT, dependency-free via node:crypto).
//
// Used by the WhatsApp reverse-OTP login: once a user proves possession of
// their phone by messaging the business number, we mint one of these tokens.
// `requireAuth` recognises them by the `iss: 'pieces-wa'` claim and resolves
// the user directly from Prisma, bypassing Supabase (the whole point of the
// reverse-OTP flow is to avoid paid Supabase SMS).
//
// Signing secret falls back to SUPABASE_SERVICE_ROLE_KEY so existing deploys
// need no new configuration, but AUTH_SESSION_SECRET can override it.
// ---------------------------------------------------------------------------

export const PIECES_TOKEN_ISSUER = 'pieces-wa'
const TOKEN_TTL_SEC = 30 * 24 * 60 * 60 // 30 days

export interface PiecesTokenPayload {
  sub: string // Prisma user id
  iss: string
  iat: number
  exp: number
}

function getSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new AppError('SESSION_SECRET_MISSING', 500, {
      message: 'AUTH_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY required to sign session tokens',
    })
  }
  return secret
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(signingInput: string): string {
  return crypto.createHmac('sha256', getSecret()).update(signingInput).digest('base64url')
}

/** Mint a Pièces session token for a Prisma user id. */
export function signPiecesToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ sub: userId, iss: PIECES_TOKEN_ISSUER, iat: now, exp: now + TOKEN_TTL_SEC }),
  )
  const signingInput = `${header}.${payload}`
  return `${signingInput}.${sign(signingInput)}`
}

/**
 * Verify a token and return its payload, or null if it is not a valid,
 * unexpired Pièces token (wrong issuer, bad signature, malformed, expired).
 * Never throws — callers fall through to the Supabase path on null.
 */
export function verifyPiecesToken(token: string): PiecesTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  if (!header || !payload || !signature) return null

  const expected = sign(`${header}.${payload}`)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null

  let decoded: PiecesTokenPayload
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PiecesTokenPayload
  } catch {
    return null
  }

  if (decoded.iss !== PIECES_TOKEN_ISSUER || !decoded.sub) return null
  if (typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) return null

  return decoded
}

/** True if the token looks like a Pièces token (cheap pre-check before Supabase). */
export function isPiecesToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { iss?: string }
    return payload.iss === PIECES_TOKEN_ISSUER
  } catch {
    return false
  }
}
