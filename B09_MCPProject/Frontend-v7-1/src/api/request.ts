/**
 * HTTP request utility with JWT authentication.
 *
 * 使用方式：
 *   get('/user/login', { username, password })  -> /api/user/login?username=...
 *
 * .env.development 推荐：
 *   VITE_API_BASE_URL=http://8.134.126.87:8080/api
 *
 * 如果你已经在 vite.config.ts 里代理 /api 到后端，也可以不配这个环境变量。
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

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

export interface RequestOptions extends RequestInit {
  params?: QueryParams
  skipAuth?: boolean
}

function buildUrl(url: string, params?: QueryParams): string {
  const path = url.startsWith('/') ? url : `/${url}`
  const fullUrl = /^https?:\/\//i.test(url) ? url : `${API_BASE}${path}`

  if (!params) return fullUrl

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }

  const query = search.toString()
  if (!query) return fullUrl

  return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${query}`
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function redirectToLogin() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('userInfo')
  localStorage.removeItem('username')
  window.location.href = '/login'
}

async function readResponseBody(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || ''

  if (res.status === 204) {
    return { code: 200, message: 'success', data: null }
  }

  if (contentType.includes('application/json')) {
    return await res.json()
  }

  const text = await res.text()
  return {
    code: res.ok ? 200 : res.status,
    message: text || res.statusText,
    data: text,
  }
}

export async function request<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { params, skipAuth, ...fetchOptions } = options

  const body = fetchOptions.body
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const headers = new Headers(fetchOptions.headers || {})

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (!isFormData && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let finalBody = body
  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body !== 'string' &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    finalBody = JSON.stringify(body)
  }

  const res = await fetch(buildUrl(url, params), {
    ...fetchOptions,
    headers,
    body: finalBody,
  })

  if (res.status === 401) {
    redirectToLogin()
    throw new Error('Token expired, please login again')
  }

  const payload = await readResponseBody(res)

  if (!res.ok) {
    const message = payload?.message || payload?.data || res.statusText
    throw new Error(`HTTP ${res.status}: ${message}`)
  }

  return payload as ApiResponse<T>
}

export function get<T = any>(
  url: string,
  params?: QueryParams,
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'GET',
    params,
  })
}

export function post<T = any>(
  url: string,
  body?: any,
  params?: QueryParams,
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    params,
    body,
  })
}

export function put<T = any>(
  url: string,
  body?: any,
  params?: QueryParams,
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'PUT',
    params,
    body,
  })
}

export function del<T = any>(
  url: string,
  params?: QueryParams,
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'DELETE',
    params,
  })
}

export function upload<T = any>(
  url: string,
  formData: FormData,
  params?: QueryParams,
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    params,
    body: formData,
  })
}

export async function requestBlob(
  url: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const { params, skipAuth, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers || {})
  const token = getToken()

  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(buildUrl(url, params), {
    ...fetchOptions,
    headers,
  })

  if (res.status === 401) {
    redirectToLogin()
    throw new Error('Token expired, please login again')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }

  return await res.blob()
}

export { buildUrl }
