import { clearSession, getToken } from '@/auth/wepAuth'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestOptions extends RequestInit {
  public?: boolean
}

let unauthorizedHandler: (() => void) | undefined

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
  if (!base) throw new ApiError('Falta configurar VITE_API_BASE_URL.', 0)

  const { public: isPublic = false, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)
  const token = isPublic ? null : getToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  if (fetchOptions.body) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      ...fetchOptions,
      headers,
      cache: 'no-store',
      signal: fetchOptions.signal ? AbortSignal.any([fetchOptions.signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('No pudimos conectar con WEP. Revisá tu conexión e intentá de nuevo.', 0)
  }

  const payload: unknown = response.status === 204
    ? null
    : await response.json().catch(() => null)

  if (response.status === 401 && !isPublic) {
    clearSession()
    unauthorizedHandler?.()
  }

  if (!response.ok || (isRecord(payload) && payload.ok === false)) {
    // Las rutas WEP publican errores controlados en message; nunca se renderiza HTML.
    const message = isRecord(payload) && typeof payload.message === 'string'
      && payload.message.length <= 600 && !/[<>]|\bat\s+\S+\s*\(/.test(payload.message)
      ? payload.message : response.status === 401
        ? 'Tu sesión venció. Ingresá nuevamente.'
        : `No se pudo completar la operación (HTTP ${response.status}).`
    throw new ApiError(message, response.status)
  }
  if (payload === null && response.status !== 204) {
    throw new ApiError('WEP devolvió una respuesta no válida.', response.status)
  }
  return payload
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
