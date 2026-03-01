export interface ApiResponse<T> {
  data: T
  meta?: {
    cursor?: string
    total?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    statusCode: number
    details?: Record<string, unknown>
  }
}
