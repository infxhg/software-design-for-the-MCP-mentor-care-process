import { get, post, put, unwrap } from './request'
import type { Role } from '../types'

export type FrontendRole = Role

type AnyRecord = Record<string, any>

export interface UserAccount {
  userId?: string | number
  id?: string | number
  username?: string
  account?: string
  realName?: string
  name?: string
  email?: string
  phone?: string
  role?: FrontendRole
  roles?: string[]
  status?: string | number
}

export interface UserEntity extends UserAccount {
  token?: string
}

export interface UserInfoData extends UserAccount {
  roles?: string[]
}

export interface UserInfoDTO extends UserAccount {
  roles?: string[]
}

export interface FeedbackItem {
  feedbackId: string
  id?: string | number
  userId?: string | number
  fromUserId?: string | number
  username?: string
  fromUser?: string
  fromRole?: string
  role?: string
  content: string
  feedbackContent?: string
  reply?: string
  replyContent?: string
  status?: string
  submittedAt?: string
  createTime?: string
  createdAt?: string
  updateTime?: string
  updatedAt?: string
}

export interface OperationLog {
  logId?: string | number
  id?: string | number
  userId?: string | number
  username?: string
  operation?: string
  action?: string
  module?: string
  detail?: string
  ip?: string
  createTime?: string
  createdAt?: string
}

export interface UserLogItem extends OperationLog {}

function asArray(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[]

  const obj = value as AnyRecord | null | undefined
  if (!obj || typeof obj !== 'object') return []

  if (Array.isArray(obj.records)) return obj.records
  if (Array.isArray(obj.list)) return obj.list
  if (Array.isArray(obj.content)) return obj.content
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.data)) return obj.data

  return []
}

function normalizeApiData<T>(response: unknown): T {
  return unwrap(response as any) as T
}

async function callFirst<T>(calls: Array<() => Promise<unknown>>): Promise<T> {
  let lastError: unknown

  for (const call of calls) {
    try {
      const response = await call()
      return normalizeApiData<T>(response)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

function getStoredUserInfo(): AnyRecord {
  try {
    const raw = localStorage.getItem('userInfo')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getStoredUserId(): string {
  const userInfo = getStoredUserInfo()
  return String(
      userInfo.userId ??
      userInfo.id ??
      userInfo.accountId ??
      localStorage.getItem('userId') ??
      localStorage.getItem('username') ??
      '',
  )
}

function getStoredUsername(): string {
  const userInfo = getStoredUserInfo()
  return String(
      userInfo.username ??
      userInfo.account ??
      userInfo.realName ??
      userInfo.name ??
      localStorage.getItem('username') ??
      '',
  )
}

function getStoredRole(): string {
  return String(localStorage.getItem('role') || getStoredUserInfo().role || '')
}

function normalizeStatus(status: unknown): string {
  const value = String(status ?? '').trim()
  if (!value) return 'PENDING'

  const upper = value.toUpperCase()
  if (upper === 'PENDING' || upper === 'UNREPLIED' || upper === 'OPEN') return 'PENDING'
  if (upper === 'REPLIED' || upper === 'ANSWERED') return 'REPLIED'
  if (upper === 'CLOSED' || upper === 'RESOLVED') return 'CLOSED'

  return upper
}

function normalizeFeedbackItem(raw: AnyRecord): FeedbackItem {
  const feedbackId = String(
      raw.feedbackId ??
      raw.id ??
      raw.feedback_id ??
      raw.questionId ??
      raw.messageId ??
      '',
  )

  return {
    ...raw,
    feedbackId,
    id: raw.id ?? raw.feedbackId,
    userId: raw.userId ?? raw.fromUserId ?? raw.createdBy,
    fromUserId: raw.fromUserId ?? raw.userId ?? raw.createdBy,
    username: raw.username ?? raw.fromUser ?? raw.userName ?? raw.realName,
    fromUser: raw.fromUser ?? raw.username ?? raw.userName ?? raw.realName ?? raw.userId,
    fromRole: raw.fromRole ?? raw.role ?? raw.userRole,
    role: raw.role ?? raw.fromRole ?? raw.userRole,
    content: String(raw.content ?? raw.feedbackContent ?? raw.description ?? raw.message ?? ''),
    feedbackContent: raw.feedbackContent ?? raw.content ?? raw.description ?? raw.message,
    reply: raw.reply ?? raw.replyContent ?? raw.answer,
    replyContent: raw.replyContent ?? raw.reply ?? raw.answer,
    status: normalizeStatus(raw.status),
    submittedAt: raw.submittedAt ?? raw.createTime ?? raw.createdAt,
    createTime: raw.createTime ?? raw.submittedAt ?? raw.createdAt,
    createdAt: raw.createdAt ?? raw.createTime ?? raw.submittedAt,
    updateTime: raw.updateTime ?? raw.updatedAt,
    updatedAt: raw.updatedAt ?? raw.updateTime,
  }
}

function roleValueToText(value: unknown): string {
  if (value === null || value === undefined) return ''

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(roleValueToText).filter(Boolean).join(' ')
  }

  if (typeof value === 'object') {
    const raw = value as AnyRecord
    return String(
        raw.roleCode ??
        raw.role_code ??
        raw.code ??
        raw.roleName ??
        raw.role_name ??
        raw.name ??
        raw.authority ??
        raw.authorities ??
        raw.role ??
        raw.roles ??
        '',
    )
  }

  return ''
}

export function mapBackendRole(roles?: unknown): FrontendRole {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : []
  const normalized = list
      .flatMap((item) => roleValueToText(item).split(/[\s,;|]+/))
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean)

  if (normalized.some((r) => r.includes('ADMIN'))) return 'admin'
  if (normalized.some((r) => r.includes('SUPPORT'))) return 'support'
  if (normalized.some((r) => r.includes('CONSULTANT') || r.includes('FACULTY'))) return 'consultant'
  if (normalized.some((r) => r.includes('COORDINATOR') || r.includes('MCP'))) return 'coordinator'
  if (normalized.some((r) => r.includes('MENTOR'))) return 'mentor'
  return 'student'
}

function extractToken(data: unknown): string | null {
  if (typeof data === 'string') {
    const token = data.trim().replace(/^Bearer\s+/i, '')
    return token || null
  }

  if (!data || typeof data !== 'object') return null

  const queue: AnyRecord[] = [data as AnyRecord]
  const tokenKeys = [
    'token',
    'accessToken',
    'access_token',
    'jwt',
    'jwtToken',
    'authorization',
    'Authorization',
    'bearerToken',
    'bearer',
    'idToken',
  ]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const key of tokenKeys) {
      const value = current[key]
      if (typeof value === 'string' || typeof value === 'number') {
        const token = String(value).trim().replace(/^Bearer\s+/i, '')
        if (token) return token
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        queue.push(value as AnyRecord)
      }
    }
  }

  return null
}

function clearLoginStateBeforeLogin(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('userInfo')
  localStorage.removeItem('userId')
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function uniquePayloads(payloads: AnyRecord[]): AnyRecord[] {
  const seen = new Set<string>()
  const result: AnyRecord[] = []

  for (const payload of payloads) {
    const key = JSON.stringify(payload)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(payload)
    }
  }

  return result
}

function buildLoginPayloads(account: string, password: string): AnyRecord[] {
  const commonPayloads: AnyRecord[] = [
    { username: account, password },
    { account, password },
    { loginName: account, password },
    { identifier: account, password },
    { principal: account, password },
    { user: account, password },

    // 关键修复：学生真实 id 是数字时，登录不要只依赖 userId。
    // 系统要求学生用姓名或邮箱登录，所以这里显式支持 name / realName / email。
    { name: account, password },
    { realName: account, password },
    { email: account, password },
  ]

  if (isEmail(account)) {
    return uniquePayloads([
      { email: account, password },
      { username: account, password },
      { account, password },
      { loginName: account, password },
      { identifier: account, password },
      ...commonPayloads,
    ])
  }

  return uniquePayloads(commonPayloads)
}

export async function loginApi(account: string, password: string): Promise<string> {
  const trimmedAccount = account.trim()

  if (!trimmedAccount || !password) {
    throw new Error('Please enter account and password.')
  }

  clearLoginStateBeforeLogin()

  const apiPost = post as unknown as (
      url: string,
      body?: AnyRecord,
      options?: AnyRecord,
  ) => Promise<unknown>

  const apiGet = get as unknown as (
      url: string,
      params?: AnyRecord,
      options?: AnyRecord,
  ) => Promise<unknown>

  const skipAuth = { skipAuth: true }
  const payloads = buildLoginPayloads(trimmedAccount, password)

  let lastError: unknown

  for (const payload of payloads) {
    try {
      const response = await apiPost('/api/user/login', payload, skipAuth)
      const data = normalizeApiData<unknown>(response)
      const token = extractToken(data)

      if (token) return token

      if (typeof data === 'string' && data.trim()) {
        return data.trim().replace(/^Bearer\s+/i, '')
      }

      throw new Error('Login succeeded but token was not found in response.')
    } catch (error) {
      lastError = error
    }
  }

  for (const payload of payloads) {
    try {
      const response = await apiGet('/api/user/login', payload, skipAuth)
      const data = normalizeApiData<unknown>(response)
      const token = extractToken(data)

      if (token) return token

      if (typeof data === 'string' && data.trim()) {
        return data.trim().replace(/^Bearer\s+/i, '')
      }

      throw new Error('Login succeeded but token was not found in response.')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export async function getUserInfoApi(account?: string): Promise<UserInfoDTO> {
  const trimmedAccount = account?.trim()

  return callFirst<UserInfoDTO>([
    () => get('/api/user/userInfo'),
    ...(trimmedAccount
        ? [
          () => get('/api/user/userInfo', { username: trimmedAccount }),
          () => get('/api/user/userInfo', { account: trimmedAccount }),
          () => get('/api/user/userInfo', { email: trimmedAccount }),
          () => get('/api/user/userInfo', { name: trimmedAccount }),
          () => get('/api/user/userInfo', { realName: trimmedAccount }),
          () => get('/api/user/userInfo', { userId: trimmedAccount }),
        ]
        : []),
  ])
}

export async function getInternalUserInfo(): Promise<UserInfoDTO> {
  return callFirst<UserInfoDTO>([
    () => get('/internal/userInfo'),
    () => get('/api/internal/userInfo'),
  ])
}

export async function getUserInfoByIdApi(userId: string | number): Promise<UserInfoDTO> {
  const idStr = String(userId).trim()

  return callFirst<UserInfoDTO>([
    () => get(`/api/user/${encodeURIComponent(idStr)}`),
    () => get('/api/user/info', { userId: idStr }),
    () => get('/api/user/userInfo', { userId: idStr }),
    () => get('/api/user/userInfo', { id: idStr }),
    () => get('/api/user/userInfo', { username: idStr }),
    () => get('/api/user/userInfo', { account: idStr }),
    () => get('/api/user/userInfo', { email: idStr }),
    () => get('/api/user/userInfo', { name: idStr }),
    () => get('/api/user/userInfo', { realName: idStr }),
  ])
}

export async function registerSendCode(email: string): Promise<unknown> {
  return callFirst<unknown>([
    () => post('/api/user/register/sendCode', { email }),
    () => post('/api/user/sendRegisterCode', { email }),
    () => get('/api/user/register/sendCode', { email }),
  ])
}

export const sendRegisterCode = registerSendCode

export async function sendRegisterCodeByQuery(email: string): Promise<unknown> {
  return callFirst<unknown>([
    () => get('/api/user/register/sendCode', { email }),
    () => get('/api/user/sendRegisterCode', { email }),
  ])
}

export async function registerVerify(payload: AnyRecord): Promise<unknown> {
  return callFirst<unknown>([
    () => post('/api/user/register/verify', payload),
    () => post('/api/user/registerVerify', payload),
  ])
}

export async function updateUserInfo(payload: AnyRecord): Promise<UserInfoDTO> {
  return callFirst<UserInfoDTO>([
    () => put('/api/user/updateInfo', payload),
    () => put('/api/user/userInfo', payload),
  ])
}

export async function submitFeedback(content: string): Promise<FeedbackItem> {
  const trimmed = content.trim()

  if (!trimmed) {
    throw new Error('Feedback content cannot be empty.')
  }

  const payload = {
    content: trimmed,
    feedbackContent: trimmed,
    description: trimmed,
    userId: getStoredUserId(),
    fromUserId: getStoredUserId(),
    username: getStoredUsername(),
    fromUser: getStoredUsername(),
    role: getStoredRole(),
    fromRole: getStoredRole(),
  }

  const data = await callFirst<AnyRecord>([
    () => post('/api/feedback', payload),
    () => post('/api/user/feedback', payload),
    () => post('/api/user/feedback/submit', payload),
  ])

  return normalizeFeedbackItem(data)
}

export async function listFeedback(params: AnyRecord = {}): Promise<FeedbackItem[]> {
  const data = await callFirst<unknown>([
    () => get('/api/support/feedback', params),
    () => get('/api/user/feedback', params),
    () => get('/api/feedback', params),
  ])

  return asArray(data).map(normalizeFeedbackItem)
}

export async function getFeedbackDetail(feedbackId: string | number): Promise<FeedbackItem> {
  const data = await callFirst<AnyRecord>([
    () => get(`/api/support/feedback/${feedbackId}`),
    () => get(`/api/user/feedback/${feedbackId}`),
    () => get(`/api/feedback/${feedbackId}`),
  ])

  return normalizeFeedbackItem(data)
}

export async function replyFeedback(
    feedbackId: string | number,
    replyContent: string,
): Promise<FeedbackItem> {
  const trimmed = replyContent.trim()

  if (!trimmed) {
    throw new Error('Reply content cannot be empty.')
  }

  const payload = {
    content: trimmed,
    reply: trimmed,
    replyContent: trimmed,
    answer: trimmed,
    status: 'REPLIED',
  }

  const data = await callFirst<AnyRecord>([
    () => post(`/api/support/feedback/${feedbackId}/reply`, payload),
    () => put(`/api/support/feedback/${feedbackId}/reply`, payload),
    () => post(`/api/user/feedback/${feedbackId}/reply`, payload),
    () => put(`/api/user/feedback/${feedbackId}/reply`, payload),
    () => post(`/api/feedback/${feedbackId}/reply`, payload),
    () => put(`/api/feedback/${feedbackId}/reply`, payload),
  ])

  return normalizeFeedbackItem({
    feedbackId,
    ...data,
    replyContent: data.replyContent ?? data.reply ?? trimmed,
    reply: data.reply ?? data.replyContent ?? trimmed,
    status: data.status ?? 'REPLIED',
  })
}

export async function updateFeedbackStatus(
    feedbackId: string | number,
    status: string,
): Promise<FeedbackItem> {
  const payload = {
    status,
  }

  const data = await callFirst<AnyRecord>([
    () => put(`/api/support/feedback/${feedbackId}/status`, payload),
    () => put(`/api/user/feedback/${feedbackId}/status`, payload),
    () => put(`/api/feedback/${feedbackId}/status`, payload),
    () => put(`/api/support/feedback/${feedbackId}`, payload),
    () => put(`/api/user/feedback/${feedbackId}`, payload),
    () => put(`/api/feedback/${feedbackId}`, payload),
  ])

  return normalizeFeedbackItem({
    feedbackId,
    ...data,
    status: data.status ?? status,
  })
}

export async function listLogs(params: AnyRecord = {}): Promise<OperationLog[]> {
  const data = await callFirst<unknown>([
    () => get('/api/user/logs', params),
  ])

  return asArray(data) as OperationLog[]
}

export async function listFacultyLogs(params: AnyRecord = {}): Promise<OperationLog[]> {
  const data = await callFirst<unknown>([
    () => get('/api/user/logs/faculty', params),
  ])

  return asArray(data) as OperationLog[]
}

export async function getLogsByUser(userId: string | number): Promise<OperationLog[]> {
  const data = await callFirst<unknown>([
    () => get(`/api/user/logs/${userId}`),
    () => get('/api/user/logs', { userId }),
  ])

  return asArray(data) as OperationLog[]
}

export async function listAllStudents(params: AnyRecord = {}): Promise<UserAccount[]> {
  const data = await callFirst<unknown>([
    () => get('/api/user/students/all', params),
  ])

  return asArray(data) as UserAccount[]
}

export const getAllStudents = listAllStudents
