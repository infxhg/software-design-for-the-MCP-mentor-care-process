/**
 * User API - Login, User Info
 *
 * Backend endpoints:
 *   GET /api/user/login?username=xxx&password=xxx
 *   GET /api/user/userInfo?username=xxx
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
  id: string       // e.g. "org_dcs", "org_fst"
  name: string     // e.g. "计算机科学系 (DCS)"
  type: string     // FACULTY, DEPARTMENT, MAJOR, MCP_GROUP
  parentId: string // parent org unit id
}

export interface UserInfoDTO {
  user: UserEntity
  roles: string[]        // e.g. ["MENTOR", "COORDINATOR"]
  permissions: string[]  // e.g. ["user:update"]
  orgUnits?: OrgUnitEntity[]  // Backend no longer returns this field
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

  return res.data // JWT token
}

/**
 * Get user info (roles, permissions, org units)
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

// ---------- Role mapping ----------

/**
 * Map backend role codes to frontend role strings
 * Backend returns: STUDENT, MENTOR, COORDINATOR, FACULTY_CONSULTANT, ADMIN, SUPPORT_STAFF
 * Frontend uses:  student, mentor, coordinator, consultant, admin, support
 */
export function mapBackendRole(backendRoles: string[]): string {
  const roleMap: Record<string, string> = {
    'ADMIN': 'admin',
    'FACULTY_CONSULTANT': 'consultant',
    'COORDINATOR': 'coordinator',
    'MENTOR': 'mentor',
    'STUDENT': 'student',
    'SUPPORT_STAFF': 'support',
  }

  // Priority: admin > consultant > coordinator > mentor > student > support
  const priority = ['ADMIN', 'FACULTY_CONSULTANT', 'COORDINATOR', 'MENTOR', 'STUDENT', 'SUPPORT_STAFF']

  for (const role of priority) {
    if (backendRoles.includes(role)) {
      return roleMap[role] || 'student'
    }
  }

  return 'student'
}
