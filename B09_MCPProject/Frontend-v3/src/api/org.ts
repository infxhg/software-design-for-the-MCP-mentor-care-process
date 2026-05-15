/**
 * Organization API - Mentor & Student search
 *
 * Backend endpoints:
 *   GET /api/org/mentors/{orgId}?keyword=xxx        (Coordinator - by department)
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
}

export interface StudentFromApi {
  /**
   * 修改点：
   * 后端有时可能返回 number，有时返回 string。
   * 前端统一用 String(student.id) 处理。
   */
  id: string | number
  username: string
  realName: string | null
  email: string
  phone: string | null

  /**
   * 修改点：
   * 精确查询接口可能会返回 status、groupId、majorId。
   * 有些接口不返回，所以设为可选。
   */
  status?: string | number | null
  groupId?: string | null
  majorId?: string | null
}

export interface OrgUnit {
  id: string
  name: string
  unitType: number // 1=FACULTY, 2=DEPARTMENT, 3=MAJOR, 4=MCP_GROUP
  parentId: string | null
}

// ---------- Mentor API ----------

/** Coordinator: search mentors within a department */
export async function getMentorsByOrg(orgId: string, keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/${orgId}${kw}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get mentors')
  return res.data || []
}

/** Faculty Consultant: search all mentors globally */
export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/search${kw}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to search mentors')
  return res.data || []
}

// ---------- Student API ----------

/** Coordinator: search students within a department */
export async function getStudentsByOrg(orgId: string, keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/${orgId}${kw}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get students')
  return res.data || []
}

/** Faculty Consultant: search all students globally */
export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/search${kw}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to search students')
  return res.data || []
}

/**
 * Search one student by exact Student ID.
 *
 * 修改点：
 * 这里改成调用精确查询接口：
 *   GET /api/org/student/{studentId}
 *
 * 注意：
 * request.ts 会自动加 /api，
 * 所以这里写 /org/student/${studentId}。
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

/** Get organization units (faculties, departments, majors) */
export async function getOrgUnits(unitType?: number): Promise<OrgUnit[]> {
  const param = unitType !== undefined ? `?unitType=${unitType}` : ''
  const res = await get<OrgUnit[]>(`/org/units${param}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get org units')
  return res.data || []
}
