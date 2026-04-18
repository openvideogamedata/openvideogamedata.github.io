const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

let refreshPromise: Promise<boolean> | null = null

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return false

      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        return false
      }

      const data = await res.json() as { token: string; refreshToken: string }
      localStorage.setItem('token', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

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

async function request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const headers = new Headers(options?.headers)
  const hasBody = options?.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = localStorage.getItem('token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  })

  if (res.status === 401) {
    if (!isRetry) {
      const refreshed = await attemptTokenRefresh()
      if (refreshed) return request<T>(path, options, true)
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    throw new ApiError(401, res.statusText, res.url)
  }

  if (res.status === 403) {
    try {
      const body = await res.clone().json() as { error?: string }
      if (body?.error === 'banned') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/#/auth/error?reason=banned'
        return undefined as unknown as T
      }
    } catch { /* not JSON - fall through to generic error */ }
  }

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
