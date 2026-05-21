import { del, post, put, unwrap } from './request'
import {
  addStudentToGroup,
  changeGroupMentor,
  exportConsultantRecords,
  exportRecordsByFilter,
  getGroup,
  getGroupMembers,
  importCoordinators,
  importMcpAllocation,
  listGroups,
  removeStudentFromGroup,
  searchGroup,
  type ConsultantExportFilter,
  type GroupInfo,
  type GroupMember,
} from './mentoring'
import { getOrgTree, searchMentors, type MentorInfo } from './org'

export {
  addStudentToGroup,
  changeGroupMentor,
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
  searchMentors,
}

export type { ConsultantExportFilter, GroupInfo, GroupMember, MentorInfo }

export interface CoordinatorPayload {
  coordinatorId?: string
  userId?: string
  email?: string
  username?: string
  realName?: string
  department?: string
  [key: string]: any
}

export async function importStudentNameList(file: File, facultyOrgId?: string): Promise<any> {
  return importMcpAllocation(file, facultyOrgId)
}

export async function importCoordinatorList(file: File): Promise<any> {
  return importCoordinators(file)
}

// 你之前确认应使用 units，不是 departments；但新版 OpenAPI 路径里仍未列出该接口。
// 这里按真实 units 路径接入，联调若 404 则说明后端文档/接口还没同步。
export async function designateCoordinator(
  unitId: string,
  payload: CoordinatorPayload,
): Promise<any> {
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


// ==================== Backward compatibility for old consultant pages ====================

export type GroupSummary = GroupInfo

export interface DepartmentSummary {
  departmentId: string
  departmentName: string
  faculty: string
  coordinatorName: string | null
  coordinatorEmail: string | null
  raw?: any
}

export interface CoordinatorDesignation {
  coordinatorName?: string
  email?: string
  department?: string
  departmentId?: string
  coordinatorId?: string
  userId?: string
  username?: string
  realName?: string
  [key: string]: any
}

export interface ExportFilter extends ConsultantExportFilter {
  academicYears?: string[]
  groupId?: string
}

export async function listDepartments(): Promise<DepartmentSummary[]> {
  const units = await getOrgTree()
  return buildDepartments(units as any[])
}

export async function getDepartmentDetail(deptId: string): Promise<DepartmentSummary | null> {
  const departments = await listDepartments()
  return departments.find((item) => item.departmentId === deptId) || null
}

export async function exportRecordsByGroup(groupId: string): Promise<Blob> {
  return exportRecordsByFilter({ groupId } as any)
}

export async function exportFcRecordsByGroup(groupId: string): Promise<Blob> {
  return exportConsultantRecords({ groupId } as any)
}

function buildDepartments(units: any[]): DepartmentSummary[] {
  const faculties = units.filter((u) => sameType(u, 'FACULTY'))
  const departments = units.filter((u) => sameType(u, 'DEPARTMENT') || sameType(u, 'DEPT'))

  return departments.map((dept) => {
    const faculty = faculties.find((f) => f.id === dept.parentId)
    return {
      departmentId: String(dept.id || ''),
      departmentName: String(dept.name || ''),
      faculty: faculty?.name || '',
      coordinatorName: dept.coordinatorName || dept.coordinator?.realName || dept.coordinator?.username || null,
      coordinatorEmail: dept.coordinatorEmail || dept.coordinator?.email || null,
      raw: dept,
    }
  })
}

function sameType(unit: any, type: string): boolean {
  return String(unit?.type || '').toUpperCase() === type.toUpperCase()
}
