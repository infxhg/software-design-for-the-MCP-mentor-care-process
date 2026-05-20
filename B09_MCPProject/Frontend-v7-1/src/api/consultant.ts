/**
 * Faculty Consultant API.
 *
 * Backend endpoints from OpenAPI:
 *   POST /api/mentoring/import/mcp-allocation        (OpenAPI method 写成 GET，但描述明确是 multipart POST)
 *   POST /api/mentoring/import/coordinators          (OpenAPI method 写成 GET，但描述明确是 multipart POST)
 *   GET  /api/mentoring/groups/search?groupId=xxx
 *   GET  /api/mentoring/records/group/{groupId}
 *   GET  /api/org/admin/units
 *
 * 注意：
 * Change mentor / add student / remove student / manual designate coordinator / export Word
 * 这些在当前 OpenAPI 里还没有正式接口。本文件保留函数名，避免页面编译报错；
 * 对应函数会给出明确错误，等后端补接口后只改这里。
 */

import { get, upload, requestBlob } from './request'
import { getRecordsByGroup } from './mentoring'
import type { StudentGroupRecord } from './mentoring'

// ==================== Types ====================

export interface GroupSummary {
  groupId: string
  mentorName: string
  mentorId?: string
  studentCount?: number
  major?: string
  department?: string
}

export interface GroupMember {
  studentId: string
  name: string
  major?: string
  status?: string
}

export interface DepartmentSummary {
  departmentId: string
  departmentName: string
  faculty: string
  coordinatorName: string | null
  coordinatorEmail: string | null
}

export interface CoordinatorDesignation {
  coordinatorName: string
  email: string
  department: string
}

export interface ExportFilter {
  academicYears: string[]
  department?: string
  major?: string
  mentorName?: string
  studentName?: string
}

// ==================== Helpers ====================

function normalizeGroup(raw: any): GroupSummary {
  return {
    groupId: String(raw?.groupId ?? raw?.id ?? ''),
    mentorName: String(raw?.mentorName ?? raw?.mentor?.realName ?? raw?.mentor?.username ?? ''),
    mentorId: raw?.mentorId ?? raw?.mentor?.id,
    studentCount: raw?.studentCount ?? raw?.members?.length,
    major: raw?.major ?? raw?.majorName,
    department: raw?.department ?? raw?.departmentName,
  }
}

function groupMembersFromRecords(records: StudentGroupRecord[]): GroupMember[] {
  return records.map((r) => ({
    studentId: r.studentId,
    name: r.studentId,
    major: r.majorId,
    status: r.status,
  }))
}

function normalizeDepartment(raw: any, allUnits: any[]): DepartmentSummary {
  const parent = allUnits.find((u) => u.id === raw.parentId)

  return {
    departmentId: String(raw?.id ?? ''),
    departmentName: String(raw?.name ?? ''),
    faculty: String(parent?.name ?? raw?.faculty ?? ''),
    coordinatorName: raw?.coordinatorName ?? null,
    coordinatorEmail: raw?.coordinatorEmail ?? null,
  }
}

// ==================== Group APIs ====================

/**
 * listGroups() 旧页面无参数；当前后端是 search 接口。
 * 不传 groupId 时会请求 /mentoring/groups/search，若后端支持返回全部则显示全部。
 */
export async function listGroups(groupId?: string): Promise<GroupSummary[]> {
  const res = await get<any>('/mentoring/groups/search', {
    groupId,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to list groups')
  }

  if (Array.isArray(res.data)) {
    return res.data.map(normalizeGroup)
  }

  if (res.data) {
    return [normalizeGroup(res.data)]
  }

  return []
}

export async function getGroupDetail(groupId: string): Promise<{
  group: GroupSummary | null
  members: GroupMember[]
}> {
  const gid = String(groupId || '').trim()
  if (!gid) throw new Error('groupId is required')

  const groups = await listGroups(gid)
  const records = await getRecordsByGroup(gid)

  return {
    group: groups[0] || { groupId: gid, mentorName: '', studentCount: records.length },
    members: groupMembersFromRecords(records),
  }
}

export async function changeGroupMentor(
  _groupId: string,
  _newMentorId: string,
): Promise<void> {
  throw new Error('当前 OpenAPI 还没有 Change Mentor 接口，请后端补接口后在 consultant.ts 中接入。')
}

export async function addStudentToGroup(
  _groupId: string,
  _studentId: string,
): Promise<void> {
  throw new Error('当前 OpenAPI 还没有 Add Student To Group 接口，请后端补接口后在 consultant.ts 中接入。')
}

export async function removeStudentFromGroup(
  _groupId: string,
  _studentId: string,
): Promise<void> {
  throw new Error('当前 OpenAPI 还没有 Remove Student From Group 接口，请后端补接口后在 consultant.ts 中接入。')
}

// ==================== Department APIs ====================

export async function listDepartments(): Promise<DepartmentSummary[]> {
  const res = await get<any[]>('/org/admin/units')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to list departments')
  }

  const units = res.data || []
  return units
    .filter((u) => String(u?.type ?? u?.unitType ?? '').toUpperCase() === 'DEPARTMENT')
    .map((u) => normalizeDepartment(u, units))
}

export async function getDepartmentDetail(
  deptId: string,
): Promise<DepartmentSummary | null> {
  const departments = await listDepartments()
  return departments.find((d) => d.departmentId === deptId) || null
}

export async function designateCoordinator(
  _payload: CoordinatorDesignation,
): Promise<void> {
  throw new Error('当前 OpenAPI 还没有手动指定 Coordinator 接口；可先使用 importCoordinatorList Excel 导入。')
}

export async function removeCoordinator(_deptId: string): Promise<void> {
  throw new Error('当前 OpenAPI 还没有 Remove Coordinator 接口，请后端补接口后在 consultant.ts 中接入。')
}

// ==================== Imports ====================

/**
 * Faculty Consultant 导入学生-导师分配表。
 * 后端描述：multipart/form-data，字段 file；可选 facultyOrgId。
 */
export async function importStudentNameList(
  file: File,
  facultyOrgId?: string,
): Promise<{ created?: number; updated?: number; imported?: number; [key: string]: any }> {
  if (!file || file.size === 0) throw new Error('Uploaded file is empty.')

  const formData = new FormData()
  formData.append('file', file)
  if (facultyOrgId) formData.append('facultyOrgId', facultyOrgId)

  const res = await upload<any>('/mentoring/import/mcp-allocation', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import student name list')
  }

  return res.data || {}
}

/**
 * 导入 MCP Coordinator Excel。
 */
export async function importCoordinatorList(
  file: File,
): Promise<{ imported?: number; [key: string]: any }> {
  if (!file || file.size === 0) throw new Error('Uploaded file is empty.')

  const formData = new FormData()
  formData.append('file', file)

  const res = await upload<any>('/mentoring/import/coordinators', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import coordinator list')
  }

  return res.data || {}
}

// ==================== Export ====================

/**
 * 当前 OpenAPI 没有 Word 导出接口。
 * 这里先按常见路径 /api/mentoring/records/export 发送 blob；
 * 如果后端实际路径不同，只改这里。
 */
export async function exportRecordsByFilter(filter: ExportFilter): Promise<Blob> {
  return await requestBlob('/mentoring/records/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filter),
  })
}
