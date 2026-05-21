import { get, post, unwrap, type QueryParams } from './request'

export type FrontendRole = 'student' | 'mentor' | 'coordinator' | 'consultant' | 'admin' | 'support'

export interface UserAccount {
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
}

export interface UserInfoData {
  user: UserAccount
  roles: string[]
  permissions: string[]
}

export interface FeedbackItem {
  id?: string
  userId?: string
  content: string
  createTime?: string
  [key: string]: any
}

export interface OperationLog {
  id: string
  userId: string
  username: string
  action: string
  detail: string
  createTime: string
}

export function mapBackendRole(roles: string[] = []): FrontendRole {
  const upper = roles.map((r) => String(r).toUpperCase())

  if (upper.some((r) => r.includes('ADMIN'))) return 'admin'
  if (upper.some((r) => r.includes('SUPPORT'))) return 'support'
  if (upper.some((r) => r.includes('FACULTY') || r.includes('CONSULTANT'))) return 'consultant'
  if (upper.some((r) => r.includes('COORDINATOR'))) return 'coordinator'
  if (upper.some((r) => r.includes('MENTOR'))) return 'mentor'
  return 'student'
}

export async function loginApi(username: string, password: string): Promise<string> {
  const res = await get<string>(
    '/api/user/login',
    {
      username,
      password,
    },
    { skipAuth: true },
  )
  return unwrap(res)
}

export async function getUserInfoApi(username?: string): Promise<UserInfoData> {
  const res = await get<UserInfoData>('/api/user/userInfo', username ? { username } : undefined)
  return unwrap(res)
}

export async function registerSendCode(emailAccount: string): Promise<any> {
  const res = await post<any>(
    '/api/user/register',
    undefined,
    {
      params: { emailAccount },
      skipAuth: true,
    } as any,
  )
  return unwrap(res)
}

export async function registerVerify(payload: {
  user: {
    email: string
    username: string
    passwordHash: string
  }
  verificationCode: string
}): Promise<any> {
  const res = await post<any>('/api/user/register/verify', payload, { skipAuth: true })
  return unwrap(res)
}

export async function updateUserInfo(payload: Partial<UserAccount>): Promise<any> {
  const res = await post<any>('/api/user/updateInfo', payload)
  return unwrap(res)
}

export async function submitFeedback(content: string): Promise<FeedbackItem> {
  const res = await post<FeedbackItem>('/api/user/feedback', { content })
  return unwrap(res)
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const res = await get<FeedbackItem[]>('/api/user/feedback')
  return unwrap(res) || []
}

export async function listLogs(params?: {
  userId?: string
  action?: string
  startTime?: string
  endTime?: string
}): Promise<OperationLog[]> {
  const res = await get<OperationLog[]>('/api/user/logs', params as QueryParams)
  return unwrap(res) || []
}

export async function listFacultyLogs(params?: {
  action?: string
  startTime?: string
  endTime?: string
  studentIds?: string[]
}): Promise<OperationLog[]> {
  const res = await get<OperationLog[]>('/api/user/logs/faculty', params as QueryParams)
  return unwrap(res) || []
}

export async function listAllStudents(): Promise<UserAccount[]> {
  const res = await get<UserAccount[]>('/api/user/students/all')
  return unwrap(res) || []
}


// ==================== Backward compatibility ====================

export type UserEntity = UserAccount
export type UserInfoDTO = UserInfoData

export interface OrgUnitEntity {
  id: string
  name: string
  type: string
  parentId?: string | null
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

export interface UserLogItem extends OperationLog {}
export type UserLogQuery = Parameters<typeof listLogs>[0]

export const sendRegisterCode = registerSendCode
export const sendRegisterCodeByQuery = registerSendCode
export const getAllStudents = listAllStudents

export async function getInternalUserInfo(userId: string): Promise<UserAccount | null> {
  const res = await get<UserAccount>('/internal/userInfo', { userId })
  return unwrap(res) || null
}

export const getUserInfoByIdApi = getInternalUserInfo

export async function getLogsByUser(userId: string): Promise<OperationLog[]> {
  return listLogs({ userId })
}

export async function getFeedbackDetail(feedbackId: string): Promise<FeedbackItem | null> {
  const feedback = await listFeedback()
  return feedback.find((item) => String(item.id) === String(feedbackId)) || null
}

export async function replyFeedback(_feedbackId: string, _reply: string): Promise<void> {
  throw new Error('replyFeedback: backend endpoint is not provided in current OpenAPI.')
}

export async function updateFeedbackStatus(_feedbackId: string, _status: string): Promise<void> {
  throw new Error('updateFeedbackStatus: backend endpoint is not provided in current OpenAPI.')
}
