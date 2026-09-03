import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const mockKycUpsert = vi.fn()
const mockKycFindUnique = vi.fn()
const mockUploadToR2 = vi.fn()
const mockDownloadFromR2 = vi.fn()

vi.mock('./prisma.js', () => ({
  prisma: {
    vendorKyc: {
      upsert: (...a: unknown[]) => mockKycUpsert(...a),
      findUnique: (...a: unknown[]) => mockKycFindUnique(...a),
    },
  },
}))
vi.mock('./r2.js', () => ({
  uploadToR2: (...a: unknown[]) => mockUploadToR2(...a),
  downloadFromR2: (...a: unknown[]) => mockDownloadFromR2(...a),
}))

const { storeKycPhoto, readKycPhoto } = await import('./kycPhoto.js')

beforeEach(() => {
  vi.clearAllMocks()
  mockUploadToR2.mockResolvedValue('https://cdn/ignored')
})

describe('storeKycPhoto', () => {
  it('crée la fiche KYC sans numéro : la photo suffit pour un informel', async () => {
    const res = await storeKycPhoto('vendor-1', 'INFORMAL', Buffer.from('jpeg'), 'image/jpeg')

    expect(res.kycType).toBe('CNI')
    expect(mockUploadToR2).toHaveBeenCalledWith(
      expect.stringMatching(/^kyc\/vendor-1\/\d+-[0-9a-f]{16}\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    const call = mockKycUpsert.mock.calls[0][0]
    expect(call.where).toEqual({ vendorId: 'vendor-1' })
    expect(call.create).toMatchObject({ kycType: 'CNI', isPublic: false })
    expect(call.create.documentNumber).toBeUndefined()
    // Une nouvelle photo ne touche ni au numéro déjà relevé ni au type.
    expect(Object.keys(call.update).sort()).toEqual([
      'documentImageAt',
      'documentImageKey',
      'documentImageMimeType',
    ])
  })

  it('classe la photo d’un vendeur formel en RCCM', async () => {
    const res = await storeKycPhoto('vendor-2', 'FORMAL', Buffer.from('pdf'), 'application/pdf')
    expect(res.kycType).toBe('RCCM')
  })

  it('refuse un format non pris en charge', async () => {
    await expect(
      storeKycPhoto('vendor-1', 'INFORMAL', Buffer.from('x'), 'image/heic'),
    ).rejects.toMatchObject({ code: 'KYC_PHOTO_INVALID_TYPE', statusCode: 422 })
    expect(mockUploadToR2).not.toHaveBeenCalled()
  })

  it('refuse un fichier vide', async () => {
    await expect(
      storeKycPhoto('vendor-1', 'INFORMAL', Buffer.alloc(0), 'image/jpeg'),
    ).rejects.toMatchObject({ code: 'KYC_PHOTO_EMPTY' })
  })

  it('refuse un document au-delà de 8 MB', async () => {
    await expect(
      storeKycPhoto('vendor-1', 'INFORMAL', Buffer.alloc(8 * 1024 * 1024 + 1), 'image/jpeg'),
    ).rejects.toMatchObject({ code: 'KYC_PHOTO_TOO_LARGE' })
  })
})

describe('readKycPhoto', () => {
  it('404 quand aucune photo n’est enregistrée', async () => {
    mockKycFindUnique.mockResolvedValue({ documentImageKey: null, documentImageMimeType: null })
    await expect(readKycPhoto('vendor-1')).rejects.toMatchObject({
      code: 'KYC_PHOTO_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('renvoie le document et son type', async () => {
    mockKycFindUnique.mockResolvedValue({
      documentImageKey: 'kyc/vendor-1/1.jpg',
      documentImageMimeType: 'image/jpeg',
    })
    mockDownloadFromR2.mockResolvedValue(Buffer.from('bytes'))
    const res = await readKycPhoto('vendor-1')
    expect(res.mimeType).toBe('image/jpeg')
    expect(mockDownloadFromR2).toHaveBeenCalledWith('kyc/vendor-1/1.jpg')
  })
})
