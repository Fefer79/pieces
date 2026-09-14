import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const { fetchNhtsa, fetchFreeVinDecoder, clearVinCache } = await import('./vin.sources.js')

const originalFetch = globalThis.fetch

/** Fiche freevindecoder réduite à ce que le parseur lit. */
function freeVinHtml(rows: Record<string, string>): string {
  const body = Object.entries(rows)
    .map(
      ([label, value]) => `
        <tr>
          <td class="info-left">${label}</td>
          <td class="info-right">  ${value} </td>
        </tr>`,
    )
    .join('')
  return `<div class="general-information"><table><tbody>${body}</tbody></table></div>`
}

function htmlResponse(html: string, init: { status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: { get: (name: string) => init.headers?.[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(html),
  }
}

beforeEach(() => {
  clearVinCache()
  vi.clearAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchNhtsa', () => {
  it('reads make, model, year, displacement and fuel', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          Results: [
            { Make: 'TOYOTA', Model: 'Prius', ModelYear: '2010', DisplacementL: '1.8', FuelTypePrimary: 'Gasoline' },
          ],
        }),
    })

    const facts = await fetchNhtsa('JTDKN3DU5A0123456', 2010)

    expect(facts).toMatchObject({ make: 'TOYOTA', model: 'Prius', year: 2010, displacement: '1.8', fuel: 'Gasoline' })
  })

  it('passes the year hint, which fixes most non-US decodes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ Results: [{}] }) })
    globalThis.fetch = fetchMock

    await fetchNhtsa('VF3CUHMZ6HY123456', 2017)

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('modelyear=2017')
  })

  it('returns empty facts instead of throwing when the service is down', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))

    const facts = await fetchNhtsa('JTDKN3DU5A0123456', 2010)

    expect(facts.make).toBeNull()
  })

  it('serves a repeated VIN from cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ Results: [{ Make: 'TOYOTA' }] }),
    })
    globalThis.fetch = fetchMock

    await fetchNhtsa('JTDKN3DU5A0123456', 2010)
    await fetchNhtsa('JTDKN3DU5A0123456', 2010)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('fetchFreeVinDecoder', () => {
  it('reads the General information table', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      htmlResponse(
        freeVinHtml({
          Make: '<a href="/make/volkswagen">Volkswagen</a>',
          Model: 'Golf',
          'Model year': '2010',
          'Engine type': '1.8L L4 DOHC 16V FWD',
        }),
      ),
    )

    const facts = await fetchFreeVinDecoder('WVWZZZ1KZAW123456')

    expect(facts).toMatchObject({
      make: 'Volkswagen',
      model: 'Golf',
      year: 2010,
      engine: '1.8L L4 DOHC 16V FWD',
    })
  })

  it('returns null when the site does not recognize the VIN', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(htmlResponse('<p>Vehicle not detected</p>'))

    expect(await fetchFreeVinDecoder('ZZZ1234567AB12345')).toBeNull()
  })

  // 10 requêtes/minute par IP, et l'API sort par une seule IP Render.
  it('stops calling once the per-minute budget is spent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(freeVinHtml({ Make: 'Volkswagen', Model: 'Golf' })))
    globalThis.fetch = fetchMock

    for (let i = 0; i < 12; i += 1) {
      await fetchFreeVinDecoder(`WVWZZZ1KZAW12345${i}`)
    }

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(8)
  })

  it('honours retry-after and stops calling during the cooldown', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse('', { status: 429, headers: { 'retry-after': '58' } }))
    globalThis.fetch = fetchMock

    expect(await fetchFreeVinDecoder('WVWZZZ1KZAW123456')).toBeNull()
    expect(await fetchFreeVinDecoder('WVWZZZ1KZAW123457')).toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never lets a network failure bubble up', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))

    expect(await fetchFreeVinDecoder('WVWZZZ1KZAW123456')).toBeNull()
  })
})
