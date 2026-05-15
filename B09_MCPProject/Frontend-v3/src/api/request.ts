/**
 * HTTP request utility with JWT authentication
 */

const API_BASE = '/api'

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export async function request<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userInfo')
    window.location.href = '/login'
    throw new Error('Token expired, please login again')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  return await res.json()
}

export function get<T = any>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'GET' })
}

export function post<T = any>(url: string, body?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function del<T = any>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'DELETE' })
}
