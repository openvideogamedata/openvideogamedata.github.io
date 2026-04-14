const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

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
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }

  const contentType = res.headers.get('content-type')
  if (!contentType || res.status === 204 || res.status === 202) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
