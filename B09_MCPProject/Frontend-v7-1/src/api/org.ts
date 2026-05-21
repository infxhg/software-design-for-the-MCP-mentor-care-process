import { get, unwrap } from './request'

export interface OrgUnit {
  id: string
  unitId?: string
  name: string
  type: string
  unitType?: string
  parentId?: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string | null
  updateTime?: string | null
  [key: string]: any
}

export interface MentorInfo {
  id?: string
  mentorId: string
  name?: string
  mentorName: string
  username?: string
  realName?: string
  email?: string | null
  office?: string | null
  departmentName?: string | null
  groupId?: string | null
  raw?: any
  [key: string]: any
}

export interface StudentInfo {
  id?: string
  studentId?: string
  username?: string
  name?: string
  studentName?: string
  realName?: string | null
  phone?: string | null
  email?: string | null
  status?: number | string | null
  isDeleted?: number
  createTime?: string | null
  updateTime?: string | null
  major?: string | null
  majorId?: string | null
  groupId?: string | null
  raw?: any
  [key: string]: any
}

export type MentorFromApi = MentorInfo
export type StudentFromApi = StudentInfo

function normalizeOrgUnit(raw: any): OrgUnit {
  const id = String(raw?.id ?? raw?.unitId ?? '')
  const type = String(raw?.type ?? raw?.unitType ?? '')

  return {
    ...raw,
    id,
    unitId: raw?.unitId ?? id,
    name: String(raw?.name ?? ''),
    type,
    unitType: raw?.unitType ?? type,
    parentId: raw?.parentId ?? null,
    path: raw?.path ?? null,
    sortOrder: raw?.sortOrder,
    createTime: raw?.createTime ?? null,
    updateTime: raw?.updateTime ?? null,
  }
}

function normalizeMentor(raw: any): MentorInfo {
  const mentorId = String(raw?.mentorId ?? raw?.id ?? raw?.userId ?? '')
  const mentorName = String(raw?.mentorName ?? raw?.name ?? raw?.realName ?? raw?.username ?? mentorId)

  return {
    ...raw,
    id: raw?.id ?? mentorId,
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

export function normalizeStudent(raw: any, fallbackId = ''): StudentInfo {
  const studentId = String(raw?.studentId ?? raw?.id ?? raw?.userId ?? raw?.username ?? fallbackId ?? '')
  const name = String(raw?.studentName ?? raw?.name ?? raw?.realName ?? raw?.username ?? studentId)

  return {
    ...raw,
    id: String(raw?.id ?? studentId),
    studentId,
    name,
    studentName: raw?.studentName ?? name,
    realName: raw?.realName ?? name,
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId ?? null,
    majorId: raw?.majorId ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId ?? null,
    raw,
  }
}

export function isOrgType(unit: any, type: string): boolean {
  return String(unit?.type ?? unit?.unitType ?? '').toUpperCase() === type.toUpperCase()
}

export async function getOrgTree(): Promise<OrgUnit[]> {
  const res = await get<any[]>('/api/org/units')
  return (unwrap(res) || []).map(normalizeOrgUnit)
}

export const getOrgUnits = getOrgTree
export const getRawOrgUnits = getOrgTree

export async function getOrgUnitPublic(unitId: string): Promise<OrgUnit> {
  const res = await get<any>(`/api/org/unit/${encodeURIComponent(unitId)}`)
  return normalizeOrgUnit(unwrap(res))
}

export const getOrgUnit = getOrgUnitPublic

export async function searchMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<any[]>('/api/org/mentors/search', keyword ? { keyword } : undefined)
  return (unwrap(res) || []).map(normalizeMentor)
}

export const searchAllMentors = searchMentors

export async function getMentorsByOrgUnit(orgUnitId: string): Promise<MentorInfo[]> {
  const res = await get<any[]>(`/api/org/mentors/${encodeURIComponent(orgUnitId)}`)
  return (unwrap(res) || []).map(normalizeMentor)
}

export const getMentorsByOrg = getMentorsByOrgUnit

export async function searchDeptMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<any[]>(
    '/api/org/my-dept/mentors',
    keyword ? { keyword } : undefined,
  )
  return (unwrap(res) || []).map(normalizeMentor)
}

export const searchMyDeptMentors = searchDeptMentors

export async function getMyDeptMember(userId: string): Promise<StudentInfo | MentorInfo> {
  const res = await get<any>(`/api/org/my-dept/member/${encodeURIComponent(userId)}`)
  const raw = unwrap(res)

  if (raw?.mentorId || raw?.office || raw?.departmentName) return normalizeMentor(raw)
  return normalizeStudent(raw, userId)
}

export async function lookupStudent(studentId: string): Promise<StudentInfo> {
  const res = await get<any>(`/api/org/student/${encodeURIComponent(studentId)}`)
  return normalizeStudent(unwrap(res), studentId)
}

export const getStudentById = lookupStudent
export const searchStudentById = lookupStudent

export async function searchStudents(keyword = ''): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/org/students/search', keyword ? { keyword } : undefined)
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}

export const searchAllStudents = searchStudents

export async function getDcsStudents(): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/org/students/org_dcs')
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}

export async function getStudentsByDepartment(orgUnitId: string): Promise<StudentInfo[]> {
  // Uploaded OpenAPI only lists /api/org/students/org_dcs as a concrete department-student endpoint.
  if (!orgUnitId || orgUnitId === 'org_dcs') return getDcsStudents()

  // Fallback to global search because dynamic department-student endpoint is not listed.
  return searchStudents(orgUnitId)
}

export const getStudentsByOrg = getStudentsByDepartment

export async function getAllStudents(): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/user/students/all')
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}
