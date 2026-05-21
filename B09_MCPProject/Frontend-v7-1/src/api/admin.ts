import { del, get, post, put, upload, unwrap } from './request'

export interface AdminAccountPayload {
  username?: string
  password?: string
  email?: string
  realName?: string
  phone?: string
  status?: number
  [key: string]: any
}

export interface AdminAccount {
  id: string
  username: string
  realName?: string | null
  phone?: string | null
  email?: string | null
  status?: number
  createTime?: string | null
  updateTime?: string | null
  [key: string]: any
}

export interface OrgUnitPayload {
  name?: string
  type?: 'FACULTY' | 'DEPARTMENT' | 'MAJOR' | string
  parentId?: string | null
  sortOrder?: number
  [key: string]: any
}

export interface OrgUnit {
  id: string
  name: string
  type: string
  parentId?: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string
  [key: string]: any
}

// Faculty Consultant 管理
export async function listConsultants(): Promise<AdminAccount[]> {
  const res = await get<AdminAccount[]>('/api/user/admin/faculty-consultants')
  return unwrap(res) || []
}

export async function addConsultant(payload: AdminAccountPayload): Promise<AdminAccount> {
  const res = await post<AdminAccount>('/api/user/admin/faculty-consultants', payload)
  return unwrap(res)
}

export async function getConsultant(id: string): Promise<AdminAccount> {
  const res = await get<AdminAccount>(`/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`)
  return unwrap(res)
}

export async function updateConsultant(
  id: string,
  payload: AdminAccountPayload,
): Promise<AdminAccount> {
  const res = await put<AdminAccount>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
    payload,
  )
  return unwrap(res)
}

export async function deleteConsultant(id: string): Promise<void> {
  const res = await del<null>(`/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`)
  unwrap(res)
}

// Supporting Staff 管理
export async function listSupportingStaff(): Promise<AdminAccount[]> {
  const res = await get<AdminAccount[]>('/api/user/admin/supporting-staff')
  return unwrap(res) || []
}

// 兼容旧页面命名
export const getSupportingStaff = listSupportingStaff

export async function addSupportingStaff(payload: AdminAccountPayload): Promise<AdminAccount> {
  const res = await post<AdminAccount>('/api/user/admin/supporting-staff', payload)
  return unwrap(res)
}

export async function getSupportingStaffById(id: string): Promise<AdminAccount> {
  const res = await get<AdminAccount>(`/api/user/admin/supporting-staff/${encodeURIComponent(id)}`)
  return unwrap(res)
}

export async function updateSupportingStaff(
  id: string,
  payload: AdminAccountPayload,
): Promise<AdminAccount> {
  const res = await put<AdminAccount>(
    `/api/user/admin/supporting-staff/${encodeURIComponent(id)}`,
    payload,
  )
  return unwrap(res)
}

// 新 OpenAPI path item 没列 DELETE，但接口描述写“增删改查使用同一路径不同方法，与 FC 一样”。
// 所以这里按同路径 DELETE 接；如果联调 404，说明后端或文档仍需补齐。
export async function deleteSupportingStaff(id: string): Promise<void> {
  const res = await del<null>(`/api/user/admin/supporting-staff/${encodeURIComponent(id)}`)
  unwrap(res)
}

// 组织结构管理
export async function listOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<OrgUnit[]>('/api/org/admin/units')
  return unwrap(res) || []
}

export async function createOrgUnit(payload: OrgUnitPayload): Promise<OrgUnit> {
  const res = await post<OrgUnit>('/api/org/admin/units', payload)
  return unwrap(res)
}

export async function getOrgUnit(id: string): Promise<OrgUnit> {
  const res = await get<OrgUnit>(`/api/org/admin/units/${encodeURIComponent(id)}`)
  return unwrap(res)
}

export async function updateOrgUnit(id: string, payload: OrgUnitPayload): Promise<OrgUnit> {
  const res = await put<OrgUnit>(`/api/org/admin/units/${encodeURIComponent(id)}`, payload)
  return unwrap(res)
}

export async function deleteOrgUnit(id: string): Promise<void> {
  const res = await del<null>(`/api/org/admin/units/${encodeURIComponent(id)}`)
  unwrap(res)
}

export async function importOrgUnitsExcel(file: File): Promise<any> {
  const form = new FormData()
  form.append('file', file)
  const res = await upload<any>('/api/org/admin/units/import-excel', form)
  return unwrap(res)
}


// ==================== Backward compatibility for old admin pages ====================

export type ConsultantInfo = AdminAccount
export type SupportingStaffInfo = AdminAccount
export const listFacultyConsultants = listConsultants
export const createFacultyConsultant = addConsultant
export const getFacultyConsultant = getConsultant
export const deleteFacultyConsultant = deleteConsultant

export async function updateFacultyConsultant(
  id: string,
  payload: Partial<AdminAccountPayload>,
): Promise<AdminAccount> {
  return updateConsultant(id, payload)
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

export async function getRawOrgUnits(): Promise<OrgUnit[]> {
  return listOrgUnits()
}

export async function getOrgTree(): Promise<OrgEntry[]> {
  const units = await listOrgUnits()
  return flattenOrgUnitsToEntries(units)
}

export async function addOrgUnit(payload: OrgUnitPayload): Promise<void> {
  await createOrgUnit(payload)
}

export async function editOrgUnit(id: string, payload: OrgUnitPayload): Promise<void> {
  await updateOrgUnit(id, payload)
}

export async function removeOrgUnit(id: string): Promise<void> {
  await deleteOrgUnit(id)
}

export async function importOrgFromExcel(file: File): Promise<any> {
  return importOrgUnitsExcel(file)
}

export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  const facultyName = entry.faculty.trim()
  const departmentName = entry.department.trim()
  const majorName = entry.major.trim()

  if (!facultyName || !departmentName || !majorName) {
    throw new Error('Faculty, department and major are required.')
  }

  let units = await listOrgUnits()

  let faculty = units.find((u) => isOrgType(u, 'FACULTY') && sameOrgName(u.name, facultyName))

  if (!faculty) {
    await createOrgUnit({ name: facultyName, type: 'FACULTY', parentId: null, sortOrder: 1 })
    units = await listOrgUnits()
    faculty = units.find((u) => isOrgType(u, 'FACULTY') && sameOrgName(u.name, facultyName))
  }

  if (!faculty) throw new Error('Failed to create faculty.')

  let department = units.find(
    (u) =>
      (isOrgType(u, 'DEPARTMENT') || isOrgType(u, 'DEPT')) &&
      u.parentId === faculty!.id &&
      sameOrgName(u.name, departmentName),
  )

  if (!department) {
    await createOrgUnit({
      name: departmentName,
      type: 'DEPARTMENT',
      parentId: faculty.id,
      sortOrder: 1,
    })
    units = await listOrgUnits()
    department = units.find(
      (u) =>
        (isOrgType(u, 'DEPARTMENT') || isOrgType(u, 'DEPT')) &&
        u.parentId === faculty!.id &&
        sameOrgName(u.name, departmentName),
    )
  }

  if (!department) throw new Error('Failed to create department.')

  const major = units.find(
    (u) => isOrgType(u, 'MAJOR') && u.parentId === department!.id && sameOrgName(u.name, majorName),
  )

  if (!major) {
    await createOrgUnit({
      name: majorName,
      type: 'MAJOR',
      parentId: department.id,
      sortOrder: 1,
    })
  }
}

function isOrgType(unit: OrgUnit, type: string): boolean {
  return String(unit.type || '').toUpperCase() === type.toUpperCase()
}

function sameOrgName(a?: string, b?: string): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function flattenOrgUnitsToEntries(units: OrgUnit[]): OrgEntry[] {
  const faculties = units.filter((u) => isOrgType(u, 'FACULTY'))
  const departments = units.filter((u) => isOrgType(u, 'DEPARTMENT') || isOrgType(u, 'DEPT'))
  const majors = units.filter((u) => isOrgType(u, 'MAJOR'))

  return majors.map((major) => {
    const department = departments.find((d) => d.id === major.parentId)
    const faculty = department ? faculties.find((f) => f.id === department.parentId) : undefined

    return {
      faculty: faculty?.name || '',
      department: department?.name || '',
      major: major.name || '',
    }
  })
}
