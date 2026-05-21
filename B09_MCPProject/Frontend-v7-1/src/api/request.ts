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
  | Array<string | number | boolean>

export type QueryParams = Record<string, QueryValue>

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: QueryParams
  body?: unknown
  skipAuth?: boolean
  rawResponse?: boolean
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function joinUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!API_BASE) return normalizedPath

  // 兼容两种配置：
  // VITE_API_BASE_URL=http://host:8080
  // VITE_API_BASE_URL=http://host:8080/api
  if (API_BASE.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${API_BASE}${normalizedPath.slice('/api'.length)}`
  }

  return `${API_BASE}${normalizedPath}`
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

  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function getToken(): string {
  return localStorage.getItem('token') || ''
}

function buildHeaders(body: unknown, options: RequestOptions): Headers {
  const headers = new Headers(options.headers || {})

  if (!options.skipAuth) {
    const token = getToken()
    if (token) headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`)
  }

  if (body !== undefined && !(body instanceof FormData) && !(body instanceof Blob)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function parseResponse<T>(response: Response, rawResponse?: boolean): Promise<T> {
  if (rawResponse) return response as unknown as T

  const contentType = response.headers.get('content-type') || ''

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userId')
    if (window.location.pathname !== '/login') window.location.href = '/login'
    throw new Error('Unauthorized. Please login again.')
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      if (contentType.includes('application/json')) {
        const err = await response.json()
        message = err?.message || err?.error || message
      } else {
        const text = await response.text()
        if (text) message = text
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.blob()) as T
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

  return parseResponse<T>(response, rawResponse)
}

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

export async function downloadBlob(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<Blob> {
  return request<Blob>('GET', url, { ...options, params })
}

export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.code !== 200 && response.code !== 201) {
    throw new Error(response.message || 'Request failed')
  }
  return response.data
}

export function unwrapNullable<T>(response: ApiResponse<T>): T {
  if (response.code !== 200 && response.code !== 201) {
    throw new Error(response.message || 'Request failed')
  }
  return response.data
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
  const userInfoRaw = localStorage.getItem('userInfo')
  if (!userInfoRaw) return localStorage.getItem('userId') || ''

  try {
    const parsed = JSON.parse(userInfoRaw)
    return parsed?.user?.id || parsed?.id || parsed?.userId || localStorage.getItem('userId') || ''
  } catch {
    return localStorage.getItem('userId') || ''
  }
}

export function getCurrentUsername(): string {
  const userInfoRaw = localStorage.getItem('userInfo')
  if (!userInfoRaw) return localStorage.getItem('username') || ''

  try {
    const parsed = JSON.parse(userInfoRaw)
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
