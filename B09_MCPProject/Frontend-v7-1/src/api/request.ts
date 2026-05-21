const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>

export type QueryParams = Record<string, QueryValue>

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: QueryParams
  body?: unknown
  skipAuth?: boolean
  rawResponse?: boolean
}

function joinUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url

  const path = url.startsWith('/') ? url : `/${url}`

  if (!API_BASE) return path

  // Allow either:
  // VITE_API_BASE_URL=http://host:8080
  // VITE_API_BASE_URL=http://host:8080/api
  if (API_BASE.endsWith('/api') && path.startsWith('/api/')) {
    return `${API_BASE}${path.slice('/api'.length)}`
  }

  return `${API_BASE}${path}`
}

export function buildQuery(params?: QueryParams): string {
  if (!params) return ''

  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item))
        }
      })
      return
    }

    search.append(key, String(value))
  })

  const text = search.toString()
  return text ? `?${text}` : ''
}

function getToken(): string {
  try {
    return localStorage.getItem('token') || ''
  } catch {
    return ''
  }
}

function clearLoginState(): void {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userId')
  } catch {
    // ignore
  }
}

function buildHeaders(body: unknown, options: RequestOptions): Headers {
  const headers = new Headers(options.headers || {})

  if (!options.skipAuth) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`)
    }
  }

  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const json = await response.json()
      return json?.message || json?.error || JSON.stringify(json)
    }

    const text = await response.text()
    return text || response.statusText || `HTTP ${response.status}`
  } catch {
    return response.statusText || `HTTP ${response.status}`
  }
}

export async function request<T = any>(
  method: string,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, skipAuth, rawResponse, ...fetchOptions } = options
  const finalUrl = `${joinUrl(url)}${buildQuery(params)}`
  const headers = buildHeaders(body, options)

  const response = await fetch(finalUrl, {
    ...fetchOptions,
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData || body instanceof Blob
          ? body
          : JSON.stringify(body),
  })

  if (rawResponse) return response as unknown as T

  if (response.status === 401) {
    clearLoginState()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Token expired or unauthorized. Please login again.')
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.blob()) as T
}

export function unwrap<T>(response: ApiResponse<T>): T {
  const code = Number(response?.code)

  if (!Number.isNaN(code) && code !== 200 && code !== 201) {
    throw new Error(response?.message || 'Request failed')
  }

  return response?.data
}

export const unwrapNullable = unwrap

export async function get<T = any>(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>('GET', url, { ...options, params })
}

export async function post<T = any>(
  url: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>('POST', url, { ...options, body })
}

export async function put<T = any>(
  url: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>('PUT', url, { ...options, body })
}

export async function del<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>('DELETE', url, options)
}

export async function upload<T = any>(
  url: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>('POST', url, { ...options, body: formData })
}

// Backward-compatible name used by older files.
export const postForm = upload

export async function downloadBlob(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<Blob> {
  return request<Blob>('GET', url, { ...options, params })
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function getCurrentUserId(): string {
  const raw = localStorage.getItem('userInfo')
  if (!raw) return localStorage.getItem('userId') || ''

  try {
    const parsed = JSON.parse(raw)
    return parsed?.user?.id || parsed?.id || parsed?.userId || localStorage.getItem('userId') || ''
  } catch {
    return localStorage.getItem('userId') || ''
  }
}

export function getCurrentUsername(): string {
  const raw = localStorage.getItem('userInfo')
  if (!raw) return localStorage.getItem('username') || ''

  try {
    const parsed = JSON.parse(raw)
    return (
      parsed?.user?.username ||
      parsed?.username ||
      parsed?.user?.realName ||
      localStorage.getItem('username') ||
      ''
    )
  } catch {
    return localStorage.getItem('username') || ''
  }
}
