export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(code)
    this.name = 'AppError'
  }
}
