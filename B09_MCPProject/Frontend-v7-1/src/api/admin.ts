/**
 * src/api/admin.ts
 *
 * Admin APIs:
 * - Faculty Consultant management
 * - Supporting Staff creation
 * - Organization wrappers
 */

import { get, post, put } from './request'
import {
  createOrgUnit,
  deleteOrgUnit,
  getOrgUnits,
  importOrgUnitsFromExcel,
  updateOrgUnit,
} from './org'

import type {
  CreateOrgUnitPayload,
  OrgUnit,
  UpdateOrgUnitPayload,
} from './org'

export interface ConsultantInfo {
  id?: string
  username: string
  password?: string
  email?: string
  realName?: string
  phone?: string | null
  status?: number
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface SupportingStaffInfo {
  id?: string
  username: string
  password?: string
  email?: string
  realName?: string
  phone?: string | null
  status?: number
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. A placeholder has been kept here for future integration.`)
}

// ==================== Faculty Consultant ====================

export async function listConsultants(): Promise<ConsultantInfo[]> {
  const res = await get<ConsultantInfo[]>('/api/user/admin/faculty-consultants')
  return res.data || []
}

export const listFacultyConsultants = listConsultants

export async function getConsultant(id: string): Promise<ConsultantInfo | null> {
  const res = await get<ConsultantInfo>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
  )

  return res.data || null
}

export const getFacultyConsultant = getConsultant

export async function addConsultant(info: ConsultantInfo): Promise<any> {
  const res = await post<any>('/api/user/admin/faculty-consultants', info)
  return res.data
}

export const createFacultyConsultant = addConsultant

export async function updateConsultant(info: ConsultantInfo): Promise<any> {
  const id = info.id
  if (!id) throw new Error('consultant id is required')

  const payload = { ...info }
  delete payload.id

  const res = await put<any>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
    payload,
  )

  return res.data
}

export async function updateFacultyConsultant(
  id: string,
  payload: Partial<ConsultantInfo>,
): Promise<any> {
  const res = await put<any>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
    payload,
  )

  return res.data
}

export async function deleteConsultant(consultantId: string): Promise<void> {
  if (!consultantId) throw new Error('consultantId is required')
  return missingEndpoint('deleteConsultant')
}

export const deleteFacultyConsultant = deleteConsultant

// ==================== Supporting Staff ====================

export async function addSupportingStaff(info: SupportingStaffInfo): Promise<any> {
  const res = await post<any>('/api/user/admin/supporting-staff', info)
  return res.data
}

export const createSupportingStaff = addSupportingStaff

export async function listSupportingStaff(): Promise<SupportingStaffInfo[]> {
  return missingEndpoint('listSupportingStaff')
}

export async function getSupportingStaff(staffId: string): Promise<SupportingStaffInfo | null> {
  if (!staffId) throw new Error('staffId is required')
  return missingEndpoint('getSupportingStaff')
}

export async function updateSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  if (!info.id) throw new Error('staff id is required')
  return missingEndpoint('updateSupportingStaff')
}

export async function deleteSupportingStaff(staffId: string): Promise<void> {
  if (!staffId) throw new Error('staffId is required')
  return missingEndpoint('deleteSupportingStaff')
}

// ==================== Organization Wrappers ====================

export async function getRawOrgUnits(): Promise<OrgUnit[]> {
  return await getOrgUnits()
}

export async function getOrgTree(): Promise<OrgEntry[]> {
  const units = await getOrgUnits()
  return flattenOrgUnitsToEntries(units)
}

export async function addOrgUnit(payload: CreateOrgUnitPayload): Promise<void> {
  await createOrgUnit(payload)
}

export async function editOrgUnit(
  id: string,
  payload: UpdateOrgUnitPayload,
): Promise<void> {
  await updateOrgUnit(id, payload)
}

export async function removeOrgUnit(id: string): Promise<void> {
  await deleteOrgUnit(id)
}

export async function importOrgFromExcel(file: File): Promise<void> {
  await importOrgUnitsFromExcel(file)
}

/**
 * Convenience function for old manual setup page:
 * one row = Faculty + Department + Major.
 */
export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  const facultyName = entry.faculty.trim()
  const departmentName = entry.department.trim()
  const majorName = entry.major.trim()

  if (!facultyName || !departmentName || !majorName) {
    throw new Error('Faculty, department and major are required.')
  }

  let units = await getOrgUnits()

  let faculty = units.find(
    (u) => isType(u, 'FACULTY') && sameName(u.name, facultyName),
  )

  if (!faculty) {
    await createOrgUnit({
      name: facultyName,
      type: 'FACULTY',
      parentId: null,
      sortOrder: 1,
    })

    units = await getOrgUnits()
    faculty = units.find((u) => isType(u, 'FACULTY') && sameName(u.name, facultyName))
  }

  if (!faculty) throw new Error('Failed to create faculty.')

  let department = units.find(
    (u) =>
      (isType(u, 'DEPARTMENT') || isType(u, 'DEPT')) &&
      u.parentId === faculty!.id &&
      sameName(u.name, departmentName),
  )

  if (!department) {
    await createOrgUnit({
      name: departmentName,
      type: 'DEPARTMENT',
      parentId: faculty.id,
      sortOrder: 1,
    })

    units = await getOrgUnits()
    department = units.find(
      (u) =>
        (isType(u, 'DEPARTMENT') || isType(u, 'DEPT')) &&
        u.parentId === faculty!.id &&
        sameName(u.name, departmentName),
    )
  }

  if (!department) throw new Error('Failed to create department.')

  const existingMajor = units.find(
    (u) =>
      isType(u, 'MAJOR') &&
      u.parentId === department!.id &&
      sameName(u.name, majorName),
  )

  if (!existingMajor) {
    await createOrgUnit({
      name: majorName,
      type: 'MAJOR',
      parentId: department.id,
      sortOrder: 1,
    })
  }
}

function isType(unit: OrgUnit, type: string): boolean {
  return String(unit.type || '').toUpperCase() === type.toUpperCase()
}

function sameName(a?: string, b?: string): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function flattenOrgUnitsToEntries(units: OrgUnit[]): OrgEntry[] {
  const faculties = units.filter((u) => isType(u, 'FACULTY'))
  const departments = units.filter((u) => isType(u, 'DEPARTMENT') || isType(u, 'DEPT'))
  const majors = units.filter((u) => isType(u, 'MAJOR'))

  return majors.map((major) => {
    const department = departments.find((d) => d.id === major.parentId)
    const faculty = department
      ? faculties.find((f) => f.id === department.parentId)
      : undefined

    return {
      faculty: faculty?.name || '',
      department: department?.name || '',
      major: major.name || '',
    }
  })
}
