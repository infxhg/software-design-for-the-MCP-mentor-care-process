import { get, unwrap } from './request'
import type { OrgUnit } from './admin'

export interface MentorInfo {
  mentorId: string
  mentorName: string
  email?: string
  office?: string
  departmentName?: string
  groupId?: string
  [key: string]: any
}

export interface StudentInfo {
  id?: string
  studentId?: string
  username?: string
  realName?: string
  phone?: string | null
  email?: string | null
  status?: number | string
  isDeleted?: number
  createTime?: string | null
  updateTime?: string | null
  majorId?: string | null
  groupId?: string
  [key: string]: any
}

export async function getOrgTree(): Promise<OrgUnit[]> {
  const res = await get<OrgUnit[]>('/api/org/units')
  return unwrap(res) || []
}

export async function getOrgUnitPublic(unitId: string): Promise<OrgUnit> {
  const res = await get<OrgUnit>(`/api/org/unit/${encodeURIComponent(unitId)}`)
  return unwrap(res)
}

export async function searchMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<MentorInfo[]>('/api/org/mentors/search', keyword ? { keyword } : undefined)
  return unwrap(res) || []
}

export async function getMentorsByOrgUnit(orgUnitId: string): Promise<MentorInfo[]> {
  const res = await get<MentorInfo[]>(`/api/org/mentors/${encodeURIComponent(orgUnitId)}`)
  return unwrap(res) || []
}

export async function searchDeptMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<MentorInfo[]>(
    '/api/org/my-dept/mentors',
    keyword ? { keyword } : undefined,
  )
  return unwrap(res) || []
}

export async function getMyDeptMember(userId: string): Promise<StudentInfo> {
  const res = await get<StudentInfo>(`/api/org/my-dept/member/${encodeURIComponent(userId)}`)
  return unwrap(res)
}

export async function lookupStudent(studentId: string): Promise<StudentInfo> {
  const res = await get<StudentInfo>(`/api/org/student/${encodeURIComponent(studentId)}`)
  return unwrap(res)
}

export async function searchStudents(keyword = ''): Promise<any[]> {
  const res = await get<any[]>('/api/org/students/search', keyword ? { keyword } : undefined)
  return unwrap(res) || []
}

export async function getStudentsByDepartment(orgUnitId: string): Promise<any[]> {
  const res = await get<any[]>(`/api/org/students/${encodeURIComponent(orgUnitId)}`)
  return unwrap(res) || []
}


// ==================== Backward compatibility for old pages ====================

export type OrgUnit = import('./admin').OrgUnit
export type MentorFromApi = MentorInfo
export type StudentFromApi = StudentInfo

export const getRawOrgUnits = getOrgTree
export const getOrgUnits = getOrgTree
export const getMentorsByOrg = getMentorsByOrgUnit
export const searchAllMentors = searchMentors
export const searchMyDeptMentors = searchDeptMentors
export const getStudentById = lookupStudent
export const searchStudentById = lookupStudent
export const searchAllStudents = searchStudents

export async function getDcsStudents(): Promise<StudentInfo[]> {
  return getStudentsByDepartment('org_dcs')
}

export async function getStudentsByOrg(orgUnitId: string): Promise<StudentInfo[]> {
  if (!orgUnitId) return []
  return getStudentsByDepartment(orgUnitId)
}

export function normalizeStudent(raw: any, fallbackId = ''): StudentInfo {
  const studentId = String(raw?.studentId ?? raw?.id ?? raw?.userId ?? raw?.username ?? fallbackId ?? '')
  return {
    ...raw,
    id: String(raw?.id ?? studentId),
    studentId,
    realName: raw?.realName ?? raw?.studentName ?? raw?.name ?? raw?.username ?? studentId,
  }
}
