/**
 * src/api/user.ts
 *
 * User module:
 * - register/login/user info
 * - feedback
 * - logs
 * - role mapping
 */

import { get, post } from './request'

export interface UserEntity {
  id: string
  username: string
  passwordHash?: string | null
  realName?: string | null
  phone?: string | null
  email?: string | null
  status?: number
  isDeleted?: number
  createTime?: string | null
  updateTime?: string | null
  [key: string]: any
}

export interface OrgUnitEntity {
  id: string
  name: string
  type: string
  parentId?: string | null
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

export interface FeedbackItem {
  id?: string
  feedbackId?: string
  userId?: string
  username?: string
  content?: string
  reply?: string
  status?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
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

export interface UserLogQuery {
  userId?: string
  username?: string
  action?: string
  startTime?: string
  endTime?: string
  [key: string]: string | undefined
}

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. A placeholder has been kept here for future integration.`)
}

// ==================== Register ====================

export async function sendRegisterCode(emailAccount: string): Promise<any> {
  const res = await post<any>(
    `/api/user/register?emailAccount=${encodeURIComponent(emailAccount)}`,
    undefined,
    { skipAuth: true },
  )

  return res.data
}

export const sendRegisterCodeByQuery = sendRegisterCode

export async function registerVerify(payload: RegisterVerifyPayload): Promise<void> {
  await post<null>('/api/user/register/verify', payload, { skipAuth: true })
}

// ==================== Login / User Info ====================

export async function loginApi(username: string, password: string): Promise<string> {
  const res = await get<string>(
    '/api/user/login',
    { username, password },
    { skipAuth: true },
  )

  if (!res.data) {
    throw new Error(res.message || 'Login failed: token is empty.')
  }

  return res.data
}

export async function getUserInfoApi(username: string): Promise<UserInfoDTO> {
  const res = await get<UserInfoDTO>('/api/user/userInfo', { username })

  if (!res.data) {
    throw new Error(res.message || 'Failed to get user info.')
  }

  return res.data
}

export async function getInternalUserInfo(userId: string): Promise<UserEntity | null> {
  const res = await get<UserEntity>('/internal/userInfo', { userId })
  return res.data || null
}

export const getUserInfoByIdApi = getInternalUserInfo

export async function updateUserInfo(payload: UpdateUserInfoPayload): Promise<void> {
  await post<null>('/api/user/updateInfo', payload)
}

export async function getAllStudents(): Promise<UserEntity[]> {
  const res = await get<UserEntity[]>('/api/user/students/all')
  return res.data || []
}

// ==================== Feedback ====================

export async function submitFeedback(content: string): Promise<any> {
  const res = await post<any>('/api/user/feedback', { content })
  return res.data
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const res = await get<FeedbackItem[]>('/api/user/feedback')
  return res.data || []
}

export async function getFeedbackDetail(feedbackId: string): Promise<FeedbackItem> {
  if (!feedbackId) throw new Error('feedbackId is required')
  return missingEndpoint('getFeedbackDetail')
}

export async function replyFeedback(feedbackId: string, reply: string): Promise<void> {
  if (!feedbackId) throw new Error('feedbackId is required')
  if (!reply) throw new Error('reply is required')
  return missingEndpoint('replyFeedback')
}

export async function updateFeedbackStatus(feedbackId: string, status: string): Promise<void> {
  if (!feedbackId) throw new Error('feedbackId is required')
  if (!status) throw new Error('status is required')
  return missingEndpoint('updateFeedbackStatus')
}

// ==================== Logs ====================

export async function listLogs(params?: UserLogQuery): Promise<UserLogItem[]> {
  const res = await get<UserLogItem[]>('/api/user/logs', params)
  return res.data || []
}

export async function listFacultyLogs(params?: UserLogQuery): Promise<UserLogItem[]> {
  const res = await get<UserLogItem[]>('/api/user/logs/faculty', params)
  return res.data || []
}

export async function getLogsByUser(userId: string): Promise<UserLogItem[]> {
  if (!userId) throw new Error('userId is required')

  // Current OpenAPI provides GET /api/user/logs only.
  // Keep this wrapper so /support/log/:userId can call one place.
  return await listLogs({ userId })
}

// ==================== Role Mapping ====================

export type FrontendRole =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'

export function mapBackendRole(backendRoles: string[] = []): FrontendRole {
  const roleText = backendRoles.join(',').toUpperCase()

  if (roleText.includes('ADMIN')) return 'admin'
  if (roleText.includes('SUPPORT')) return 'support'
  if (
    roleText.includes('FACULTY_CONSULTANT') ||
    roleText.includes('CONSULTANT') ||
    roleText.includes('FACULTY')
  ) return 'consultant'
  if (roleText.includes('COORDINATOR') || roleText.includes('MCP')) return 'coordinator'
  if (roleText.includes('MENTOR')) return 'mentor'
  if (roleText.includes('STUDENT')) return 'student'

  return 'student'
}
