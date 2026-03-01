import { describe, it, expect } from 'vitest'

describe('Web App', () => {
  it('smoke test - module loads', async () => {
    // Verify the page component can be imported
    const mod = await import('./page')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})
