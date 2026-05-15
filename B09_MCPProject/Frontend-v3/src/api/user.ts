/**
 * User API - Login, User Info
 *
 * Backend endpoints:
 *   GET /api/user/login?username=xxx&password=xxx
 *   GET /api/user/userInfo?username=xxx
 *   GET /api/user/userInfoById?id=xxx
 */

import { get } from './request'

// ---------- Types ----------

export interface UserEntity {
  id: string
  username: string
  realName: string | null
  phone: string | null
  email: string
  status: number
}

export interface OrgUnitEntity {
  id: string
  name: string
  type: string
  parentId: string
}

export interface UserInfoDTO {
  user: UserEntity
  roles: string[]
  permissions: string[]
  orgUnits?: OrgUnitEntity[]
}

// ---------- API calls ----------

/**
 * Login with username/email and password
 * Returns JWT token string on success
 */
export async function loginApi(username: string, password: string): Promise<string> {
  const res = await get<string>(
      `/user/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  )

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Login failed')
  }

  return res.data
}

/**
 * Get current/login user info by username.
 *
 * 修改点：
 * 这个函数保留给 LoginView.vue 使用。
 * 登录流程还是用 username/account 获取当前登录用户信息。
 */
export async function getUserInfoApi(username: string): Promise<UserInfoDTO> {
  const res = await get<UserInfoDTO>(
      `/user/userInfo?username=${encodeURIComponent(username)}`,
  )

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to get user info')
  }

  return res.data
}

/**
 * Get student/user info by database/student ID.
 *
 * 修改点：
 * 新增按 id 查询用户信息的方法。
 * Search Student Info 应该用 student ID 搜索，而不是 username。
 *
 * 后端需要提供：
 *   GET /api/user/userInfoById?id=xxx
 */
export async function getUserInfoByIdApi(id: string): Promise<UserInfoDTO> {
  const res = await get<UserInfoDTO>(
      `/user/userInfoById?id=${encodeURIComponent(id)}`,
  )

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to get user info by id')
  }

  return res.data
}

// ---------- Role mapping ----------

/**
 * Map backend role codes to frontend role strings
 * Backend returns: STUDENT, MENTOR, COORDINATOR, FACULTY_CONSULTANT, ADMIN, SUPPORT_STAFF
 * Frontend uses:  student, mentor, coordinator, consultant, admin, support
 */
export function mapBackendRole(backendRoles: string[]): string {
  const roleMap: Record<string, string> = {
    ADMIN: 'admin',
    FACULTY_CONSULTANT: 'consultant',
    COORDINATOR: 'coordinator',
    MENTOR: 'mentor',
    STUDENT: 'student',
    SUPPORT_STAFF: 'support',
  }

  const priority = [
    'ADMIN',
    'FACULTY_CONSULTANT',
    'COORDINATOR',
    'MENTOR',
    'STUDENT',
    'SUPPORT_STAFF',
  ]

  for (const role of priority) {
    if (backendRoles.includes(role)) {
      return roleMap[role] || 'student'
    }
  }

  return 'student'
}
