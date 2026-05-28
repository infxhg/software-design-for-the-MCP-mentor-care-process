import { del, post, put, unwrap } from './request'
import {
  addStudentToGroup,
  addStudentToGroupByKey,
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
  removeStudentFromGroupByKey,
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
  addStudentToGroupByKey,
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
  removeStudentFromGroupByKey,
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
  coordinatorUserId?: string
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

function resolveCoordinatorUserId(payload: CoordinatorPayload = {}): string {
  const coordinatorUserId = String(
    payload.coordinatorUserId ?? payload.coordinatorId ?? payload.userId ?? '',
  ).trim()
  if (!coordinatorUserId) {
    throw new Error('Coordinator User ID is required.')
  }
  return coordinatorUserId
}

function resolveDepartmentUnitId(
  unitIdOrPayload: string | CoordinatorDesignation,
): string {
  const unitId =
    typeof unitIdOrPayload === 'string'
      ? unitIdOrPayload
      : unitIdOrPayload.departmentId || unitIdOrPayload.department

  const departmentUnitId = String(unitId || '').trim()
  if (!departmentUnitId) {
    throw new Error('Department Unit ID is required.')
  }
  return departmentUnitId
}

/** FC manual designate — POST /api/org/departments/{departmentUnitId}/coordinator */
export async function designateCoordinator(
  unitIdOrPayload: string | CoordinatorDesignation,
  maybePayload?: CoordinatorPayload,
): Promise<any> {
  const departmentUnitId = resolveDepartmentUnitId(unitIdOrPayload)
  const payload = typeof unitIdOrPayload === 'string' ? maybePayload || {} : unitIdOrPayload

  const res = await post<any>(
    `/api/org/departments/${encodeURIComponent(departmentUnitId)}/coordinator`,
    { coordinatorUserId: resolveCoordinatorUserId(payload) },
  )
  return unwrap(res)
}

export async function updateCoordinator(
  unitId: string,
  payload: CoordinatorPayload,
): Promise<any> {
  return designateCoordinator(unitId, payload)
}

export async function removeCoordinator(unitId: string): Promise<void> {
  const departmentUnitId = String(unitId || '').trim()
  if (!departmentUnitId) throw new Error('Department Unit ID is required.')

  const res = await del<null>(
    `/api/org/departments/${encodeURIComponent(departmentUnitId)}/coordinator`,
  )
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
