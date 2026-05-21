/**
 * src/api/user.ts
 *
 * User API - register, login, user info, feedback, logs.
 */

import { get, post } from './request'

// ==================== Types ====================

export interface UserEntity {
  id: string
  username: string
  passwordHash?: string | null
  realName: string | null
  phone: string | null
  email: string
  status: number
  isDeleted?: number
  createTime?: string | null
  updateTime?: string | null
  [key: string]: any
}

export interface OrgUnitEntity {
  id: string
  name: string
  type: string
  parentId: string | null
  [key: string]: any
}

export interface UserInfoDTO {
  user: UserEntity
  roles: string[]
  permissions: string[]
  orgUnits?: OrgUnitEntity[]
  [key: string]: any
}

export interface RegisterVerifyPayload {
  user: {
    email: string
    username: string
    passwordHash: string
  }
  verificationCode: string
}

export interface UpdateUserInfoPayload {
  id: string
  realName: string
  phone: string
}

export interface UserLogQuery {
  userId?: string
  username?: string
  action?: string
  startTime?: string
  endTime?: string
}

export interface UserLogItem {
  id?: string
  userId?: string
  username?: string
  action?: string
  module?: string
  loginTime?: string
  logoutTime?: string
  mainFunctions?: string
  createTime?: string
  [key: string]: any
}

export interface FeedbackItem {
  id?: string
  feedbackId?: string
  userId?: string
  username?: string
  content?: string
  message?: string
  reply?: string
  status?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface SubmitFeedbackPayload {
  content?: string
  message?: string
  title?: string
  type?: string
  [key: string]: any
}

// ==================== Register ====================

export async function sendRegisterCode(emailAccount: string): Promise<any> {
  const email = String(emailAccount || '').trim()
  if (!email) throw new Error('Email is required')

  const res = await post<any>(
    `/api/user/register?emailAccount=${encodeURIComponent(email)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to send verification code')
  }

  return res.data
}

export async function sendRegisterCodeByQuery(emailAccount: string): Promise<any> {
  return sendRegisterCode(emailAccount)
}

export async function registerVerify(payload: RegisterVerifyPayload): Promise<void> {
  const res = await post<null>('/api/user/register/verify', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Register failed')
  }
}

// ==================== Login ====================

export async function loginApi(username: string, password: string): Promise<string> {
  const res = await get<string>('/api/user/login', {
    username,
    password,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Login failed')
  }

  return res.data
}

export async function getUserInfoApi(username?: string): Promise<UserInfoDTO> {
  const finalUsername =
    String(username || '').trim() || localStorage.getItem('username') || ''

  const res = await get<UserInfoDTO>('/api/user/userInfo', {
    username: finalUsername || undefined,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to get user info')
  }

  return res.data
}

/**
 * Internal service endpoint documented by OpenAPI:
 * GET /internal/userInfo?userId=xxx
 */
export async function getUserInfoByIdApi(userId: string): Promise<UserEntity | null> {
  const uid = String(userId || '').trim()
  if (!uid) return null

  const res = await get<UserEntity>('/internal/userInfo', {
    userId: uid,
  })

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeUser(res.data)
}

export async function updateUserInfo(payload: UpdateUserInfoPayload): Promise<void> {
  const res = await post<null>('/api/user/updateInfo', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update user info')
  }
}

export async function getAllStudents(): Promise<UserEntity[]> {
  const res = await get<any[]>('/api/user/students/all')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to fetch students')
  }

  return (res.data || []).map(normalizeUser)
}

// ==================== Feedback ====================

export async function submitFeedback(
  payloadOrContent: SubmitFeedbackPayload | string,
): Promise<any> {
  const payload =
    typeof payloadOrContent === 'string'
      ? { content: payloadOrContent.trim() }
      : payloadOrContent

  const content = payload.content ?? payload.message
  if (!content || !String(content).trim()) {
    throw new Error('Feedback content cannot be empty.')
  }

  const res = await post<any>('/api/user/feedback', {
    ...payload,
    content: String(content).trim(),
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to submit feedback')
  }

  return res.data
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const res = await get<any[]>('/api/user/feedback')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load feedback')
  }

  return (res.data || []).map(normalizeFeedback)
}

// Alias used by some pages.
export const getFeedbackList = listFeedback

// ==================== Logs ====================

export async function listLogs(query: UserLogQuery = {}): Promise<UserLogItem[]> {
  const res = await get<any[]>('/api/user/logs', query as any)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load logs')
  }

  return res.data || []
}

export async function getUserLogs(userId: string): Promise<UserLogItem[]> {
  const uid = String(userId || '').trim()
  if (!uid) return []

  return listLogs({ userId: uid })
}

// ==================== Role mapping ====================

export type FrontendRole =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'

export function mapBackendRole(backendRoles: string[] = []): FrontendRole {
  const roles = backendRoles.map((r) => String(r).toUpperCase())

  if (roles.some((r) => r.includes('ADMIN'))) return 'admin'
  if (
    roles.some(
      (r) =>
        r.includes('FACULTY_CONSULTANT') ||
        r.includes('FACULTY CONSULTANT') ||
        r.includes('CONSULTANT'),
    )
  ) {
    return 'consultant'
  }
  if (roles.some((r) => r.includes('COORDINATOR') || r.includes('MCP'))) {
    return 'coordinator'
  }
  if (roles.some((r) => r.includes('MENTOR'))) return 'mentor'
  if (roles.some((r) => r.includes('SUPPORT'))) return 'support'
  if (roles.some((r) => r.includes('STUDENT'))) return 'student'

  return 'student'
}

// ==================== Helpers ====================

function normalizeUser(raw: any): UserEntity {
  const id = String(raw.id ?? raw.userId ?? raw.studentId ?? raw.username ?? '')

  return {
    ...raw,
    id,
    username: raw.username ?? raw.userName ?? id,
    realName: raw.realName ?? raw.name ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? '',
    status: Number(raw.status ?? 1),
  }
}

function normalizeFeedback(raw: any): FeedbackItem {
  return {
    ...raw,
    id: raw.id ?? raw.feedbackId,
    feedbackId: raw.feedbackId ?? raw.id,
    content: raw.content ?? raw.message ?? '',
    reply: raw.reply ?? raw.answer,
    status: raw.status ?? '',
    createTime: raw.createTime ?? raw.createdAt,
  }
}
