/**
 * src/api/org.ts
 *
 * Organization APIs:
 * - organization tree
 * - admin organization CRUD
 * - mentor/student search
 * - coordinator department search
 */

import { del, get, post, postForm, put } from './request'

export interface OrgUnit {
  id: string
  name: string
  type: string
  parentId?: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface CreateOrgUnitPayload {
  name: string
  type: 'FACULTY' | 'DEPARTMENT' | 'DEPT' | 'MAJOR' | 'GROUP' | string
  parentId?: string | null
  sortOrder?: number
  [key: string]: any
}

export interface UpdateOrgUnitPayload {
  name?: string
  sortOrder?: number
  parentId?: string | null
  [key: string]: any
}

export interface MentorFromApi {
  id: string
  mentorId: string
  name: string
  mentorName: string
  email?: string | null
  office?: string | null
  departmentName?: string | null
  groupId?: string | null
  raw?: any
}

export interface StudentFromApi {
  id: string
  studentId: string
  username?: string
  name: string
  realName?: string | null
  email?: string | null
  phone?: string | null
  major?: string | null
  majorId?: string | null
  status?: string | number | null
  groupId?: string | null
  raw?: any
}

// ==================== Organization Tree / Admin CRUD ====================

export async function getOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<OrgUnit[]>('/api/org/units')
  return res.data || []
}

export async function getAdminOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<OrgUnit[]>('/api/org/admin/units')
  return res.data || []
}

export async function getRawOrgUnits(): Promise<OrgUnit[]> {
  return await getOrgUnits()
}

export async function getOrgUnitById(id: string): Promise<OrgUnit | null> {
  const res = await get<OrgUnit>(`/api/org/admin/units/${encodeURIComponent(id)}`)
  return res.data || null
}

export async function getOrgUnit(unitId: string): Promise<OrgUnit | null> {
  const res = await get<OrgUnit>(`/api/org/unit/${encodeURIComponent(unitId)}`)
  return res.data || null
}

export async function createOrgUnit(payload: CreateOrgUnitPayload): Promise<OrgUnit | null> {
  const res = await post<OrgUnit>('/api/org/admin/units', payload)
  return res.data || null
}

export async function updateOrgUnit(
  id: string,
  payload: UpdateOrgUnitPayload,
): Promise<OrgUnit | null> {
  const res = await put<OrgUnit>(`/api/org/admin/units/${encodeURIComponent(id)}`, payload)
  return res.data || null
}

export async function deleteOrgUnit(id: string): Promise<void> {
  await del<null>(`/api/org/admin/units/${encodeURIComponent(id)}`)
}

export async function importOrgUnitsFromExcel(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await postForm<any>('/api/org/admin/units/import-excel', formData)
  return res.data
}

// ==================== Mentors ====================

export async function getMentorsByOrgUnit(orgUnitId: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>(`/api/org/mentors/${encodeURIComponent(orgUnitId)}`)
  return (res.data || []).map(normalizeMentor)
}

export const getMentorsByOrg = getMentorsByOrgUnit

export async function searchDcsMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/api/org/mentors/org_dcs', { keyword })
  return (res.data || []).map(normalizeMentor)
}

export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/api/org/mentors/search', { keyword })
  return (res.data || []).map(normalizeMentor)
}

export async function searchMyDeptMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/api/org/my-dept/mentors', { keyword })
  return (res.data || []).map(normalizeMentor)
}

// ==================== Students ====================

export async function getDcsStudents(): Promise<StudentFromApi[]> {
  const res = await get<any[]>('/api/org/students/org_dcs')
  return (res.data || []).map((item) => normalizeStudent(item))
}

export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const res = await get<any[]>('/api/org/students/search', { keyword })
  return (res.data || []).map((item) => normalizeStudent(item))
}

/**
 * The OpenAPI only provides /api/org/students/org_dcs for department-students.
 * This wrapper keeps a stable function name for pages.
 */
export async function getStudentsByOrg(orgUnitId: string): Promise<StudentFromApi[]> {
  if (!orgUnitId || orgUnitId === 'org_dcs') {
    return await getDcsStudents()
  }

  return await searchAllStudents(orgUnitId)
}

export async function getStudentById(studentId: string): Promise<StudentFromApi | null> {
  const res = await get<any>(`/api/org/student/${encodeURIComponent(studentId)}`)
  return res.data ? normalizeStudent(res.data, studentId) : null
}

export const searchStudentById = getStudentById

export async function getMyDeptMember(userId: string): Promise<StudentFromApi | MentorFromApi | null> {
  const res = await get<any>(`/api/org/my-dept/member/${encodeURIComponent(userId)}`)
  const raw = res.data
  if (!raw) return null

  if (raw.mentorId || raw.office || raw.departmentName) {
    return normalizeMentor(raw)
  }

  return normalizeStudent(raw, userId)
}

// ==================== Normalizers ====================

function normalizeMentor(raw: any): MentorFromApi {
  const mentorId = String(raw?.mentorId ?? raw?.id ?? raw?.userId ?? '')
  const mentorName = String(raw?.mentorName ?? raw?.name ?? raw?.realName ?? raw?.username ?? mentorId)

  return {
    id: mentorId,
    mentorId,
    name: mentorName,
    mentorName,
    email: raw?.email ?? null,
    office: raw?.office ?? null,
    departmentName: raw?.departmentName ?? raw?.department ?? null,
    groupId: raw?.groupId ?? null,
    raw,
  }
}

export function normalizeStudent(raw: any, fallbackId = ''): StudentFromApi {
  const studentId = String(
    raw?.studentId ??
    raw?.id ??
    raw?.userId ??
    raw?.username ??
    fallbackId ??
    '',
  )

  const name = String(
    raw?.studentName ??
    raw?.name ??
    raw?.realName ??
    raw?.username ??
    studentId
  )

  return {
    id: String(raw?.id ?? studentId),
    studentId,
    username: raw?.username,
    name,
    realName: raw?.realName ?? null,
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId ?? null,
    majorId: raw?.majorId ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId ?? null,
    raw,
  }
}
