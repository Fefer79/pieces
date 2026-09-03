import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockInterviewFindUnique = vi.fn()
const mockInterviewCreate = vi.fn()
const mockInterviewFindMany = vi.fn()
const mockInterviewCount = vi.fn()
const mockInterviewUpdate = vi.fn()
const mockVendorContactFindUnique = vi.fn()
const mockVendorContactCreate = vi.fn()
const mockVendorContactUpdate = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockContactActivityCreate = vi.fn()
const mockTransaction = vi.fn()
const mockEnqueue = vi.fn()
const mockUploadToR2 = vi.fn()
const mockDownloadFromR2 = vi.fn()
const mockExtractInterviewAnswers = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    prospectionInterview: {
      findUnique: (...a: unknown[]) => mockInterviewFindUnique(...a),
      create: (...a: unknown[]) => mockInterviewCreate(...a),
      findMany: (...a: unknown[]) => mockInterviewFindMany(...a),
      count: (...a: unknown[]) => mockInterviewCount(...a),
      update: (...a: unknown[]) => mockInterviewUpdate(...a),
    },
    vendorContact: {
      findUnique: (...a: unknown[]) => mockVendorContactFindUnique(...a),
      create: (...a: unknown[]) => mockVendorContactCreate(...a),
      update: (...a: unknown[]) => mockVendorContactUpdate(...a),
    },
    vendor: { findUnique: (...a: unknown[]) => mockVendorFindUnique(...a) },
    contactActivity: { create: (...a: unknown[]) => mockContactActivityCreate(...a) },
    $transaction: (ops: unknown) => mockTransaction(ops),
  },
}))
vi.mock('../../lib/activityLog.js', () => ({ recordActivity: vi.fn() }))
vi.mock('../queue/queueService.js', () => ({ enqueue: (...a: unknown[]) => mockEnqueue(...a) }))
vi.mock('../../lib/r2.js', () => ({
  uploadToR2: (...a: unknown[]) => mockUploadToR2(...a),
  downloadFromR2: (...a: unknown[]) => mockDownloadFromR2(...a),
}))
vi.mock('../../lib/gemini.js', () => ({
  extractInterviewAnswers: (...a: unknown[]) => mockExtractInterviewAnswers(...a),
}))

const {
  createInterview,
  updateInterview,
  applyInterview,
  recordConsent,
  appendTranscript,
  attachAudio,
  requestExtraction,
  runExtraction,
} = await import('./prospection.service.js')

const liaison = { userId: 'user-1', role: 'LIAISON' as const, staff: null }

const baseInterview = {
  id: 'itw-1',
  prospectId: 'prospect-1',
  vendorId: null,
  conductedById: 'user-1',
  status: 'BROUILLON',
  consentGivenAt: null,
  consentMethod: null,
  consentScriptText: null,
  consentGivenById: null,
  audioKey: null,
  audioMimeType: null,
  audioDurationSec: null,
  audioSizeBytes: null,
  transcript: null,
  transcriptSource: null,
  transcriptSegments: null,
  answers: null,
  notes: null,
  startedAt: null,
  endedAt: null,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
  leadName: null,
  leadShopName: null,
  leadPhone: null,
  leadCommune: null,
  prospect: {
    id: 'prospect-1',
    name: 'M. Koné',
    shopName: 'Stand 12',
    phone: '+2250700000000',
    commune: 'Adjamé',
    statut: 'VISITE',
    vendorId: null,
  },
  vendor: null,
  conductedBy: { id: 'user-1', name: 'Awa' },
}

/** Entretien démarré sur un simple nom, sans fiche prospect. */
const leadInterview = {
  ...baseInterview,
  id: 'itw-lead',
  prospectId: null,
  prospect: null,
  leadName: 'M. Koffi',
  leadShopName: 'Auto Pièces Adjamé',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInterviewUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...baseInterview, ...data }),
  )
})

describe('createInterview', () => {
  it('rejette proprement (400) si ni prospect ni vendeur', async () => {
    // `zodToFastify` perd le refine inter-champs : le service doit garder la règle.
    await expect(createInterview(liaison, {})).rejects.toMatchObject({
      code: 'PROSPECTION_TARGET_REQUIRED',
      statusCode: 400,
    })
    expect(mockInterviewCreate).not.toHaveBeenCalled()
  })

  it('démarre sur un simple nom, sans fiche prospect', async () => {
    mockInterviewCreate.mockResolvedValue(leadInterview)
    const res = await createInterview(liaison, {
      leadName: 'M. Koffi',
      leadShopName: 'Auto Pièces Adjamé',
    })
    expect(res.lead).toEqual({
      name: 'M. Koffi',
      shopName: 'Auto Pièces Adjamé',
      phone: null,
      commune: null,
    })
    expect(mockInterviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadName: 'M. Koffi', prospectId: null, vendorId: null }),
      }),
    )
    // Aucune fiche CRM n'est créée à ce stade.
    expect(mockVendorContactCreate).not.toHaveBeenCalled()
  })

  it('ignore le nom libre quand une fiche est rattachée', async () => {
    mockVendorContactFindUnique.mockResolvedValue({ id: 'prospect-1' })
    mockInterviewCreate.mockResolvedValue(baseInterview)
    await createInterview(liaison, { prospectId: 'prospect-1', leadName: 'M. Koffi' })
    expect(mockInterviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadName: null }) }),
    )
  })

  it('rejette un prospect inexistant', async () => {
    mockVendorContactFindUnique.mockResolvedValue(null)
    await expect(createInterview(liaison, { prospectId: 'nope' })).rejects.toMatchObject({
      code: 'PROSPECT_NOT_FOUND',
    })
  })

  it('crée un entretien BROUILLON rattaché au prospect', async () => {
    mockVendorContactFindUnique.mockResolvedValue({ id: 'prospect-1' })
    mockInterviewCreate.mockResolvedValue(baseInterview)
    const res = await createInterview(liaison, { prospectId: 'prospect-1' })
    expect(res.status).toBe('BROUILLON')
    expect(mockInterviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ conductedById: 'user-1', status: 'BROUILLON' }) }),
    )
  })
})

describe('consentement — préalable obligatoire', () => {
  it('bloque la transcription sans consentement', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview })
    await expect(
      appendTranscript(liaison, 'itw-1', { text: 'bonjour', source: 'ios-speech', replace: false }),
    ).rejects.toMatchObject({ code: 'PROSPECTION_CONSENT_REQUIRED', statusCode: 409 })
  })

  it('bloque l’audio sans consentement', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview })
    await expect(
      attachAudio(liaison, 'itw-1', { buffer: Buffer.from('x'), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'PROSPECTION_CONSENT_REQUIRED' })
    expect(mockUploadToR2).not.toHaveBeenCalled()
  })

  it('gèle le texte lu et passe l’entretien EN_COURS', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview })
    const res = await recordConsent(liaison, 'itw-1', {
      method: 'VERBAL',
      scriptText: 'Je vous informe que notre échange est enregistré et transcrit.',
      acknowledged: true,
    })
    expect(res.status).toBe('EN_COURS')
    const data = mockInterviewUpdate.mock.calls[0][0].data
    expect(data.consentGivenAt).toBeInstanceOf(Date)
    expect(data.consentMethod).toBe('VERBAL')
    expect(data.consentScriptText).toContain('enregistré')
  })

  it('refuse un second consentement', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview, consentGivenAt: new Date() })
    await expect(
      recordConsent(liaison, 'itw-1', { method: 'VERBAL', scriptText: 'x'.repeat(20), acknowledged: true }),
    ).rejects.toMatchObject({ code: 'PROSPECTION_CONSENT_ALREADY' })
  })
})

describe('transcription & audio après consentement', () => {
  const consented = { ...baseInterview, consentGivenAt: new Date(), status: 'EN_COURS' }

  it('concatène les fragments de transcription et passe A_TRANSCRIRE', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...consented, transcript: 'Bonjour.' })
    await appendTranscript(liaison, 'itw-1', { text: 'Vous vendez quoi ?', source: 'ios-speech', replace: false })
    const data = mockInterviewUpdate.mock.calls[0][0].data
    expect(data.transcript).toBe('Bonjour.\nVous vendez quoi ?')
    expect(data.status).toBe('A_TRANSCRIRE')
  })

  it('téléverse l’audio sur R2', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...consented })
    mockUploadToR2.mockResolvedValue('https://cdn/x')
    await attachAudio(liaison, 'itw-1', { buffer: Buffer.from('audio-bytes'), mimeType: 'audio/webm' })
    expect(mockUploadToR2).toHaveBeenCalledWith(
      expect.stringMatching(/^prospection\/itw-1\/audio-\d+\.webm$/),
      expect.any(Buffer),
      'audio/webm',
    )
  })
})

describe('extraction IA', () => {
  it('exige une transcription exploitable', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview, consentGivenAt: new Date(), transcript: 'x' })
    await expect(requestExtraction(liaison, 'itw-1')).rejects.toMatchObject({
      code: 'PROSPECTION_TRANSCRIPT_MISSING',
    })
  })

  it('enqueue le job PROSPECTION_EXTRACT', async () => {
    mockInterviewFindUnique.mockResolvedValue({
      ...baseInterview,
      consentGivenAt: new Date(),
      transcript: 'Un entretien assez long pour être exploitable par le modèle.',
    })
    await requestExtraction(liaison, 'itw-1')
    expect(mockEnqueue).toHaveBeenCalledWith('PROSPECTION_EXTRACT', { interviewId: 'itw-1' })
  })

  it('runExtraction ne remplace pas une réponse manuelle', async () => {
    mockInterviewFindUnique.mockResolvedValue({
      ...baseInterview,
      transcript: 'Le vendeur fait du freinage depuis dix ans à Adjamé.',
      answers: { accroche_nom_boutique: { text: 'Stand 12', source: 'MANUEL' } },
    })
    mockExtractInterviewAnswers.mockResolvedValue({
      answers: { accroche_nom_boutique: 'Autre nom', gamme_familles: 'Freinage' },
      summary: 'Vendeur sérieux.',
    })
    await runExtraction('itw-1', { info: vi.fn(), warn: vi.fn() })
    const data = mockInterviewUpdate.mock.calls[0][0].data
    expect(data.answers.accroche_nom_boutique).toEqual({ text: 'Stand 12', source: 'MANUEL' })
    expect(data.answers.gamme_familles).toEqual({ text: 'Freinage', source: 'IA' })
    expect(data.status).toBe('TRANSCRIT')
  })
})

describe('clôture — de l’entretien au vendeur', () => {
  it('exige un téléphone pour créer la fiche d’un prospect saisi au vol', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...leadInterview })
    await expect(applyInterview(liaison, 'itw-lead', { overwrite: false })).rejects.toMatchObject({
      code: 'PROSPECTION_LEAD_PHONE_REQUIRED',
      statusCode: 409,
    })
    expect(mockVendorContactCreate).not.toHaveBeenCalled()
  })

  it('crée la fiche prospect à partir du nom saisi au vol et la rattache', async () => {
    mockInterviewFindUnique.mockResolvedValue({
      ...leadInterview,
      leadPhone: '+2250700000000',
      leadCommune: 'Adjamé',
      answers: { gamme_familles: { text: 'Freinage, moteur', source: 'MANUEL' } },
    })
    mockVendorContactCreate.mockResolvedValue({
      id: 'prospect-neuf',
      name: 'M. Koffi',
      shopName: 'Auto Pièces Adjamé',
      commune: 'Adjamé',
      pieces: [],
      remarques: null,
    })

    await applyInterview(liaison, 'itw-lead', { overwrite: false })

    expect(mockVendorContactCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'M. Koffi',
          shopName: 'Auto Pièces Adjamé',
          phone: '+2250700000000',
          statut: 'VISITE',
          source: 'MANUEL',
        }),
      }),
    )
    expect(mockInterviewUpdate).toHaveBeenCalledWith({
      where: { id: 'itw-lead' },
      data: { prospectId: 'prospect-neuf' },
    })
  })

  it('rattache le vendeur créé à l’issue de l’entretien', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...leadInterview })
    mockVendorFindUnique.mockResolvedValue({ id: 'vendor-9' })
    await updateInterview(liaison, 'itw-lead', { vendorId: 'vendor-9' })
    expect(mockInterviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ vendorId: 'vendor-9' }) }),
    )
  })

  it('refuse de rattacher un vendeur inexistant', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...leadInterview })
    mockVendorFindUnique.mockResolvedValue(null)
    await expect(
      updateInterview(liaison, 'itw-lead', { vendorId: 'nope' }),
    ).rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    expect(mockInterviewUpdate).not.toHaveBeenCalled()
  })
})

describe('rattachement du vendeur → fiche prospect', () => {
  it('lie la fiche prospect au vendeur et la passe CONCLU', async () => {
    mockInterviewFindUnique.mockResolvedValue({ ...baseInterview })
    mockVendorFindUnique.mockResolvedValue({ id: 'vendor-9' })
    await updateInterview(liaison, 'itw-1', { vendorId: 'vendor-9' })

    const call = mockVendorContactUpdate.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'prospect-1' })
    expect(call.data).toMatchObject({ vendorId: 'vendor-9', statut: 'CONCLU' })
    expect(call.data.activites.create).toMatchObject({
      type: 'CONVERSION',
      statutAvant: 'VISITE',
      statutApres: 'CONCLU',
    })
  })

  it('ne reconvertit pas une fiche déjà liée à un vendeur', async () => {
    mockInterviewFindUnique.mockResolvedValue({
      ...baseInterview,
      prospect: { ...baseInterview.prospect, vendorId: 'vendor-deja' },
    })
    mockVendorFindUnique.mockResolvedValue({ id: 'vendor-9' })
    await updateInterview(liaison, 'itw-1', { vendorId: 'vendor-9' })
    expect(mockVendorContactUpdate).not.toHaveBeenCalled()
  })
})
