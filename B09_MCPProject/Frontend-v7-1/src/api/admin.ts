/**
 * src/api/admin.ts
 *
 * Administrator API - organization, faculty consultant, supporting staff.
 */

import { get, post, put } from './request'
import {
  getOrgUnits,
  getOrgUnitById,
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
  importOrgUnitsFromExcel,
} from './org'
import type { OrgUnit, CreateOrgUnitPayload } from './org'

// ==================== Types ====================

export interface ConsultantInfo {
  consultantId?: string
  id?: string
  username?: string
  password?: string
  name: string
  realName?: string
  email: string
  phone?: string | null
  faculty?: string
  status?: number
  raw?: any
  [key: string]: any
}

export interface SupportingStaffInfo {
  staffId?: string
  id?: string
  username?: string
  password?: string
  name: string
  realName?: string
  accountId: string
  email?: string
  phone?: string | null
  status?: number
  canViewLog: boolean
  canReplyFeedback: boolean
  raw?: any
  [key: string]: any
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

// ==================== Missing Endpoint Helper ====================

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. The function is kept here for future wiring.`)
}

// ==================== Faculty Consultant ====================

export async function listConsultants(): Promise<ConsultantInfo[]> {
  const res = await get<any[]>('/api/user/admin/faculty-consultants')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load faculty consultants')
  }

  return (res.data || []).map(normalizeConsultant)
}

export async function getConsultant(
  consultantId: string,
): Promise<ConsultantInfo | null> {
  const id = String(consultantId || '').trim()
  if (!id) throw new Error('consultantId is required')

  const res = await get<any>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
  )

  if (res.code !== 200 || !res.data) {
    return null
  }

  return normalizeConsultant(res.data)
}

export async function addConsultant(info: ConsultantInfo): Promise<void> {
  if (!info.email) throw new Error('Email is required')

  const res = await post<any>(
    '/api/user/admin/faculty-consultants',
    buildUserPayload(info),
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to add faculty consultant')
  }
}

export async function updateConsultant(info: ConsultantInfo): Promise<void> {
  const id = String(info.consultantId || info.id || '').trim()
  if (!id) throw new Error('consultantId is required')

  const res = await put<any>(
    `/api/user/admin/faculty-consultants/${encodeURIComponent(id)}`,
    buildUserPayload(info, true),
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update faculty consultant')
  }
}

/**
 * Still missing in current OpenAPI:
 * DELETE /api/user/admin/faculty-consultants/{id}
 */
export async function deleteConsultant(consultantId: string): Promise<void> {
  if (!consultantId) throw new Error('consultantId is required')
  return missingEndpoint('deleteConsultant')
}

// ==================== Supporting Staff ====================

/**
 * Current OpenAPI only explicitly lists POST /api/user/admin/supporting-staff.
 * It says CRUD uses the same path with different methods, but GET/PUT/DELETE
 * are not actually declared. Keep those functions as placeholders.
 */
export async function listSupportingStaff(): Promise<SupportingStaffInfo[]> {
  return missingEndpoint('listSupportingStaff')
}

export async function getSupportingStaff(
  staffId: string,
): Promise<SupportingStaffInfo | null> {
  if (!staffId) throw new Error('staffId is required')
  return missingEndpoint('getSupportingStaff')
}

export async function addSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  const accountId = String(info.accountId || info.username || '').trim()
  if (!accountId) throw new Error('accountId is required')

  const res = await post<any>(
    '/api/user/admin/supporting-staff',
    buildSupportingStaffPayload(info),
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to add supporting staff')
  }
}

export async function updateSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  if (!info.staffId && !info.id) throw new Error('staffId is required')
  return missingEndpoint('updateSupportingStaff')
}

export async function deleteSupportingStaff(staffId: string): Promise<void> {
  if (!staffId) throw new Error('staffId is required')
  return missingEndpoint('deleteSupportingStaff')
}

// ==================== Organization ====================

export async function getOrgTree(): Promise<OrgEntry[]> {
  const units = await getOrgUnits()
  return flattenOrgUnitsToEntries(units)
}

export async function getRawOrgUnits(): Promise<OrgUnit[]> {
  return await getOrgUnits()
}

export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  const facultyName = entry.faculty.trim()
  const departmentName = entry.department.trim()
  const majorName = entry.major.trim()

  if (!facultyName || !departmentName || !majorName) {
    throw new Error('Faculty, department and major are required.')
  }

  let units = await getOrgUnits()

  let faculty = units.find(
    (u) => isType(u, 'FACULTY') && u.name.toLowerCase() === facultyName.toLowerCase(),
  )

  if (!faculty) {
    await createOrgUnit({
      name: facultyName,
      type: 'FACULTY',
      parentId: null,
      sortOrder: 1,
    })

    units = await getOrgUnits()
    faculty = units.find(
      (u) => isType(u, 'FACULTY') && u.name.toLowerCase() === facultyName.toLowerCase(),
    )
  }

  if (!faculty) {
    throw new Error('Failed to create faculty.')
  }

  let department = units.find(
    (u) =>
      isType(u, 'DEPARTMENT') &&
      u.parentId === faculty!.id &&
      u.name.toLowerCase() === departmentName.toLowerCase(),
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
        isType(u, 'DEPARTMENT') &&
        u.parentId === faculty!.id &&
        u.name.toLowerCase() === departmentName.toLowerCase(),
    )
  }

  if (!department) {
    throw new Error('Failed to create department.')
  }

  await createOrgUnit({
    name: majorName,
    type: 'MAJOR',
    parentId: department.id,
    sortOrder: 1,
  })
}

export async function addOrgUnit(payload: CreateOrgUnitPayload): Promise<void> {
  await createOrgUnit(payload)
}

export async function editOrgUnit(
  id: string,
  payload: {
    name?: string
    sortOrder?: number
  },
): Promise<void> {
  const exists = await getOrgUnitById(id)
  if (!exists) throw new Error('Organization unit not found')

  await updateOrgUnit(id, payload)
}

export async function removeOrgUnit(id: string): Promise<void> {
  await deleteOrgUnit(id)
}

export async function importOrgFromExcel(file: File): Promise<void> {
  await importOrgUnitsFromExcel(file)
}

// ==================== Helpers ====================

function normalizeConsultant(raw: any): ConsultantInfo {
  const id = String(raw.id ?? raw.consultantId ?? '')
  const realName = raw.realName ?? raw.name ?? ''

  return {
    ...raw,
    id,
    consultantId: id,
    username: raw.username ?? '',
    name: realName || raw.username || id,
    realName,
    email: raw.email ?? '',
    phone: raw.phone ?? null,
    faculty: raw.faculty ?? raw.facultyName ?? '',
    status: Number(raw.status ?? 1),
    raw,
  }
}

function normalizeSupportingStaff(raw: any): SupportingStaffInfo {
  const id = String(raw.id ?? raw.staffId ?? '')
  const username = raw.username ?? raw.accountId ?? ''
  const realName = raw.realName ?? raw.name ?? username

  return {
    ...raw,
    id,
    staffId: id,
    username,
    accountId: username,
    name: realName,
    realName,
    email: raw.email ?? '',
    phone: raw.phone ?? null,
    status: Number(raw.status ?? 1),
    canViewLog: Boolean(raw.canViewLog ?? true),
    canReplyFeedback: Boolean(raw.canReplyFeedback ?? true),
    raw,
  }
}

function buildUserPayload(info: ConsultantInfo, partial = false): Record<string, any> {
  const realName = info.realName ?? info.name
  const email = info.email
  const username =
    info.username ||
    (email ? email.split('@')[0] : undefined) ||
    realName ||
    undefined

  const payload: Record<string, any> = {
    username,
    email,
    realName,
    phone: info.phone ?? '',
    status: info.status ?? 1,
  }

  if (!partial || info.password) {
    // Backend example requires password when creating. Keep default only for
    // compatibility with old add page that did not have a password field.
    payload.password = info.password || '123456'
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === '') delete payload[key]
  })

  return payload
}

function buildSupportingStaffPayload(info: SupportingStaffInfo): Record<string, any> {
  const username =
    info.username ||
    info.accountId ||
    (info.email ? info.email.split('@')[0] : undefined)

  const payload: Record<string, any> = {
    username,
    password: info.password || '123456',
    email: info.email || `${username || 'support'}@bnbu.edu.cn`,
    realName: info.realName || info.name || username,
    phone: info.phone ?? '',
    status: info.status ?? 1,
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === '') delete payload[key]
  })

  return payload
}

function isType(unit: OrgUnit, type: string): boolean {
  return String(unit.type).toUpperCase() === type.toUpperCase()
}

function flattenOrgUnitsToEntries(units: OrgUnit[]): OrgEntry[] {
  const faculties = units.filter((u) => isType(u, 'FACULTY'))
  const departments = units.filter((u) => isType(u, 'DEPARTMENT'))
  const majors = units.filter((u) => isType(u, 'MAJOR'))

  const entries: OrgEntry[] = []

  for (const major of majors) {
    const department = departments.find((d) => d.id === major.parentId)
    const faculty = department
      ? faculties.find((f) => f.id === department.parentId)
      : undefined

    entries.push({
      faculty: faculty?.name || '',
      department: department?.name || '',
      major: major.name,
    })
  }

  return entries
}
