const BASE = import.meta.env.VITE_API_URL ?? '/api'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('_csrf='))
      ?.split('=')[1] ?? ''
  )
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (MUTATING.has(method)) {
    headers['X-CSRF-Token'] = getCsrfToken()
  }

  let res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  // Attempt silent token refresh on 401
  if (res.status === 401 && path !== '/v1/auth/refresh' && path !== '/v1/auth/login') {
    const refreshRes = await fetch(`${BASE}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
    })
    if (refreshRes.ok) {
      // Retry the original request
      res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers,
      })
    }
  }

  return res
}
