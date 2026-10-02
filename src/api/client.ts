// Thin fetch wrapper for the Car Wash API: JSON envelope, bearer tokens, one automatic
// refresh on 401, and typed errors.

const API_BASE = '/api/v1'
const ACCESS_KEY = 'cwa.accessToken'
const REFRESH_KEY = 'cwa.refreshToken'

export type Pagination = { page: number; limit: number; total: number; totalPages: number }
export type Paged<T> = { items: T[]; pagination: Pagination }
export type TokenPair = { accessToken: string; refreshToken: string }

export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// ---- token store ------------------------------------------------------------

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getTokens(): TokenPair | null {
  const accessToken = read(ACCESS_KEY)
  const refreshToken = read(REFRESH_KEY)
  return accessToken && refreshToken ? { accessToken, refreshToken } : null
}

export function saveTokens(tokens: TokenPair | null) {
  try {
    if (tokens) {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken)
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
    } else {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    }
  } catch {
    // Storage unavailable (private mode): the session just won't survive a reload.
  }
}

let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn
}

// ---- requests ----------------------------------------------------------------

type Options = { auth?: boolean; query?: Record<string, string | number | undefined> }

async function send(method: string, path: string, body: unknown, opts: Options, retried = false): Promise<any> {
  const url = new URL(API_BASE + path, window.location.origin)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tokens = getTokens()
  if (opts.auth !== false && tokens) headers.Authorization = `Bearer ${tokens.accessToken}`

  let res: Response
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Can’t reach the server. Check your connection and try again.')
  }

  if (res.status === 401 && opts.auth !== false && tokens && !retried) {
    if (await refresh(tokens.refreshToken)) return send(method, path, body, opts, true)
    saveTokens(null)
    onSessionExpired?.()
  }

  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    const err = json?.error ?? {}
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? `Request failed (${res.status})`, err.details)
  }
  return json
}

let refreshing: Promise<boolean> | null = null
function refresh(refreshToken: string) {
  // Concurrent 401s share one refresh call.
  refreshing ??= (async () => {
    try {
      const json = await send('POST', '/auth/refresh', { refreshToken }, { auth: false }, true)
      saveTokens(json.data as TokenPair)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

export const http = {
  get: async <T>(path: string, query?: Options['query']) => (await send('GET', path, undefined, { query })).data as T,
  list: async <T>(path: string, query?: Options['query']): Promise<Paged<T>> => {
    const json = await send('GET', path, undefined, { query })
    return { items: json.data as T[], pagination: json.pagination }
  },
  post: async <T>(path: string, body?: unknown, opts: Options = {}) => (await send('POST', path, body ?? {}, opts)).data as T,
  patch: async <T>(path: string, body: unknown) => (await send('PATCH', path, body, {})).data as T,
  delete: async <T>(path: string) => (await send('DELETE', path, undefined, {})).data as T,
}

/** A message fit for a toast, including per-field validation messages. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fieldErrors = (e.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
    if (fieldErrors) {
      const messages = Object.entries(fieldErrors).flatMap(([field, msgs]) => msgs.map((m) => `${field}: ${m}`))
      if (messages.length) return messages.join('\n')
    }
    const formErrors = (e.details as { formErrors?: string[] } | undefined)?.formErrors
    if (formErrors?.length) return formErrors.join('\n')
    return e.message
  }
  return e instanceof Error ? e.message : 'Something went wrong'
}
