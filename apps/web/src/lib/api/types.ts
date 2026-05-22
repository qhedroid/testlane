export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ApiSuccessBody<T> {
  data: T
}
