/**
 * src/api/org.ts
 *
 * Organization API - mentors, students, organization units.
 */

import { get, post, put, del, postForm } from './request'

// ==================== Types ====================

export interface MentorFromApi {
  mentorId: string
  mentorName: string
  email: string
  office: string
  departmentName: string

  groupId?: string | number | null
  groupIds?: Array<string | number> | string | null
  mcpGroupId?: string | number | null

  [key: string]: any
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

  [key: string]: any
}

export interface OrgUnit {
  id: string
  name: string
  type: string
  parentId: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
  [key: string]: any
}

export interface CreateOrgUnitPayload {
  name: string
  type: 'FACULTY' | 'DEPARTMENT' | 'MAJOR' | 'GROUP' | string
  parentId?: string | null
  sortOrder?: number
}

export interface UpdateOrgUnitPayload {
  name?: string
  sortOrder?: number
  parentId?: string | null
  type?: string
}

// ==================== Mentor API ====================

export async function getMentorsByOrg(
  orgUnitId: string,
  keyword?: string,
): Promise<MentorFromApi[]> {
  const oid = String(orgUnitId || '').trim()
  if (!oid) return []

  const res = await get<any[]>(
    `/api/org/mentors/${encodeURIComponent(oid)}`,
    { keyword },
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get mentors')
  }

  return (res.data || []).map(normalizeMentor)
}

export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/api/org/mentors/search', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors')
  }

  return (res.data || []).map(normalizeMentor)
}

export async function searchMyDeptMentors(keyword?: string): Promise<MentorFromApi[]> {
  const res = await get<any[]>('/api/org/my-dept/mentors', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors in my department')
  }

  return (res.data || []).map(normalizeMentor)
}

// ==================== Student API ====================

export async function getStudentsByOrg(
  orgId: string,
  keyword?: string,
): Promise<StudentFromApi[]> {
  const oid = String(orgId || '').trim()
  if (!oid) return []

  const res = await get<any[]>(
    `/api/org/students/${encodeURIComponent(oid)}`,
    { keyword },
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get students')
  }

  return (res.data || []).map((item) => normalizeStudent(item, item.studentId ?? item.id))
}

export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const res = await get<any[]>('/api/org/students/search', {
    keyword,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search students')
  }

  return (res.data || []).map((item) => normalizeStudent(item, item.studentId ?? item.id))
}

export async function searchStudentById(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId || '').trim()
  if (!sid) return null

  const res = await get<any>(`/api/org/student/${encodeURIComponent(sid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeStudent(res.data, sid)
}

export async function getMyDeptMember(userId: string): Promise<StudentFromApi | null> {
  const uid = String(userId || '').trim()
  if (!uid) return null

  const res = await get<any>(`/api/org/my-dept/member/${encodeURIComponent(uid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeStudent(res.data, uid)
}

// ==================== Organization Unit API ====================

export async function getOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<any[]>('/api/org/admin/units')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get organization units')
  }

  return (res.data || []).map(normalizeOrgUnit)
}

export async function getPublicOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<any[]>('/api/org/units')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get organization tree')
  }

  return (res.data || []).map(normalizeOrgUnit)
}

export async function getOrgUnitById(id: string): Promise<OrgUnit | null> {
  const uid = String(id || '').trim()
  if (!uid) return null

  const res = await get<any>(`/api/org/admin/units/${encodeURIComponent(uid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeOrgUnit(res.data)
}

export async function getPublicOrgUnitById(unitId: string): Promise<OrgUnit | null> {
  const uid = String(unitId || '').trim()
  if (!uid) return null

  const res = await get<any>(`/api/org/unit/${encodeURIComponent(uid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeOrgUnit(res.data)
}

export async function createOrgUnit(payload: CreateOrgUnitPayload): Promise<any> {
  const res = await post<any>('/api/org/admin/units', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to create organization unit')
  }

  return res.data
}

export async function updateOrgUnit(
  id: string,
  payload: UpdateOrgUnitPayload,
): Promise<any> {
  const uid = String(id || '').trim()
  if (!uid) throw new Error('Organization unit id is required')

  const res = await put<any>(`/api/org/admin/units/${encodeURIComponent(uid)}`, payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update organization unit')
  }

  return res.data
}

export async function deleteOrgUnit(id: string): Promise<void> {
  const uid = String(id || '').trim()
  if (!uid) throw new Error('Organization unit id is required')

  const res = await del<null>(`/api/org/admin/units/${encodeURIComponent(uid)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete organization unit')
  }
}

export async function importOrgUnitsFromExcel(file: File): Promise<any> {
  if (!file || file.size === 0) {
    throw new Error('Uploaded file is empty.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const res = await postForm<any>('/api/org/admin/units/import-excel', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import organization units')
  }

  return res.data
}

// ==================== Helpers ====================

function normalizeMentor(raw: any): MentorFromApi {
  const mentorId = raw.mentorId ?? raw.id ?? raw.userId ?? ''
  const mentorName =
    raw.mentorName ?? raw.realName ?? raw.name ?? raw.username ?? String(mentorId)

  return {
    ...raw,
    mentorId: String(mentorId),
    mentorName: String(mentorName || ''),
    email: raw.email ?? '',
    office: raw.office ?? raw.location ?? '',
    departmentName: raw.departmentName ?? raw.department ?? '',
    groupId: raw.groupId ?? raw.mcpGroupId ?? null,
  }
}

function normalizeStudent(raw: any, fallbackId: string): StudentFromApi {
  const id = raw.id ?? raw.studentId ?? raw.userId ?? fallbackId
  const username = raw.username ?? raw.userName ?? String(id)
  const realName = raw.realName ?? raw.name ?? raw.studentName ?? null
  const email = raw.email ?? ''
  const phone = raw.phone ?? null
  const status = raw.status ?? null
  const groupId = raw.groupId ?? raw.mcpGroupId ?? null
  const majorId = raw.majorId ?? raw.major ?? null

  return {
    ...raw,
    id,
    username,
    realName,
    email,
    phone,
    status,
    groupId,
    majorId,
  }
}

function normalizeOrgUnit(raw: any): OrgUnit {
  return {
    ...raw,
    id: String(raw.id ?? raw.unitId ?? raw.orgUnitId ?? ''),
    name: raw.name ?? raw.unitName ?? '',
    type: raw.type ?? raw.unitType ?? '',
    parentId: raw.parentId ?? raw.parent_id ?? null,
    sortOrder: raw.sortOrder ?? raw.sort ?? 0,
  }
}
