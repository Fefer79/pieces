import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('AUTH_SESSION_SECRET', 'test-session-secret')
vi.stubEnv('WHATSAPP_BUSINESS_NUMBER', '2250700000000')

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

import {
  createLoginCode,
  verifyLoginCode,
  getLoginStatus,
  looksLikeLoginCode,
  normalizeCode,
  _getCodeStore,
} from './whatsappLogin.service.js'
import { verifyPiecesToken } from '../../lib/piecesToken.js'

const PHONE = '+2250700000000'
const SENDER = '2250700000000' // certified WhatsApp sender (no '+')

describe('whatsappLogin.service', () => {
  beforeEach(() => {
    _getCodeStore().clear()
    mockFindUnique.mockReset()
    mockCreate.mockReset()
  })

  describe('looksLikeLoginCode', () => {
    it('matches P-1234 and P1234, case-insensitive', () => {
      expect(looksLikeLoginCode('P-1234')).toBe(true)
      expect(looksLikeLoginCode('p1234')).toBe(true)
      expect(looksLikeLoginCode('  P-4832 ')).toBe(true)
    })
    it('rejects non-codes', () => {
      expect(looksLikeLoginCode('aide')).toBe(false)
      expect(looksLikeLoginCode('recherche plaquette')).toBe(false)
      expect(looksLikeLoginCode('P-12')).toBe(false)
    })
  })

  describe('createLoginCode', () => {
    it('creates a code with a wa.me link and business number', () => {
      const result = createLoginCode(PHONE)
      expect(result.code).toMatch(/^P-\d{4}$/)
      expect(result.businessNumber).toBe('2250700000000')
      expect(result.waLink).toContain('https://wa.me/2250700000000')
      expect(result.waLink).toContain(encodeURIComponent(result.code))
      expect(result.expiresInSec).toBe(300)
    })

    it('is idempotent per phone while a code is still pending', () => {
      const a = createLoginCode(PHONE)
      const b = createLoginCode(PHONE)
      expect(a.code).toBe(b.code)
      expect(_getCodeStore().size).toBe(1)
    })
  })

  describe('verifyLoginCode', () => {
    it('verifies a matching sender and mints a session token for an existing user', async () => {
      mockFindUnique.mockResolvedValue({ id: 'user-1', roles: ['BUYER'], activeContext: 'BUYER' })
      const { code } = createLoginCode(PHONE)

      const result = await verifyLoginCode(code, SENDER)
      expect(result.ok).toBe(true)

      const status = getLoginStatus(code)
      expect(status.status).toBe('verified')
      expect(status.accessToken).toBeDefined()
      expect(verifyPiecesToken(status.accessToken!)?.sub).toBe('user-1')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a BUYER user with a synthetic supabaseId when none exists', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'new-user', roles: ['BUYER'], activeContext: null })
      const { code } = createLoginCode(PHONE)

      const result = await verifyLoginCode(code, SENDER)
      expect(result.ok).toBe(true)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ supabaseId: `wa:${PHONE}`, phone: PHONE, roles: ['BUYER'] }),
        }),
      )
    })

    it('rejects when the sender does not match the claimed phone', async () => {
      const { code } = createLoginCode(PHONE)
      const result = await verifyLoginCode(code, '2250799999999')
      expect(result.ok).toBe(false)
      expect(getLoginStatus(code).status).toBe('pending')
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it('rejects an unknown code', async () => {
      const result = await verifyLoginCode('P-0000', SENDER)
      expect(result.ok).toBe(false)
    })
  })

  describe('getLoginStatus', () => {
    it('reports pending before verification', () => {
      const { code } = createLoginCode(PHONE)
      expect(getLoginStatus(code).status).toBe('pending')
    })

    it('reports expired for unknown codes', () => {
      expect(getLoginStatus('P-9999').status).toBe('expired')
    })

    it('is one-shot: the token is only returned once', async () => {
      mockFindUnique.mockResolvedValue({ id: 'user-1', roles: ['BUYER'], activeContext: 'BUYER' })
      const { code } = createLoginCode(PHONE)
      await verifyLoginCode(code, SENDER)

      const first = getLoginStatus(code)
      expect(first.status).toBe('verified')
      expect(first.accessToken).toBeDefined()

      const second = getLoginStatus(code)
      expect(second.status).toBe('expired')
    })

    it('accepts the code in normalized or display form', async () => {
      mockFindUnique.mockResolvedValue({ id: 'user-1', roles: ['BUYER'], activeContext: 'BUYER' })
      const { code } = createLoginCode(PHONE) // e.g. "P-4832"
      await verifyLoginCode(normalizeCode(code), SENDER) // verify with "P4832"
      expect(getLoginStatus(code).status).toBe('verified')
    })
  })
})
