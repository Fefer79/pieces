import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../auth/whatsappLogin.service.js', () => ({
  looksLikeLoginCode: (text: string) => /^P-?\d{4}$/i.test(text.trim()),
  verifyLoginCode: vi.fn(),
}))

import { verifyLoginCode } from '../auth/whatsappLogin.service.js'
import {
  extractSenderPhone,
  extractMessageText,
  handleBaileysMessage,
} from './baileys.messages.js'

const mockVerify = vi.mocked(verifyLoginCode)

describe('extractSenderPhone', () => {
  it('extrait le numéro d’un jid direct', () => {
    expect(extractSenderPhone({ remoteJid: '2250700000001@s.whatsapp.net' })).toBe('2250700000001')
  })

  it('retire le suffixe device du jid', () => {
    expect(extractSenderPhone({ remoteJid: '2250700000001:12@s.whatsapp.net' })).toBe('2250700000001')
  })

  it('retombe sur remoteJidAlt quand le jid principal est un LID', () => {
    expect(
      extractSenderPhone({ remoteJid: '123456789@lid', remoteJidAlt: '2250700000001@s.whatsapp.net' }),
    ).toBe('2250700000001')
  })

  it('retourne null pour un groupe, un broadcast ou un LID sans alt', () => {
    expect(extractSenderPhone({ remoteJid: '12036302@g.us' })).toBeNull()
    expect(extractSenderPhone({ remoteJid: 'status@broadcast' })).toBeNull()
    expect(extractSenderPhone({ remoteJid: '123456789@lid' })).toBeNull()
    expect(extractSenderPhone(null)).toBeNull()
  })
})

describe('extractMessageText', () => {
  it('lit conversation et extendedTextMessage', () => {
    expect(extractMessageText({ conversation: 'P-4832' })).toBe('P-4832')
    expect(extractMessageText({ extendedTextMessage: { text: 'P-4832' } })).toBe('P-4832')
  })

  it('déballe les messages éphémères', () => {
    expect(extractMessageText({ ephemeralMessage: { message: { conversation: 'P-4832' } } })).toBe('P-4832')
  })

  it('retourne null sans contenu texte', () => {
    expect(extractMessageText(null)).toBeNull()
    expect(extractMessageText({})).toBeNull()
  })
})

describe('handleBaileysMessage', () => {
  const sendText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const key = { remoteJid: '2250700000001@s.whatsapp.net', fromMe: false }

  it('vérifie un code valide et confirme au sender', async () => {
    mockVerify.mockResolvedValue({ ok: true, phone: '+2250700000001' })

    const result = await handleBaileysMessage({ key, message: { conversation: 'P-4832' } }, sendText)

    expect(result).toBe('verified')
    expect(mockVerify).toHaveBeenCalledWith('P-4832', '2250700000001')
    expect(sendText).toHaveBeenCalledWith('2250700000001@s.whatsapp.net', expect.stringContaining('✅'))
  })

  it('répond une erreur pour un code invalide ou expiré', async () => {
    mockVerify.mockResolvedValue({ ok: false })

    const result = await handleBaileysMessage({ key, message: { conversation: 'P-0000' } }, sendText)

    expect(result).toBe('rejected')
    expect(sendText).toHaveBeenCalledWith('2250700000001@s.whatsapp.net', expect.stringContaining('❌'))
  })

  it('vérifie via le numéro certifié remoteJidAlt quand le sender est un LID', async () => {
    mockVerify.mockResolvedValue({ ok: true, phone: '+2250700000001' })

    const result = await handleBaileysMessage(
      {
        key: { remoteJid: '987654@lid', remoteJidAlt: '2250700000001@s.whatsapp.net', fromMe: false },
        message: { conversation: 'P-4832' },
      },
      sendText,
    )

    expect(result).toBe('verified')
    expect(mockVerify).toHaveBeenCalledWith('P-4832', '2250700000001')
    // La réponse repart vers le jid principal (LID), la forme que WhatsApp attend.
    expect(sendText).toHaveBeenCalledWith('987654@lid', expect.stringContaining('✅'))
  })

  it('ignore ses propres messages, les textes hors format et les groupes', async () => {
    await expect(
      handleBaileysMessage({ key: { ...key, fromMe: true }, message: { conversation: 'P-4832' } }, sendText),
    ).resolves.toBe('ignored')
    await expect(
      handleBaileysMessage({ key, message: { conversation: 'bonjour' } }, sendText),
    ).resolves.toBe('ignored')
    await expect(
      handleBaileysMessage(
        { key: { remoteJid: '12036302@g.us', fromMe: false }, message: { conversation: 'P-4832' } },
        sendText,
      ),
    ).resolves.toBe('ignored')

    expect(mockVerify).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })
})
