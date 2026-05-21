/**
 * src/api/request.ts
 *
 * Unified HTTP request utility.
 *
 * Recommended .env.development:
 *   VITE_API_BASE_URL=http://8.134.126.87:8080
 *
 * It also supports:
 *   VITE_API_BASE_URL=http://8.134.126.87:8080/api
 * because buildUrl() will avoid duplicated /api.
 */

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  [key: string]: any
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>

export type QueryParams = Record<string, QueryValue>

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

function buildUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url

  let path = url.startsWith('/') ? url : `/${url}`

  // Allow either backend root "...:8080" or api root "...:8080/api".
  if (RAW_API_BASE.endsWith('/api') && path.startsWith('/api/')) {
    path = path.replace(/^\/api/, '')
  }

  return RAW_API_BASE ? `${RAW_API_BASE}${path}` : path
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

function getToken(): string | null {
  const token = localStorage.getItem('token')
  if (!token) return null

  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

function buildHeaders(options?: RequestOptions): Headers {
  const headers = new Headers(options?.headers)

  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (!options?.skipAuth) {
    const token = getToken()
    if (token) headers.set('Authorization', token)
  }

  return headers
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()

  let body: any = null
  if (text) {
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(text)
      } catch {
        throw new Error(text || `Invalid JSON response: ${response.status}`)
      }
    } else {
      body = text
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body
        ? body.message || body.error || `HTTP ${response.status}`
        : body || `HTTP ${response.status}`

    throw new Error(message)
  }

  if (
    body &&
    typeof body === 'object' &&
    Object.prototype.hasOwnProperty.call(body, 'code') &&
    Object.prototype.hasOwnProperty.call(body, 'data')
  ) {
    return body as ApiResponse<T>
  }

  return {
    code: response.status,
    message: response.statusText || 'success',
    data: body as T,
  }
}

export async function request<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const finalUrl = buildUrl(url)
  const headers = buildHeaders(options)

  const response = await fetch(finalUrl, {
    ...options,
    headers,
  })

  return parseJsonResponse<T>(response)
}

export async function get<T = any>(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(`${url}${buildQuery(params)}`, {
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
  return request<T>(`${url}${buildQuery(params)}`, {
    ...options,
    method: 'DELETE',
  })
}

export async function postForm<T = any>(
  url: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers)
  headers.delete('Content-Type')

  return request<T>(url, {
    ...options,
    method: 'POST',
    headers,
    body: formData,
  })
}

export async function getBlob(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<Blob> {
  const finalUrl = buildUrl(`${url}${buildQuery(params)}`)
  const blobHeaders = new Headers(options.headers)
  blobHeaders.set(
    'Accept',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream,application/json',
  )
  const headers = buildHeaders({
    ...options,
    headers: blobHeaders,
  })

  const response = await fetch(finalUrl, {
    ...options,
    method: 'GET',
    headers,
  })

  const contentType = response.headers.get('content-type') || ''

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message || body?.error || `HTTP ${response.status}`)
    }

    const text = await response.text().catch(() => '')
    throw new Error(text || `HTTP ${response.status}`)
  }

  if (contentType.includes('application/json')) {
    const body = await response.json().catch(() => null)
    if (body?.code && body.code !== 200) {
      throw new Error(body?.message || 'Download failed')
    }

    // Some current export endpoints are documented as JSON data:null.
    // Keep a Blob return type so pages can keep their download flow unchanged.
    return new Blob([JSON.stringify(body ?? {}, null, 2)], {
      type: 'application/json',
    })
  }

  return await response.blob()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(objectUrl)
}

export default request
