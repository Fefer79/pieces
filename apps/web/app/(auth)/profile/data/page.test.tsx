import { describe, it, expect } from 'vitest'

describe('Data Page', () => {
  it('smoke test - module loads', async () => {
    const mod = await import('./page')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})
