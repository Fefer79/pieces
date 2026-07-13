import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { signPiecesToken } from '../../lib/piecesToken.js'
import type { Role } from 'shared/types'

// ---------------------------------------------------------------------------
// WhatsApp reverse-OTP login.
//
// Free at any volume: the user opens the conversation (user-initiated messages
// are free and unlimited on Meta since Nov 2024) and we reply inside the 24 h
// window (also free). Flow:
//   1. /login → user enters phone → createLoginCode() mints "P-4832" (TTL 5 min)
//   2. user taps wa.me/<business>?text=P-4832 and sends it
//   3. webhook receives the message → verifyLoginCode(code, sender). Meta
//      certifies the sender, so a matching sender proves phone possession.
//   4. front polls getLoginStatus(code) → on 'verified', receives a
//      Pièces session token (see lib/piecesToken.ts).
//
// Codes live in-memory (single-instance pilot, consistent with the WhatsApp bot
// session store). Phone numbers are never logged.
// ---------------------------------------------------------------------------

export const LOGIN_CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export type LoginCodeStatus = 'pending' | 'verified'

interface VerifiedUser {
  id: string
  roles: Role[]
  activeContext: Role | null
}

interface LoginCodeEntry {
  phone: string // canonical +225… form
  status: LoginCodeStatus
  expiresAt: number
  accessToken?: string
  user?: VerifiedUser
}

// Keyed by normalized code (e.g. "P4832").
const codes = new Map<string, LoginCodeEntry>()

// Exposed for tests.
export function _getCodeStore() {
  return codes
}

/** Normalize any user/webhook-supplied code to the canonical store key. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Format a stored code for display / prefill (e.g. "P4832" → "P-4832"). */
function displayCode(normalized: string): string {
  return `${normalized.slice(0, 1)}-${normalized.slice(1)}`
}

function prune() {
  const now = Date.now()
  for (const [key, entry] of codes) {
    if (entry.expiresAt < now) codes.delete(key)
  }
}

/** WhatsApp business number (digits only, e.g. "2250700000000"). */
export function getBusinessNumber(): string | null {
  return process.env.WHATSAPP_BUSINESS_NUMBER ?? null
}

function findActiveCodeForPhone(phone: string): string | null {
  const now = Date.now()
  for (const [key, entry] of codes) {
    if (entry.phone === phone && entry.status === 'pending' && entry.expiresAt >= now) {
      return key
    }
  }
  return null
}

export interface CreateLoginCodeResult {
  code: string // display form, e.g. "P-4832"
  businessNumber: string | null
  waLink: string | null
  expiresInSec: number
}

/**
 * Create (or reuse) a pending login code for a phone. Reusing an existing
 * pending code makes the endpoint idempotent and throttles per-phone flooding.
 */
export function createLoginCode(phone: string): CreateLoginCodeResult {
  prune()

  let key = findActiveCodeForPhone(phone)
  if (!key) {
    // Generate a unique 4-digit code that is not currently active.
    do {
      key = `P${crypto.randomInt(1000, 10000)}`
    } while (codes.has(key))
    codes.set(key, {
      phone,
      status: 'pending',
      expiresAt: Date.now() + LOGIN_CODE_TTL_MS,
    })
  }

  const display = displayCode(key)
  const businessNumber = getBusinessNumber()
  const waLink = businessNumber
    ? `https://wa.me/${businessNumber}?text=${encodeURIComponent(display)}`
    : null

  return {
    code: display,
    businessNumber,
    waLink,
    expiresInSec: Math.round(LOGIN_CODE_TTL_MS / 1000),
  }
}

/** True if a text looks like a login code (cheap gate before store lookup). */
export function looksLikeLoginCode(text: string): boolean {
  return /^P-?\d{4}$/i.test(text.trim())
}

/** True if the store currently holds a pending code matching this text. */
export function hasPendingCode(text: string): boolean {
  prune()
  const entry = codes.get(normalizeCode(text))
  return !!entry && entry.status === 'pending'
}

export interface VerifyLoginCodeResult {
  ok: boolean
  phone?: string
}

/**
 * Verify an incoming WhatsApp message against a pending code.
 * `sender` is the Meta-certified sender (digits only, no '+').
 * On success the code flips to 'verified' and carries a fresh session token.
 */
export async function verifyLoginCode(rawCode: string, sender: string): Promise<VerifyLoginCodeResult> {
  prune()
  const key = normalizeCode(rawCode)
  const entry = codes.get(key)
  if (!entry || entry.status !== 'pending') return { ok: false }

  // Possession proof: the certified sender must match the claimed phone.
  if (`+${sender}` !== entry.phone) return { ok: false }

  const user = await upsertLoginUser(entry.phone)
  entry.status = 'verified'
  entry.accessToken = signPiecesToken(user.id)
  entry.user = { id: user.id, roles: user.roles as Role[], activeContext: (user.activeContext as Role) ?? null }

  return { ok: true, phone: entry.phone }
}

async function upsertLoginUser(phone: string) {
  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, roles: true, activeContext: true },
  })
  if (existing) return existing

  return prisma.user.create({
    // WhatsApp-only accounts have no Supabase identity; use a deterministic
    // synthetic supabaseId so re-login resolves the same row.
    data: { supabaseId: `wa:${phone}`, phone, roles: ['BUYER'] },
    select: { id: true, roles: true, activeContext: true },
  })
}

export interface LoginStatusResult {
  status: 'pending' | 'verified' | 'expired'
  accessToken?: string
  user?: VerifiedUser
}

/**
 * Poll a login code. On 'verified' the token is returned once and the code is
 * consumed (one-shot). Unknown/expired codes report 'expired' (no enumeration).
 */
export function getLoginStatus(rawCode: string): LoginStatusResult {
  prune()
  const key = normalizeCode(rawCode)
  const entry = codes.get(key)
  if (!entry) return { status: 'expired' }
  if (entry.status === 'pending') return { status: 'pending' }

  // Verified — hand over the token once, then consume the code.
  codes.delete(key)
  return { status: 'verified', accessToken: entry.accessToken, user: entry.user }
}
