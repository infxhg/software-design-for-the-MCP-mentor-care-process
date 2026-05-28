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
    // 修改点 (FIX)：把 HTTP status 挂到 Error 对象上（新增 .status 属性，不影响 .message）。
    // 之前的 Error 只带后端 JSON 里的 message 文本（如 "无权限访问该学生"），
    // 调用层无法可靠判断 401/403/500 等情况，导致 SearchStudent 这类页面要么
    // 误把权限错误显示成 "未找到学生"，要么走兜底逻辑伪造一条假学生记录。
    // 现在 catch 块里可以直接 err.status === 403 来判定权限错误。
    const msg = await parseErrorMessage(response)
    const error = new Error(msg) as Error & { status?: number }
    error.status = response.status
    throw error
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

/**
 * 修改点 (NEW)：带响应头信息的下载。
 *
 * 普通的 downloadBlob 只能拿到 Blob，无法得知：
 *   1. 后端通过 Content-Disposition 指定的真实文件名（含扩展名）
 *   2. 真实的 Content-Type（决定文件到底是 docx 还是 zip）
 *
 * 这导致 FC 导出场景下，后端返回 zip 时，前端仍按 .docx 命名保存，
 * 打开就是乱码。改用这个函数后，调用方可以根据返回的 contentType
 * 选择正确扩展名，filename 也优先用后端给的。
 *
 * CORS 注意：浏览器默认看不到 Content-Disposition，需要后端在响应里加
 *   Access-Control-Expose-Headers: Content-Disposition
 * 否则只能拿到 Content-Type，filename 字段为空，由调用方走兜底命名。
 *
 * 这里复用 rawResponse: true 走原始 fetch Response，自己读 headers / blob，
 * 同时保留原 request 的 401 跳登录 / 非 2xx 抛错语义。
 */
export interface BlobWithMeta {
  blob: Blob
  filename: string
  contentType: string
}

export async function downloadBlobWithHeaders(
  url: string,
  params?: QueryParams,
  options: RequestOptions = {},
): Promise<BlobWithMeta> {
  const response = await request<Response>('GET', url, {
    ...options,
    params,
    rawResponse: true,
  })

  if (response.status === 401) {
    clearLoginState()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Token expired or unauthorized. Please login again.')
  }

  if (!response.ok) {
    // 修改点 (FIX)：同 request() 的修复，把 HTTP status 挂到 Error 上。
    const msg = await parseErrorMessage(response)
    const error = new Error(msg) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  const disposition = response.headers.get('content-disposition') || ''
  const filename = parseContentDispositionFilename(disposition)
  const blob = await response.blob()

  return { blob, filename, contentType }
}

/**
 * Parse RFC 5987 / RFC 6266 Content-Disposition filename.
 * 优先 filename*=（支持 UTF-8 编码），退化到 filename=。
 */
function parseContentDispositionFilename(header: string): string {
  if (!header) return ''

  const star = header.match(/filename\*\s*=\s*([^']*)''([^;]+)/i)
  if (star) {
    const encoded = star[2].trim().replace(/^"|"$/g, '')
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }

  const simple = header.match(/filename\s*=\s*("([^"]+)"|([^;]+))/i)
  if (simple) {
    return (simple[2] || simple[3] || '').trim()
  }

  return ''
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
