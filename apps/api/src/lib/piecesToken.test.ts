import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('AUTH_SESSION_SECRET', 'test-session-secret')

import { signPiecesToken, verifyPiecesToken, isPiecesToken, PIECES_TOKEN_ISSUER } from './piecesToken.js'

describe('piecesToken', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('signs and verifies a round-trip token', () => {
    const token = signPiecesToken('user-123')
    const payload = verifyPiecesToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-123')
    expect(payload?.iss).toBe(PIECES_TOKEN_ISSUER)
  })

  it('recognizes its own tokens via isPiecesToken', () => {
    const token = signPiecesToken('user-123')
    expect(isPiecesToken(token)).toBe(true)
  })

  it('rejects a token signed with a different secret', () => {
    const token = signPiecesToken('user-123')
    vi.stubEnv('AUTH_SESSION_SECRET', 'a-different-secret')
    expect(verifyPiecesToken(token)).toBeNull()
    vi.stubEnv('AUTH_SESSION_SECRET', 'test-session-secret')
  })

  it('rejects a tampered payload', () => {
    const token = signPiecesToken('user-123')
    const [header, , signature] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'attacker', iss: PIECES_TOKEN_ISSUER, iat: 1, exp: 9999999999 })).toString('base64url')
    expect(verifyPiecesToken(`${header}.${forged}.${signature}`)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signPiecesToken('user-123')
    // Advance clock past the 30-day TTL.
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000)
    expect(verifyPiecesToken(token)).toBeNull()
    vi.useRealTimers()
  })

  it('is not fooled by a non-Pièces JWT shape', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ iss: 'supabase', sub: 'x' })).toString('base64url')
    const fake = `${header}.${payload}.sig`
    expect(isPiecesToken(fake)).toBe(false)
    expect(verifyPiecesToken(fake)).toBeNull()
  })

  it('returns false from isPiecesToken for opaque (non-JWT) tokens', () => {
    expect(isPiecesToken('opaque-supabase-access-token')).toBe(false)
  })
})
