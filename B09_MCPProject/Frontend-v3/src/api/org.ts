/**
 * Organization API - Mentor & Student search
 *
 * Backend endpoints:
 *   GET /api/org/mentors/{orgUnitId}?keyword=xxx     (Coordinator - by org unit)
 *   GET /api/org/mentors/search?keyword=xxx          (Faculty Consultant - global)
 *   GET /api/org/students/{orgId}?keyword=xxx        (Coordinator - by department)
 *   GET /api/org/students/search?keyword=xxx         (Faculty Consultant - global)
 *   GET /api/org/student/{studentId}                 (Exact student query by ID)
 *   GET /api/org/units?unitType=xxx                  (Get org tree)
 */

import { get } from './request'

// ---------- Types ----------

export interface MentorFromApi {
  mentorId: string
  mentorName: string
  email: string
  office: string
  departmentName: string

  /**
   * 修改点：
   * 目前接口文档里的 mentor response 没写 groupId，
   * 但需求文档要求 Search Mentor Info 显示 group ID。
   * 所以前端先兼容这些可能字段。
   */
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
  unitType: number
  parentId: string | null
}

// ---------- Mentor API ----------

/**
 * Coordinator: search mentors under an org unit.
 *
 * 修改点：
 * 这个接口对应文档里的：
 * GET /api/org/mentors/{orgUnitId}?keyword=xxx
 *
 * orgUnitId 可以是 department id，也可能是 group id，
 * 具体取决于后端接口如何定义。
 */
export async function getMentorsByOrg(orgUnitId: string, keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/${encodeURIComponent(orgUnitId)}${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get mentors')
  }

  return res.data || []
}

/**
 * Faculty Consultant: global mentor search.
 *
 * 修改点：
 * 这个接口只给 Faculty Consultant 用。
 * Coordinator 不应该调用这个接口，否则会 403。
 */
export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/search${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors')
  }

  return res.data || []
}

// ---------- Student API ----------

export async function getStudentsByOrg(orgId: string, keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/${encodeURIComponent(orgId)}${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get students')
  }

  return res.data || []
}

export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/search${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search students')
  }

  return res.data || []
}

/**
 * Exact query one student by Student ID.
 */
export async function searchStudentById(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId).trim()

  if (!sid) {
    return null
  }

  const res = await get<StudentFromApi>(`/org/student/${encodeURIComponent(sid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return res.data
}

// ---------- Org Tree API ----------

export async function getOrgUnits(unitType?: number): Promise<OrgUnit[]> {
  const param = unitType !== undefined ? `?unitType=${unitType}` : ''
  const res = await get<OrgUnit[]>(`/org/units${param}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get org units')
  }

  return res.data || []
}
