const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export class ApiError extends Error {
  status: number
  responseUrl: string
  detail: string | null

  constructor(status: number, statusText: string, responseUrl: string, detail: string | null = null) {
    super(detail || `API error ${status}: ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.responseUrl = responseUrl
    this.detail = detail
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  const hasBody = options?.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  if (!res.ok) {
    throw new ApiError(
      res.status,
      res.statusText,
      res.url,
      await extractErrorDetail(res),
    )
  }

  const contentType = res.headers.get('content-type')
  if (!contentType || res.status === 204 || res.status === 202) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}

async function extractErrorDetail(res: Response): Promise<string | null> {
  const contentType = res.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      const body = await res.json() as {
        reason?: unknown
        Reason?: unknown
        message?: unknown
        Message?: unknown
        title?: unknown
        errors?: Record<string, unknown>
      }

      const directMessage = firstString(
        body.reason,
        body.Reason,
        body.message,
        body.Message,
        body.title,
      )

      if (directMessage) {
        return directMessage
      }

      if (body.errors && typeof body.errors === 'object') {
        const validationMessages = Object.values(body.errors)
          .flatMap(value => Array.isArray(value) ? value : [value])
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

        if (validationMessages.length > 0) {
          return validationMessages.join(' ')
        }
      }
    }

    const text = (await res.text()).trim()
    return text || null
  } catch {
    return null
  }
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return null
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.detail) {
    return error.detail
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
