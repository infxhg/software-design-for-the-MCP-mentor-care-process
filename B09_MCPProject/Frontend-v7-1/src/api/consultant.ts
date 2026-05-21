/**
 * src/api/consultant.ts
 *
 * Faculty Consultant API.
 */

import { get, getBlob } from './request'
import {
  importMcpAllocation,
  importCoordinators,
  searchGroups,
  getRecordsByGroup,
  getGroupById,
  getGroupMembers,
  changeMentoringGroupMentor,
  addGroupMember,
  removeGroupMember,
  getConsultantCases,
  closeConsultantCase,
  exportStudentRecords,
  exportGroupRecords,
} from './mentoring'
import { getOrgUnits } from './org'

// ==================== Types ====================

export interface GroupSummary {
  groupId: string
  mentorName: string
  mentorId?: string
  studentCount?: number
  major?: string
  department?: string
  raw?: any
}

export interface GroupMember {
  studentId: string
  name: string
  major?: string
  status?: string
  groupId?: string
  recordsCount?: number
  raw?: any
}

export interface DepartmentSummary {
  departmentId: string
  departmentName: string
  faculty: string
  coordinatorName: string | null
  coordinatorEmail: string | null
  raw?: any
}

export interface CoordinatorDesignation {
  coordinatorName: string
  email: string
  department: string
}

export interface ExportFilter {
  academicYears?: string[]
  department?: string
  major?: string
  mentorName?: string
  studentName?: string
  studentId?: string
  groupId?: string
}

// ==================== Missing Endpoint Helper ====================

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. The function is kept here for future wiring.`)
}

// ==================== Group APIs ====================

export async function listGroups(): Promise<GroupSummary[]> {
  const groups = await searchGroups()
  return groups.map(normalizeGroup)
}

export async function searchGroupById(groupId: string): Promise<GroupSummary[]> {
  const gid = String(groupId || '').trim()
  if (!gid) return []

  const groups = await searchGroups(gid)

  if (groups.length > 0) {
    return groups.map(normalizeGroup)
  }

  const detail = await getGroupById(gid)
  return detail ? [normalizeGroup(detail)] : []
}

export async function getGroupDetail(groupId: string): Promise<{
  group: GroupSummary | null
  members: GroupMember[]
}> {
  const gid = String(groupId || '').trim()
  if (!gid) {
    return { group: null, members: [] }
  }

  const groupList = await searchGroupById(gid)
  const group = groupList.length > 0 ? groupList[0] : null

  // Prefer members endpoint from new OpenAPI; fall back to record endpoint.
  let members: GroupMember[] = []

  try {
    const memberList = await getGroupMembers(gid)
    members = memberList.map((item: any) => ({
      studentId: item.studentId,
      name: item.name ?? item.studentName ?? item.username ?? item.studentId,
      major: item.major ?? item.majorId,
      status: item.status,
      groupId: item.groupId ?? gid,
      recordsCount: 0,
      raw: item,
    }))
  } catch {
    const records = await getRecordsByGroup(gid)
    members = records.map((item: any) => ({
      studentId: item.studentId,
      name: item.name ?? item.studentName ?? item.username ?? item.studentId,
      major: item.major ?? item.majorId,
      status: item.status,
      groupId: item.groupId ?? gid,
      recordsCount: Array.isArray(item.interviewRecords)
        ? item.interviewRecords.length
        : 0,
      raw: item,
    }))
  }

  return {
    group,
    members,
  }
}

export async function changeGroupMentor(
  groupId: string,
  newMentorId: string,
): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!newMentorId) throw new Error('newMentorId is required')

  await changeMentoringGroupMentor(groupId, newMentorId)
}

export async function addStudentToGroup(
  groupId: string,
  studentId: string,
): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!studentId) throw new Error('studentId is required')

  await addGroupMember(groupId, studentId)
}

export async function removeStudentFromGroup(
  groupId: string,
  studentId: string,
): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!studentId) throw new Error('studentId is required')

  await removeGroupMember(groupId, studentId)
}

// ==================== Department APIs ====================

export async function listDepartments(): Promise<DepartmentSummary[]> {
  const units = await getOrgUnits()

  const departments = units.filter(
    (u) => String(u.type).toUpperCase() === 'DEPARTMENT',
  )

  const faculties = units.filter(
    (u) => String(u.type).toUpperCase() === 'FACULTY',
  )

  return departments.map((dept) => {
    const faculty = faculties.find((f) => f.id === dept.parentId)

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      faculty: faculty?.name || '',
      coordinatorName: dept.coordinatorName ?? null,
      coordinatorEmail: dept.coordinatorEmail ?? null,
      raw: dept,
    }
  })
}

export async function getDepartmentDetail(
  deptId: string,
): Promise<DepartmentSummary | null> {
  const departments = await listDepartments()
  return departments.find((d) => d.departmentId === deptId) || null
}

/**
 * Missing: manual coordinator designation endpoint.
 * Existing backend currently supports coordinator Excel import only.
 */
export async function designateCoordinator(
  payload: CoordinatorDesignation,
): Promise<void> {
  if (!payload.coordinatorName) throw new Error('Coordinator name is required')
  if (!payload.email) throw new Error('Coordinator email is required')
  if (!payload.department) throw new Error('Department is required')

  return missingEndpoint('designateCoordinator')
}

/**
 * Missing: remove coordinator endpoint.
 */
export async function removeCoordinator(deptId: string): Promise<void> {
  if (!deptId) throw new Error('deptId is required')

  return missingEndpoint('removeCoordinator')
}

// ==================== Imports ====================

export async function importStudentNameList(
  file: File,
): Promise<{ created?: number; updated?: number; [key: string]: any }> {
  const data = await importMcpAllocation(file)
  return data || {}
}

export async function importCoordinatorList(
  file: File,
): Promise<{ imported?: number; [key: string]: any }> {
  const data = await importCoordinators(file)
  return data || {}
}

// ==================== Case APIs ====================

export async function listConsultantCases(): Promise<any[]> {
  return getConsultantCases()
}

export async function closeCase(caseId: string): Promise<void> {
  await closeConsultantCase(caseId)
}

// ==================== Export ====================

/**
 * Current OpenAPI only has:
 * - GET /api/mentoring/export/student/{studentId}
 * - GET /api/mentoring/export/group/{groupId}
 *
 * There is still no full Faculty Consultant filtered Word export.
 * This function connects the two available export cases and keeps a clear
 * placeholder for broader filter export.
 */
export async function exportRecordsByFilter(filter: ExportFilter): Promise<Blob> {
  if (!filter) throw new Error('Export filter is required')

  if (filter.studentId) {
    return exportStudentRecords(filter.studentId)
  }

  if (filter.groupId) {
    return exportGroupRecords(filter.groupId)
  }

  return missingEndpoint('exportRecordsByFilter')
}

// Optional lower-level export by raw query if backend later adds it.
export async function exportConsultantRecordsRaw(filter: ExportFilter): Promise<Blob> {
  return getBlob('/api/mentoring/export/consultant', filter as any)
}

// ==================== Optional Raw API ====================

export async function getFeedbackForConsultant(): Promise<any[]> {
  const res = await get<any[]>('/api/user/feedback')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load feedback')
  }

  return res.data || []
}

// ==================== Deprecated / future placeholders ====================

/**
 * Kept for future if backend adds direct coordinator management endpoints.
 */
export async function updateDepartmentCoordinator(
  deptId: string,
  coordinatorId: string,
): Promise<void> {
  if (!deptId) throw new Error('deptId is required')
  if (!coordinatorId) throw new Error('coordinatorId is required')

  return missingEndpoint('updateDepartmentCoordinator')
}

/**
 * Kept for future if backend exposes hard delete through documented endpoint.
 */
export async function removeDepartmentCoordinator(deptId: string): Promise<void> {
  if (!deptId) throw new Error('deptId is required')

  return missingEndpoint('removeDepartmentCoordinator')
}

// ==================== Helpers ====================

function normalizeGroup(raw: any): GroupSummary {
  const groupId = raw.groupId ?? raw.id ?? ''
  const mentorName =
    raw.mentorName ??
    raw.mentor ??
    raw.teacherName ??
    raw.mentorRealName ??
    ''
  const mentorId = raw.mentorId ?? raw.teacherId
  const studentCount = raw.studentCount ?? raw.count
  const major = raw.major ?? raw.majorName
  const department = raw.department ?? raw.departmentName

  return {
    groupId,
    mentorName,
    mentorId,
    studentCount,
    major,
    department,
    raw,
  }
}
