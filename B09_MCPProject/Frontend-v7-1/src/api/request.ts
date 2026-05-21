/**
 * src/api/request.ts
 *
 * Unified fetch wrapper for Vite + Vue + TypeScript.
 *
 * Usage:
 * 1. Recommended:
 *    VITE_API_BASE_URL=http://8.134.126.87:8080
 *
 * 2. If Vite proxy is configured for /api, leave VITE_API_BASE_URL empty.
 *
 * Every API function below uses the full OpenAPI path, e.g. /api/user/login.
 */

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

export interface RequestOptions extends RequestInit {
  /**
   * Login/register can skip Authorization header.
   */
  skipAuth?: boolean
}

export interface DownloadOptions {
  method?: 'GET' | 'POST'
  params?: QueryParams
  body?: any
  skipAuth?: boolean
}

function buildUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url

  const path = url.startsWith('/') ? url : `/${url}`
  return API_BASE ? `${API_BASE}${path}` : path
}

export function buildQuery(params?: QueryParams): string {
  if (!params) return ''

  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    searchParams.append(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function appendQuery(url: string, params?: QueryParams): string {
  const query = buildQuery(params)
  if (!query) return url

  return url.includes('?')
    ? `${url}&${query.slice(1)}`
    : `${url}${query}`
}

function getToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

function clearLoginState() {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('username')
  } catch {
    // ignore
  }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}

  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return { ...headers }
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const json = await res.json()
    return json?.message || JSON.stringify(json)
  } catch {
    try {
      return await res.text()
    } catch {
      return res.statusText
    }
  }
}

function isApiResponseLike(value: any): value is ApiResponse<any> {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.code !== 'undefined' &&
    typeof value.message !== 'undefined'
  )
}

export async function request<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers = normalizeHeaders(options.headers)
  const isFormData = options.body instanceof FormData

  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(url), {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearLoginState()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Token expired or unauthorized. Please login again.')
  }

  if (!res.ok) {
    const message = await parseErrorResponse(res)
    throw new Error(`HTTP ${res.status}: ${message}`)
  }

  const text = await res.text()

  if (!text) {
    return {
      code: 200,
      message: 'success',
      data: null as T,
    }
  }

  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return {
      code: 200,
      message: 'success',
      data: text as T,
    }
  }

  if (isApiResponseLike(body)) {
    const code = Number(body.code)
    if (!Number.isNaN(code) && (code < 200 || code >= 300)) {
      throw new Error(body.message || 'Request failed')
    }

    return body as ApiResponse<T>
  }

  return {
    code: 200,
    message: 'success',
    data: body as T,
  }
}

export async function get<T = any>(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(appendQuery(url, params), {
    ...options,
    method: 'GET',
  })
}

export async function post<T = any>(
  url: string,
  body?: any,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function put<T = any>(
  url: string,
  body?: any,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    ...options,
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function del<T = any>(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(appendQuery(url, params), {
    ...options,
    method: 'DELETE',
  })
}

export async function postForm<T = any>(
  url: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: formData,
  })
}

export async function downloadBlob(
  url: string,
  options: DownloadOptions = {},
): Promise<Blob> {
  const method = options.method || 'GET'
  const token = getToken()

  const headers: Record<string, string> = {}

  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (method === 'POST') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(buildUrl(appendQuery(url, options.params)), {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(options.body || {}) : undefined,
  })

  if (res.status === 401) {
    clearLoginState()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Token expired or unauthorized. Please login again.')
  }

  if (!res.ok) {
    const message = await parseErrorResponse(res)
    throw new Error(`HTTP ${res.status}: ${message}`)
  }

  return await res.blob()
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
