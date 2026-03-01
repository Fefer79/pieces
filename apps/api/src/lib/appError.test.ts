import { describe, it, expect } from 'vitest'
import { AppError } from './appError.js'

describe('AppError', () => {
  it('creates error with code and status', () => {
    const error = new AppError('ORDER_NOT_FOUND', 404)
    expect(error.code).toBe('ORDER_NOT_FOUND')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('ORDER_NOT_FOUND')
    expect(error.name).toBe('AppError')
    expect(error).toBeInstanceOf(Error)
  })

  it('includes details when provided', () => {
    const error = new AppError('VALIDATION_ERROR', 422, { field: 'phone' })
    expect(error.details).toEqual({ field: 'phone' })
  })

  it('has undefined details when not provided', () => {
    const error = new AppError('AUTH_EXPIRED', 401)
    expect(error.details).toBeUndefined()
  })
})
