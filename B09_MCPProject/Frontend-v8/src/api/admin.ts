import { del, get, post, put, upload, unwrap } from './request'
import { isOrgType, type OrgUnit } from './org'

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

export type { OrgUnit }

export interface OrgUnitPayload {
  name?: string
  type?: 'FACULTY' | 'DEPARTMENT' | 'DEPT' | 'MAJOR' | 'GROUP' | string
  parentId?: string | null
  sortOrder?: number
  [key: string]: any
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

function normalizeOrgUnit(raw: any): OrgUnit {
  const id = String(raw?.id ?? raw?.unitId ?? '')
  const type = String(raw?.type ?? raw?.unitType ?? '')

  return {
    ...raw,
    id,
    unitId: raw?.unitId ?? id,
    type,
    unitType: raw?.unitType ?? type,
    name: String(raw?.name ?? ''),
    parentId: raw?.parentId ?? null,
  }
}

export async function listConsultants(): Promise<AdminAccount[]> {
  const res = await get<AdminAccount[]>('/api/user/admin/faculty-consultants')
  return unwrap(res) || []
}

export const listFacultyConsultants = listConsultants

export async function addConsultant(payload: AdminAccountPayload): Promise<AdminAccount> {
  const res = await post<AdminAccount>('/api/user/admin/faculty-consultants', payload)
  return unwrap(res)
}

export const createFacultyConsultant = addConsultant

export async function getConsultant(id: string): Promise<AdminAccount> {
  const res = await get<AdminAccount>(`/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`)
  return unwrap(res)
}

export const getFacultyConsultant = getConsultant

export async function updateConsultant(
  idOrPayload: string | (AdminAccountPayload & { id?: string }),
  payload?: AdminAccountPayload,
): Promise<AdminAccount> {
  const id = typeof idOrPayload === 'string' ? idOrPayload : idOrPayload.id
  const body = typeof idOrPayload === 'string' ? payload || {} : { ...idOrPayload }

  if (!id) throw new Error('consultant id is required')
  delete (body as any).id

  const res = await put<AdminAccount>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
    body,
  )
  return unwrap(res)
}

export const updateFacultyConsultant = updateConsultant

export async function deleteConsultant(id: string): Promise<void> {
  const res = await del<null>(`/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`)
  unwrap(res)
}

export const deleteFacultyConsultant = deleteConsultant

export async function listSupportingStaff(): Promise<AdminAccount[]> {
  const res = await get<AdminAccount[]>('/api/user/admin/supporting-staff')
  return unwrap(res) || []
}

export async function addSupportingStaff(payload: AdminAccountPayload): Promise<AdminAccount> {
  const res = await post<AdminAccount>('/api/user/admin/supporting-staff', payload)
  return unwrap(res)
}

export const createSupportingStaff = addSupportingStaff

export async function getSupportingStaffById(id: string): Promise<AdminAccount> {
  const res = await get<AdminAccount>(`/api/user/admin/supporting-staff/${encodeURIComponent(id)}`)
  return unwrap(res)
}

// Old page compatibility: some old code calls getSupportingStaff(id), some calls getSupportingStaff().
export async function getSupportingStaff(id?: string): Promise<AdminAccount | AdminAccount[]> {
  return id ? getSupportingStaffById(id) : listSupportingStaff()
}

export async function updateSupportingStaff(
  idOrPayload: string | (AdminAccountPayload & { id?: string }),
  payload?: AdminAccountPayload,
): Promise<AdminAccount> {
  const id = typeof idOrPayload === 'string' ? idOrPayload : idOrPayload.id
  const body = typeof idOrPayload === 'string' ? payload || {} : { ...idOrPayload }

  if (!id) throw new Error('staff id is required')
  delete (body as any).id

  const res = await put<AdminAccount>(
    `/api/user/admin/supporting-staff/${encodeURIComponent(id)}`,
    body,
  )
  return unwrap(res)
}

export async function deleteSupportingStaff(id: string): Promise<void> {
  // This DELETE is used by the UI. It is not listed in the uploaded OpenAPI.
  const res = await del<null>(`/api/user/admin/supporting-staff/${encodeURIComponent(id)}`)
  unwrap(res)
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const res = await get<any[]>('/api/org/admin/units')
  return (unwrap(res) || []).map(normalizeOrgUnit)
}

export const getAdminOrgUnits = listOrgUnits
export const getRawOrgUnits = listOrgUnits

export async function createOrgUnit(payload: OrgUnitPayload): Promise<OrgUnit> {
  const res = await post<any>('/api/org/admin/units', payload)
  return normalizeOrgUnit(unwrap(res))
}

export async function getOrgUnit(id: string): Promise<OrgUnit> {
  const res = await get<any>(`/api/org/admin/units/${encodeURIComponent(id)}`)
  return normalizeOrgUnit(unwrap(res))
}

export async function updateOrgUnit(id: string, payload: OrgUnitPayload): Promise<OrgUnit> {
  const res = await put<any>(`/api/org/admin/units/${encodeURIComponent(id)}`, payload)
  return normalizeOrgUnit(unwrap(res))
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

export const importOrgUnitsFromExcel = importOrgUnitsExcel
export const importOrgFromExcel = importOrgUnitsExcel

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

export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  const facultyName = entry.faculty.trim()
  const departmentName = entry.department.trim()
  const majorName = entry.major.trim()

  if (!facultyName || !departmentName || !majorName) {
    throw new Error('Faculty, department and major are required.')
  }

  let units = await listOrgUnits()

  let faculty = units.find((u) => isOrgType(u, 'FACULTY') && sameName(u.name, facultyName))

  if (!faculty) {
    faculty = await createOrgUnit({
      name: facultyName,
      type: 'FACULTY',
      parentId: null,
      sortOrder: 1,
    })
    units = await listOrgUnits()
  }

  let department = units.find(
    (u) =>
      (isOrgType(u, 'DEPARTMENT') || isOrgType(u, 'DEPT')) &&
      u.parentId === faculty!.id &&
      sameName(u.name, departmentName),
  )

  if (!department) {
    department = await createOrgUnit({
      name: departmentName,
      type: 'DEPARTMENT',
      parentId: faculty.id,
      sortOrder: 1,
    })
    units = await listOrgUnits()
  }

  const major = units.find(
    (u) => isOrgType(u, 'MAJOR') && u.parentId === department!.id && sameName(u.name, majorName),
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

function sameName(a?: string, b?: string): boolean {
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
