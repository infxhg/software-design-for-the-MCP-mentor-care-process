/**
 * User API - Login, register, user info.
 *
 * Backend endpoints from OpenAPI:
 *   POST /api/user/register?emailAccount=xxx
 *   POST /api/user/register/verify
 *   GET  /api/user/login?username=xxx&password=xxx
 *   GET  /api/user/userInfo?username=xxx
 *   POST /api/user/updateInfo
 *   GET  /api/user/students/all
 */

import { get, post } from './request'

// ---------- Types ----------

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
}

export interface OrgUnitEntity {
  id: string
  name: string
  type?: string
  unitType?: string | number
  parentId: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
}

export interface UserInfoDTO {
  user: UserEntity
  roles: string[]
  permissions: string[]
  orgUnits?: OrgUnitEntity[]
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

// ---------- API calls ----------

export async function sendRegisterCode(emailAccount: string): Promise<any> {
  const res = await post<any>('/user/register', undefined, { emailAccount })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to send verification code')
  }

  return res.data
}

export async function registerWithCode(payload: RegisterVerifyPayload): Promise<void> {
  const res = await post<null>('/user/register/verify', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Register failed')
  }
}

/**
 * Login with username/email and password.
 * Returns JWT token string on success.
 */
export async function loginApi(username: string, password: string): Promise<string> {
  const res = await get<string>('/user/login', {
    username,
    password,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Login failed')
  }

  return res.data
}

/**
 * Get user info by username/account.
 * LoginView.vue 登录成功后先保存 token，再调用这个接口获取 roles。
 */
export async function getUserInfoApi(username: string): Promise<UserInfoDTO> {
  const res = await get<UserInfoDTO>('/user/userInfo', {
    username,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to get user info')
  }

  return res.data
}

export async function updateUserInfoApi(payload: UpdateUserInfoPayload): Promise<void> {
  const res = await post<null>('/user/updateInfo', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update user info')
  }
}

export async function getAllStudentsApi(): Promise<UserEntity[]> {
  const res = await get<UserEntity[]>('/user/students/all')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to fetch students')
  }

  return res.data || []
}

/**
 * Backward-compatible helper.
 * OpenAPI 当前没有 /api/user/userInfoById；按 id 查学生请优先用 org.ts 的 searchStudentById。
 */
export async function getUserInfoByIdApi(id: string): Promise<UserInfoDTO> {
  const res = await get<UserInfoDTO>('/user/userInfo', {
    username: id,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to get user info by id')
  }

  return res.data
}

// ---------- Role mapping ----------

/**
 * Backend common role formats:
 *   STUDENT
 *   ROLE_STUDENT
 *   FACULTY_CONSULTANT
 *   ROLE_FACULTY_CONSULTANT
 *
 * Frontend roles:
 *   student | mentor | coordinator | consultant | admin | support
 */
export function mapBackendRole(backendRoles: string[] = []): string {
  const normalized = backendRoles.map((r) => String(r || '').toUpperCase())

  const has = (keyword: string) =>
    normalized.some((r) => r === keyword || r === `ROLE_${keyword}` || r.includes(keyword))

  if (has('ADMIN')) return 'admin'
  if (has('FACULTY_CONSULTANT') || has('CONSULTANT')) return 'consultant'
  if (has('MCP_COORDINATOR') || has('COORDINATOR')) return 'coordinator'
  if (has('MENTOR')) return 'mentor'
  if (has('SUPPORT_STAFF') || has('SUPPORT')) return 'support'
  if (has('STUDENT')) return 'student'

  return 'student'
}
