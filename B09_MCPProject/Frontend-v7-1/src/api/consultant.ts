/**
 * src/api/consultant.ts
 *
 * Faculty Consultant page-facing APIs.
 * This file wraps org.ts and mentoring.ts so pages can keep simple names.
 */

import { getOrgUnits, searchAllMentors } from './org'
import type { MentorFromApi, OrgUnit } from './org'
import {
  addStudentToGroup as apiAddStudentToGroup,
  changeGroupMentor as apiChangeGroupMentor,
  closeCase,
  exportFcGroupRecords,
  exportGroupRecordsDoc,
  getGroupById,
  getGroupMembers,
  importCoordinators,
  importMcpAllocation,
  listConsultantCases,
  removeStudentFromGroup as apiRemoveStudentFromGroup,
  searchGroups,
} from './mentoring'

import type {
  GroupMember as ApiGroupMember,
  GroupSearchResult,
  SpecialCase,
} from './mentoring'

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. A placeholder has been kept here for future integration.`)
}

export interface GroupSummary {
  groupId: string
  mentorName?: string
  mentorId?: string
  studentCount?: number
  major?: string
  department?: string
  raw?: any
}

export interface GroupMember {
  studentId: string
  name?: string
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
  departmentId?: string
}

export interface ExportFilter {
  academicYears?: string[]
  faculty?: string
  department?: string
  major?: string
  mentorName?: string
  studentName?: string
  groupId?: string
}

// ==================== Groups ====================

export async function listGroups(): Promise<GroupSummary[]> {
  const groups = await searchGroups()
  return groups.map(normalizeGroup)
}

export async function searchGroupById(groupId: string): Promise<GroupSummary[]> {
  const groups = await searchGroups(groupId)
  return groups.map(normalizeGroup)
}

export async function getGroupDetail(groupId: string): Promise<{
  group: GroupSummary | null
  members: GroupMember[]
}> {
  const group = await getGroupById(groupId)
  const members = await getGroupMembers(groupId)

  return {
    group: group ? normalizeGroup(group) : null,
    members: members.map(normalizeMember),
  }
}

export async function changeGroupMentor(groupId: string, newMentorId: string): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!newMentorId) throw new Error('newMentorId is required')

  await apiChangeGroupMentor(groupId, newMentorId)
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!studentId) throw new Error('studentId is required')

  await apiAddStudentToGroup(groupId, studentId)
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
  if (!groupId) throw new Error('groupId is required')
  if (!studentId) throw new Error('studentId is required')

  await apiRemoveStudentFromGroup(groupId, studentId)
}

// ==================== Mentors ====================

export async function listAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  return await searchAllMentors(keyword)
}

// ==================== Departments / Coordinators ====================

export async function listDepartments(): Promise<DepartmentSummary[]> {
  const units = await getOrgUnits()
  return buildDepartments(units)
}

export async function getDepartmentDetail(deptId: string): Promise<DepartmentSummary | null> {
  const departments = await listDepartments()
  return departments.find((item) => item.departmentId === deptId) || null
}

export async function designateCoordinator(payload: CoordinatorDesignation): Promise<void> {
  if (!payload.coordinatorName) throw new Error('Coordinator name is required')
  if (!payload.email) throw new Error('Coordinator email is required')
  if (!payload.department && !payload.departmentId) throw new Error('Department is required')

  // Current OpenAPI supports Excel import only:
  // GET /api/mentoring/import/coordinators is documented, but upload should be POST multipart.
  return missingEndpoint('designateCoordinator')
}

export async function removeCoordinator(deptId: string): Promise<void> {
  if (!deptId) throw new Error('deptId is required')
  return missingEndpoint('removeCoordinator')
}

// ==================== Imports ====================

export async function importStudentNameList(
  file: File,
  facultyOrgId?: string,
): Promise<{ created?: number; updated?: number; [key: string]: any }> {
  const data = await importMcpAllocation(file, facultyOrgId)
  return data || {}
}

export async function importCoordinatorList(
  file: File,
): Promise<{ imported?: number; [key: string]: any }> {
  const data = await importCoordinators(file)
  return data || {}
}

// ==================== Cases ====================

export async function listCasesForConsultant(): Promise<SpecialCase[]> {
  return await listConsultantCases()
}

export async function closeConsultantCase(caseId: string): Promise<void> {
  await closeCase(caseId)
}

// ==================== Export ====================

export async function exportRecordsByGroup(groupId: string): Promise<Blob> {
  return await exportGroupRecordsDoc(groupId)
}

export async function exportFcRecordsByGroup(groupId: string): Promise<Blob> {
  return await exportFcGroupRecords(groupId)
}

export async function exportRecordsByFilter(filter: ExportFilter): Promise<Blob> {
  if (filter.groupId) {
    return await exportGroupRecordsDoc(filter.groupId)
  }

  // Missing in OpenAPI:
  // GET/POST /api/mentoring/export/consultant with faculty/department/major/mentor/student filters.
  return missingEndpoint('exportRecordsByFilter')
}

// ==================== Helpers ====================

function normalizeGroup(raw: GroupSearchResult | any): GroupSummary {
  return {
    groupId: String(raw?.groupId ?? raw?.id ?? ''),
    mentorName: raw?.mentorName ?? raw?.currentMentor,
    mentorId: raw?.mentorId ?? raw?.currentMentorId,
    studentCount: raw?.studentCount ?? raw?.count,
    major: raw?.major ?? raw?.majorName,
    department: raw?.department ?? raw?.departmentName,
    raw,
  }
}

function normalizeMember(raw: ApiGroupMember | any): GroupMember {
  return {
    studentId: String(raw?.studentId ?? raw?.id ?? ''),
    name: raw?.name ?? raw?.studentName ?? raw?.realName ?? raw?.username,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId,
    status: raw?.status,
    groupId: raw?.groupId,
    recordsCount: raw?.recordsCount,
    raw,
  }
}

function buildDepartments(units: OrgUnit[]): DepartmentSummary[] {
  const faculties = units.filter((u) => sameType(u, 'FACULTY'))
  const departments = units.filter((u) => sameType(u, 'DEPARTMENT') || sameType(u, 'DEPT'))

  return departments.map((dept) => {
    const faculty = faculties.find((f) => f.id === dept.parentId)

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      faculty: faculty?.name || '',
      coordinatorName: (dept as any).coordinatorName || null,
      coordinatorEmail: (dept as any).coordinatorEmail || null,
      raw: dept,
    }
  })
}

function sameType(unit: OrgUnit, type: string): boolean {
  return String(unit.type || '').toUpperCase() === type.toUpperCase()
}
