import { describe, it, expect } from 'vitest'
import { parseTrim, parseSeries } from './global-auto.ts'

describe('parseTrim', () => {
  it('extracts displacement, power, and fuel from a typical Blue HDi label', () => {
    const r = parseTrim('2.0 Blue HDi S&S 136 cv')
    expect(r.displacementCc).toBe(2000)
    expect(r.powerKw).toBe(100) // 136 * 0.7355 ≈ 100
    expect(r.fuelType).toBe('DIESEL')
    expect(r.code).toBe('2.0 Blue HDi S&S 136 cv')
  })

  it('handles attached cv suffix (no space)', () => {
    const r = parseTrim('1.6 HDi FAP 92cv')
    expect(r.displacementCc).toBe(1600)
    expect(r.powerKw).toBe(68)
    expect(r.fuelType).toBe('DIESEL')
  })

  it('handles mixed-case Cv', () => {
    const r = parseTrim('2.0 BlueHDi S&S 150Cv')
    expect(r.powerKw).toBe(110)
    expect(r.fuelType).toBe('DIESEL')
  })

  it('detects THP petrol', () => {
    const r = parseTrim('1.6 THP S&S 211 cv')
    expect(r.displacementCc).toBe(1600)
    expect(r.fuelType).toBe('PETROL')
  })

  it('detects VTi petrol', () => {
    expect(parseTrim('1.6 VTi 16V 120 cv').fuelType).toBe('PETROL')
  })

  it('detects hybrid', () => {
    const r = parseTrim('2.0 Blue HDi 200 Hybrid4 4x4 ETG6 S&S 163 cv Boite auto')
    expect(r.fuelType).toBe('HYBRID')
  })

  it('detects electric from E-C4 prefix', () => {
    expect(parseTrim('E-C4 136 cv').fuelType).toBe('ELECTRIC')
  })

  it('detects GPL as LPG', () => {
    expect(parseTrim('1.6 VTi 16V GPL 120 cv').fuelType).toBe('LPG')
  })

  it('leaves fields null when unrecognized', () => {
    const r = parseTrim('Mystery trim XYZ')
    expect(r.displacementCc).toBeNull()
    expect(r.powerKw).toBeNull()
    expect(r.fuelType).toBeNull()
    expect(r.code).toBe('Mystery trim XYZ')
  })

  it('preserves the original code verbatim even when parsing succeeds', () => {
    const original = '1.6 BlueHDi EAT6 S&S 115Cv Boîte auto'
    expect(parseTrim(original).code).toBe(original)
  })

  it('handles Entreprise commercial prefix', () => {
    const r = parseTrim('Entreprise 1.6 HDi FAP 92cv Véhicule commercial')
    expect(r.displacementCc).toBe(1600)
    expect(r.powerKw).toBe(68)
    expect(r.fuelType).toBe('DIESEL')
  })
})

describe('parseSeries', () => {
  it('extracts year range from a date-only label', () => {
    const r = parseSeries('(05/2015 - 04/2018)')
    expect(r.yearStart).toBe(2015)
    expect(r.yearEnd).toBe(2018)
    expect(r.code).toBeNull()
  })

  it('extracts variant code + year range', () => {
    const r = parseSeries('II (B7) (09/2010 - 06/2018)')
    expect(r.yearStart).toBe(2010)
    expect(r.yearEnd).toBe(2018)
    expect(r.code).toBe('II (B7)')
  })

  it('handles open-ended end date', () => {
    const r = parseSeries('III (P5) SW (07/2021 - ...)')
    expect(r.yearStart).toBe(2021)
    expect(r.yearEnd).toBeNull()
    expect(r.code).toBe('III (P5) SW')
  })

  it('handles compact format without spaces', () => {
    const r = parseSeries('I Berline(09/2010-09/2014)')
    expect(r.yearStart).toBe(2010)
    expect(r.yearEnd).toBe(2014)
    expect(r.code).toBe('I Berline')
  })

  it('falls back to whole label as code when no date paren', () => {
    const r = parseSeries('Some weird series label')
    expect(r.yearStart).toBeNull()
    expect(r.yearEnd).toBeNull()
    expect(r.code).toBe('Some weird series label')
  })

  it('handles Sedan variant', () => {
    const r = parseSeries('I Sedan (02/2007 - 12/2010)')
    expect(r.yearStart).toBe(2007)
    expect(r.yearEnd).toBe(2010)
    expect(r.code).toBe('I Sedan')
  })
})
