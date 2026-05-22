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

export function mapBackendRole(roles?: string[] | string | null): FrontendRole {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : []
  const normalized = list.map((r) => String(r).toUpperCase())

  if (normalized.some((r) => r.includes('ADMIN'))) return 'admin'
  if (normalized.some((r) => r.includes('SUPPORT'))) return 'support'
  if (normalized.some((r) => r.includes('CONSULTANT') || r.includes('FACULTY'))) return 'consultant'
  if (normalized.some((r) => r.includes('COORDINATOR') || r.includes('MCP'))) return 'coordinator'
  if (normalized.some((r) => r.includes('MENTOR'))) return 'mentor'

  return 'student'
}

export async function loginApi(account: string, password: string): Promise<string> {
  const payload = {
    account,
    username: account,
    password,
  }

  const data = await callFirst<string | AnyRecord>([
    () => post('/api/user/login', payload),
  ])

  if (typeof data === 'string') {
    const token = data.trim()

    if (token) {
      return token.replace(/^Bearer\s+/i, '')
    }

    return `local-login-token-${Date.now()}`
  }

  const token =
      data.token ??
      data.accessToken ??
      data.jwt ??
      data.authorization ??
      data.Authorization ??
      data.data?.token ??
      data.data?.accessToken ??
      data.data?.jwt ??
      data.data?.authorization ??
      data.data?.Authorization

  if (token) {
    return String(token).replace(/^Bearer\s+/i, '')
  }

  return `local-login-token-${Date.now()}`
}

export async function getUserInfoApi(account?: string): Promise<UserInfoDTO> {
  const params = account
      ? {
        account,
        username: account,
      }
      : undefined

  return callFirst<UserInfoDTO>([
    () => get('/api/user/userInfo', params),
    () => get('/api/user/userInfo'),
  ])
}

export async function getInternalUserInfo(): Promise<UserInfoDTO> {
  return callFirst<UserInfoDTO>([
    () => get('/internal/userInfo'),
    () => get('/api/internal/userInfo'),
  ])
}

export async function getUserInfoByIdApi(userId: string | number): Promise<UserInfoDTO> {
  return callFirst<UserInfoDTO>([
    () => get(`/api/user/${userId}`),
    () => get('/api/user/info', { userId }),
    () => get('/api/user/userInfo', { userId }),
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

  const id = encodeURIComponent(String(feedbackId))

  const payload = {
    feedbackId,
    id: feedbackId,
    replyContent: trimmed,
    reply: trimmed,
    answer: trimmed,
    status: 'REPLIED',
  }

  const response = await put(`/api/user/feedback/${id}`, payload)
  const data = normalizeApiData<AnyRecord>(response)

  return normalizeFeedbackItem({
    feedbackId,
    ...data,
    replyContent: data.replyContent ?? data.reply ?? data.answer ?? trimmed,
    reply: data.reply ?? data.replyContent ?? data.answer ?? trimmed,
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
    () => put(`/api/user/feedback/${feedbackId}`, payload),
    () => put(`/api/user/feedback/${feedbackId}/status`, payload),
    () => put(`/api/support/feedback/${feedbackId}/status`, payload),
    () => put(`/api/feedback/${feedbackId}/status`, payload),
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
