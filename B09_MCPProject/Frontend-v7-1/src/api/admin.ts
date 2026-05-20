/**
 * Administrator API.
 *
 * Backend endpoints from OpenAPI:
 *   GET    /api/org/admin/units
 *   POST   /api/org/admin/units
 *   GET    /api/org/admin/units/{id}
 *   PUT    /api/org/admin/units/{id}
 *   DELETE /api/org/admin/units/{id}
 *   POST   /api/org/admin/units/import-excel
 *
 * 说明：
 * OpenAPI 当前没有 Faculty Consultant 账号管理、Supporting Staff 账号管理的正式接口。
 * 本文件保留原前端函数名，账号管理函数会调用约定路径 /api/admin/...；
 * 如果后端还没做这些路径，页面会收到 404，需要后端补接口或你再改这里的路径。
 */

import { get, post, put, del, upload } from './request'

// ==================== Types ====================

export interface ConsultantInfo {
  consultantId?: string
  name: string
  email: string
  faculty: string
}

export interface SupportingStaffInfo {
  staffId?: string
  name: string
  accountId: string
  canViewLog: boolean
  canReplyFeedback: boolean
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

export interface AdminOrgUnit {
  id: string
  name: string
  type: 'FACULTY' | 'DEPARTMENT' | 'MAJOR' | string
  parentId: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
}

export interface CreateOrgUnitPayload {
  name: string
  type: 'FACULTY' | 'DEPARTMENT' | 'MAJOR' | string
  parentId?: string | null
  sortOrder?: number
}

export interface UpdateOrgUnitPayload {
  name?: string
  sortOrder?: number
}

// ==================== Helpers ====================

function normalizeOrgUnit(raw: any): AdminOrgUnit {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    type: String(raw?.type ?? raw?.unitType ?? '').toUpperCase(),
    parentId: raw?.parentId ?? null,
    path: raw?.path ?? null,
    sortOrder: raw?.sortOrder,
    createTime: raw?.createTime,
  }
}

function normalizeConsultant(raw: any): ConsultantInfo {
  return {
    consultantId: raw?.consultantId ?? raw?.id,
    name: raw?.name ?? raw?.realName ?? raw?.username ?? '',
    email: raw?.email ?? '',
    faculty: raw?.faculty ?? raw?.facultyName ?? '',
  }
}

function normalizeStaff(raw: any): SupportingStaffInfo {
  return {
    staffId: raw?.staffId ?? raw?.id,
    name: raw?.name ?? raw?.realName ?? raw?.username ?? '',
    accountId: raw?.accountId ?? raw?.username ?? raw?.id ?? '',
    canViewLog: Boolean(raw?.canViewLog ?? true),
    canReplyFeedback: Boolean(raw?.canReplyFeedback ?? true),
  }
}

async function findOrCreateOrgUnit(
  units: AdminOrgUnit[],
  name: string,
  type: 'FACULTY' | 'DEPARTMENT' | 'MAJOR',
  parentId: string | null,
): Promise<AdminOrgUnit> {
  const existed = units.find(
    (u) =>
      u.name === name &&
      String(u.type).toUpperCase() === type &&
      (u.parentId || null) === (parentId || null),
  )

  if (existed) return existed

  const created = await createOrgUnit({
    name,
    type,
    parentId,
    sortOrder: units.length + 1,
  })

  units.push(created)
  return created
}

function orgEntriesFromUnits(units: AdminOrgUnit[]): OrgEntry[] {
  const byParent = new Map<string | null, AdminOrgUnit[]>()

  for (const u of units) {
    const key = u.parentId || null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(u)
  }

  const faculties = units.filter((u) => String(u.type).toUpperCase() === 'FACULTY')
  const rows: OrgEntry[] = []

  for (const faculty of faculties) {
    const departments = (byParent.get(faculty.id) || []).filter(
      (u) => String(u.type).toUpperCase() === 'DEPARTMENT',
    )

    if (departments.length === 0) {
      rows.push({ faculty: faculty.name, department: '', major: '' })
      continue
    }

    for (const dept of departments) {
      const majors = (byParent.get(dept.id) || []).filter(
        (u) => String(u.type).toUpperCase() === 'MAJOR',
      )

      if (majors.length === 0) {
        rows.push({ faculty: faculty.name, department: dept.name, major: '' })
        continue
      }

      for (const major of majors) {
        rows.push({ faculty: faculty.name, department: dept.name, major: major.name })
      }
    }
  }

  return rows
}

// ==================== Faculty Consultant Management ====================

export async function listConsultants(): Promise<ConsultantInfo[]> {
  const res = await get<any[]>('/admin/consultants')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to list consultants')
  }

  return (res.data || []).map(normalizeConsultant)
}

export async function getConsultant(consultantId: string): Promise<ConsultantInfo | null> {
  const res = await get<any>(`/admin/consultants/${encodeURIComponent(consultantId)}`)

  if (res.code !== 200 || !res.data) return null
  return normalizeConsultant(res.data)
}

export async function addConsultant(info: ConsultantInfo): Promise<void> {
  const res = await post<null>('/admin/consultants', info)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to add consultant')
  }
}

export async function updateConsultant(info: ConsultantInfo): Promise<void> {
  if (!info.consultantId) throw new Error('consultantId is required')

  const res = await post<null>(
    `/admin/consultants/${encodeURIComponent(info.consultantId)}`,
    info,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update consultant')
  }
}

export async function deleteConsultant(consultantId: string): Promise<void> {
  const res = await del<null>(`/admin/consultants/${encodeURIComponent(consultantId)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete consultant')
  }
}

// ==================== Supporting Staff Management ====================

export async function listSupportingStaff(): Promise<SupportingStaffInfo[]> {
  const res = await get<any[]>('/admin/supporting-staff')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to list staff')
  }

  return (res.data || []).map(normalizeStaff)
}

export async function getSupportingStaff(staffId: string): Promise<SupportingStaffInfo | null> {
  const res = await get<any>(`/admin/supporting-staff/${encodeURIComponent(staffId)}`)

  if (res.code !== 200 || !res.data) return null
  return normalizeStaff(res.data)
}

export async function addSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  const res = await post<null>('/admin/supporting-staff', info)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to add staff')
  }
}

export async function updateSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  if (!info.staffId) throw new Error('staffId is required')

  const res = await post<null>(
    `/admin/supporting-staff/${encodeURIComponent(info.staffId)}`,
    info,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update staff')
  }
}

export async function deleteSupportingStaff(staffId: string): Promise<void> {
  const res = await del<null>(`/admin/supporting-staff/${encodeURIComponent(staffId)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete staff')
  }
}

// ==================== Organization ====================

export async function listOrgUnits(): Promise<AdminOrgUnit[]> {
  const res = await get<any[]>('/org/admin/units')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load organization units')
  }

  return (res.data || []).map(normalizeOrgUnit)
}

export async function getOrgUnit(id: string): Promise<AdminOrgUnit | null> {
  const res = await get<any>(`/org/admin/units/${encodeURIComponent(id)}`)

  if (res.code !== 200 || !res.data) return null
  return normalizeOrgUnit(res.data)
}

export async function createOrgUnit(payload: CreateOrgUnitPayload): Promise<AdminOrgUnit> {
  const res = await post<any>('/org/admin/units', payload)

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to create org unit')
  }

  return normalizeOrgUnit(res.data)
}

export async function updateOrgUnit(id: string, payload: UpdateOrgUnitPayload): Promise<void> {
  const res = await put<null>(`/org/admin/units/${encodeURIComponent(id)}`, payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update org unit')
  }
}

export async function deleteOrgUnit(id: string): Promise<void> {
  const res = await del<null>(`/org/admin/units/${encodeURIComponent(id)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete org unit')
  }
}

/**
 * Backward-compatible: old page wants rows of Faculty / Department / Major.
 */
export async function getOrgTree(): Promise<OrgEntry[]> {
  const units = await listOrgUnits()
  return orgEntriesFromUnits(units)
}

/**
 * Backward-compatible: old page adds one Faculty / Department / Major row.
 * 内部会按层级创建缺失节点。
 */
export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  const facultyName = entry.faculty?.trim()
  const deptName = entry.department?.trim()
  const majorName = entry.major?.trim()

  if (!facultyName) throw new Error('Faculty is required.')

  const units = await listOrgUnits()
  const faculty = await findOrCreateOrgUnit(units, facultyName, 'FACULTY', null)

  if (!deptName) return

  const dept = await findOrCreateOrgUnit(units, deptName, 'DEPARTMENT', faculty.id)

  if (!majorName) return

  await findOrCreateOrgUnit(units, majorName, 'MAJOR', dept.id)
}

export async function importOrgFromExcel(file: File): Promise<void> {
  if (!file || file.size === 0) {
    throw new Error('Uploaded file is empty.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const res = await upload<any>('/org/admin/units/import-excel', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import organization file')
  }
}
