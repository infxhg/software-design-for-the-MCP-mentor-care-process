import { del, post, put, unwrap } from './request'
import {
  addStudentToGroup,
  changeGroupMentor,
  changeGroupMentorByKey,
  exportConsultantRecords,
  exportGroupRecords,
  exportGroupRecordsForConsultant,
  exportRecordsByFilter,
  getGroup,
  getGroupMembers,
  importCoordinators,
  importMcpAllocation,
  listConsultantCases,
  listGroups,
  removeStudentFromGroup,
  searchGroup,
  searchGroups,
  type CaseItem,
  type ConsultantExportFilter,
  type GroupInfo,
  type GroupMember,
} from './mentoring'
import { getOrgTree, isOrgType, searchMentors, type MentorInfo, type OrgUnit } from './org'

export {
  addStudentToGroup,
  changeGroupMentor,
  changeGroupMentorByKey,
  exportConsultantRecords,
  exportRecordsByFilter,
  getGroup,
  getGroupMembers,
  getOrgTree,
  importCoordinators,
  importMcpAllocation,
  listGroups,
  removeStudentFromGroup,
  searchGroup,
  searchGroups,
  searchMentors,
}

export type { CaseItem, ConsultantExportFilter, GroupInfo, GroupMember, MentorInfo }

export type GroupSummary = GroupInfo

export interface DepartmentSummary {
  departmentId: string
  departmentName: string
  faculty: string
  coordinatorName: string | null
  coordinatorEmail: string | null
  raw?: any
}

export interface CoordinatorPayload {
  coordinatorId?: string
  userId?: string
  email?: string
  username?: string
  realName?: string
  department?: string
  [key: string]: any
}

export interface CoordinatorDesignation extends CoordinatorPayload {
  coordinatorName?: string
  departmentId?: string
}

export interface ExportFilter extends ConsultantExportFilter {
  academicYears?: string[]
  groupId?: string
}

export async function listAllMentors(keyword?: string): Promise<MentorInfo[]> {
  return searchMentors(keyword || '')
}

export async function importStudentNameList(file: File, facultyOrgId?: string): Promise<any> {
  return importMcpAllocation(file, facultyOrgId)
}

export async function importCoordinatorList(file: File): Promise<any> {
  return importCoordinators(file)
}

export async function listDepartments(): Promise<DepartmentSummary[]> {
  const units = await getOrgTree()
  return buildDepartments(units)
}

export async function getDepartmentDetail(deptId: string): Promise<DepartmentSummary | null> {
  const departments = await listDepartments()
  return departments.find((item) => item.departmentId === deptId) || null
}

export async function designateCoordinator(
  unitIdOrPayload: string | CoordinatorDesignation,
  maybePayload?: CoordinatorPayload,
): Promise<any> {
  const unitId =
    typeof unitIdOrPayload === 'string'
      ? unitIdOrPayload
      : unitIdOrPayload.departmentId || unitIdOrPayload.department

  if (!unitId) throw new Error('departmentId/unitId is required')

  const payload = typeof unitIdOrPayload === 'string' ? maybePayload || {} : unitIdOrPayload

  // This endpoint is not listed in the uploaded OpenAPI, but the current UI needs it.
  const res = await post<any>(`/api/mentoring/units/${encodeURIComponent(unitId)}/coordinator`, payload)
  return unwrap(res)
}

export async function updateCoordinator(
  unitId: string,
  payload: CoordinatorPayload,
): Promise<any> {
  const res = await put<any>(`/api/mentoring/units/${encodeURIComponent(unitId)}/coordinator`, payload)
  return unwrap(res)
}

export async function removeCoordinator(unitId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/units/${encodeURIComponent(unitId)}/coordinator`)
  unwrap(res)
}

export async function listCasesForConsultant(): Promise<CaseItem[]> {
  return listConsultantCases()
}

export async function closeConsultantCase(caseId: string): Promise<any> {
  const { closeCase } = await import('./mentoring')
  return closeCase(caseId)
}

export async function exportRecordsByGroup(groupId: string): Promise<Blob> {
  return exportGroupRecords(groupId)
}

export async function exportFcRecordsByGroup(groupId: string): Promise<Blob> {
  return exportGroupRecordsForConsultant(groupId)
}

function buildDepartments(units: OrgUnit[]): DepartmentSummary[] {
  const faculties = units.filter((unit) => isOrgType(unit, 'FACULTY'))
  const departments = units.filter((unit) => isOrgType(unit, 'DEPARTMENT') || isOrgType(unit, 'DEPT'))

  return departments.map((dept) => {
    const faculty = faculties.find((item) => item.id === dept.parentId)

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      faculty: faculty?.name || '',
      coordinatorName:
        dept.coordinatorName ||
        dept.coordinator?.realName ||
        dept.coordinator?.username ||
        null,
      coordinatorEmail: dept.coordinatorEmail || dept.coordinator?.email || null,
      raw: dept,
    }
  })
}
