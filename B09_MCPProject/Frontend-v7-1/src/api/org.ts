/**
 * Organization API - Mentor & Student search.
 *
 * Backend endpoints from OpenAPI:
 *   GET /api/org/mentors/{orgUnitId}?keyword=xxx
 *   GET /api/org/mentors/search?keyword=xxx
 *   GET /api/org/students/{orgId}?keyword=xxx
 *   GET /api/org/students/search?keyword=xxx
 *   GET /api/org/student/{studentId}
 *   GET /api/org/my-dept/member/{userId}
 *   GET /api/org/my-dept/mentors?keyword=xxx
 *   GET /api/org/admin/units
 */

import { get } from './request'

// ---------- Types ----------

export interface MentorFromApi {
  mentorId: string
  mentorName: string
  email: string
  office: string
  departmentName: string

  groupId?: string | number | null
  groupIds?: Array<string | number> | string | null
  mcpGroupId?: string | number | null
}

export interface StudentFromApi {
  id: string | number
  username: string
  realName: string | null
  email: string
  phone: string | null

  status?: string | number | null
  groupId?: string | null
  majorId?: string | null
}

export interface OrgUnit {
  id: string
  name: string
  unitType?: number
  type?: string
  parentId: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
}

// ---------- Normalizers ----------

function normalizeMentor(raw: any): MentorFromApi {
  return {
    mentorId: String(raw?.mentorId ?? raw?.id ?? raw?.userId ?? ''),
    mentorName: String(raw?.mentorName ?? raw?.realName ?? raw?.username ?? raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    office: String(raw?.office ?? raw?.officeLocation ?? ''),
    departmentName: String(raw?.departmentName ?? raw?.department ?? raw?.orgName ?? ''),
    groupId: raw?.groupId ?? raw?.mcpGroupId ?? null,
    groupIds: raw?.groupIds ?? null,
    mcpGroupId: raw?.mcpGroupId ?? null,
  }
}

function normalizeStudent(raw: any): StudentFromApi {
  const id = raw?.id ?? raw?.studentId ?? raw?.userId ?? raw?.username ?? ''
  return {
    id,
    username: String(raw?.username ?? raw?.userName ?? raw?.studentId ?? id),
    realName: raw?.realName ?? raw?.name ?? raw?.studentName ?? null,
    email: String(raw?.email ?? ''),
    phone: raw?.phone ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId ?? raw?.mcpGroupId ?? null,
    majorId: raw?.majorId ?? raw?.major ?? raw?.majorName ?? null,
  }
}

function normalizeOrgUnit(raw: any): OrgUnit {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    type: raw?.type,
    unitType: raw?.unitType,
    parentId: raw?.parentId ?? null,
    path: raw?.path ?? null,
    sortOrder: raw?.sortOrder,
    createTime: raw?.createTime,
  }
}

// ---------- Mentor API ----------

export async function getMentorsByOrg(
  orgUnitId: string,
  keyword?: string,
): Promise<MentorFromApi[]> {
  const res = await get<any[]>(`/org/mentors/${encodeURIComponent(orgUnitId)}`, {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get mentors')
  }

  return (res.data || []).map(normalizeMentor)
}

/**
 * Faculty Consultant: global mentor search by name / email.
 */
export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/org/mentors/search', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors')
  }

  return (res.data || []).map(normalizeMentor)
}

/**
 * Coordinator: search mentors in own department.
 * 后端根据 JWT 自动判断 coordinator 所在 Department。
 */
export async function searchMyDeptMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/org/my-dept/mentors', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors in my department')
  }

  return (res.data || []).map(normalizeMentor)
}

// ---------- Student API ----------

export async function getStudentsByOrg(
  orgId: string,
  keyword?: string,
): Promise<StudentFromApi[]> {
  const res = await get<any[]>(`/org/students/${encodeURIComponent(orgId)}`, {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get students')
  }

  return (res.data || []).map(normalizeStudent)
}

/**
 * Faculty Consultant: global student search.
 */
export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const res = await get<any[]>('/org/students/search', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search students')
  }

  return (res.data || []).map(normalizeStudent)
}

/**
 * Exact query one student by Student ID.
 * Consultant 用这个；Mentor / Coordinator 不要直接用这个，避免越权。
 */
export async function searchStudentById(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId || '').trim()
  if (!sid) return null

  const res = await get<any>(`/org/student/${encodeURIComponent(sid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeStudent(res.data)
}

/**
 * Coordinator: strictly query a member in own department by user id.
 */
export async function getMyDeptMember(userId: string): Promise<StudentFromApi | null> {
  const uid = String(userId || '').trim()
  if (!uid) return null

  const res = await get<any>(`/org/my-dept/member/${encodeURIComponent(uid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeStudent(res.data)
}

// ---------- Org Tree API ----------

/**
 * OpenAPI 当前正式可用的是 /api/org/admin/units。
 * 这里保留 getOrgUnits(unitType) 的前端旧接口名，内部走 admin units 并在前端过滤。
 */
export async function getOrgUnits(unitType?: number | string): Promise<OrgUnit[]> {
  const res = await get<any[]>('/org/admin/units')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get org units')
  }

  let units = (res.data || []).map(normalizeOrgUnit)

  if (unitType !== undefined) {
    const wanted = String(unitType).toUpperCase()
    units = units.filter((u) => {
      return (
        String(u.unitType ?? '').toUpperCase() === wanted ||
        String(u.type ?? '').toUpperCase() === wanted
      )
    })
  }

  return units
}
