/**
 * src/api/mentoring.ts
 *
 * Mentoring APIs:
 * - interview records
 * - mentoring groups
 * - import
 * - special cases
 * - appointments
 * - export
 * - student self-service APIs
 */

import { del, downloadBlob, get, post, postForm, put } from './request'
import type { StudentFromApi } from './org'
import { normalizeStudent } from './org'

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. A placeholder has been kept here for future integration.`)
}

// ==================== Types ====================

export interface McpRecord {
  recordId?: string
  id?: string
  studentId: string
  mentorId?: string
  groupId?: string
  interviewDate: string
  interviewTime?: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface CreateRecordPayload {
  studentId: string
  groupId?: string
  interviewDate: string
  interviewTime?: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
  [key: string]: any
}

export interface UpdateRecordPayload extends CreateRecordPayload {
  recordId: string
}

export interface StudentGroupRecord {
  studentId: string
  name?: string
  major?: string
  status?: string
  groupId?: string
  records?: McpRecord[]
  interviewRecords?: McpRecord[]
  recordsCount?: number
  raw?: any
}

export interface GroupSearchResult {
  groupId: string
  id?: string
  name?: string
  parentId?: string
  facultyOrgId?: string
  mentorId?: string
  mentorName?: string
  studentCount?: number
  department?: string
  major?: string
  raw?: any
}

export interface GroupMember {
  studentId: string
  majorId?: string | null
  major?: string | null
  status?: string | null
  groupId?: string
  updateTime?: string
  raw?: any
}

export interface SpecialCasePayload {
  studentId: string
  description: string
  targetCoordinatorId: string
  [key: string]: any
}

export interface SpecialCase {
  caseId: string
  studentId: string
  submitterId?: string
  coordinatorId?: string | null
  consultantId?: string | null
  description: string
  status: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface AppointmentSlot {
  slotId: string
  mentorId?: string
  studentId?: string | null
  slotDate: string
  startTime: string
  endTime?: string
  venue?: string | null
  status?: string
  createTime?: string
  [key: string]: any
}

export interface CreateAppointmentSlotsPayload {
  slotDate: string
  startTimes: string[]
}

export interface SetSlotVenuePayload {
  venue: string
}

export interface ConfirmAppointmentPayload {
  slotId: string
}

export interface StudentGroupStatus {
  majorId?: string
  groupId?: string
  status?: string
  [key: string]: any
}

export interface MyMentorInfo {
  mentorId?: string
  mentorName?: string
  name?: string
  email?: string
  office?: string
  department?: string
  departmentName?: string
  groupId?: string
  [key: string]: any
}

// ==================== Imports ====================

/**
 * OpenAPI currently writes these import APIs as GET, but file upload cannot be done by GET.
 * The code keeps the practical POST multipart version here.
 * If backend really only exposes GET, ask backend to fix the method to POST multipart/form-data.
 */
export async function importMcpAllocation(file: File, facultyOrgId?: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  if (facultyOrgId) formData.append('facultyOrgId', facultyOrgId)

  const res = await postForm<any>('/api/mentoring/import/mcp-allocation', formData)
  return res.data
}

export async function importCoordinators(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await postForm<any>('/api/mentoring/import/coordinators', formData)
  return res.data
}

// ==================== Records ====================

export async function createRecord(payload: CreateRecordPayload): Promise<any> {
  const res = await post<any>('/api/mentoring/records', payload)
  return res.data
}

export async function saveInterviewRecord(payload: Partial<McpRecord>): Promise<any> {
  if (payload.recordId || payload.id) {
    return await updateRecord(payload as UpdateRecordPayload)
  }

  return await createRecord(payload as CreateRecordPayload)
}

export const saveRecord = saveInterviewRecord

export async function updateRecord(payload: UpdateRecordPayload): Promise<void> {
  if (!payload.recordId && !payload.id) {
    throw new Error('recordId is required')
  }

  // Missing in current OpenAPI:
  // PUT/PATCH /api/mentoring/records/{recordId}
  return missingEndpoint('updateRecord')
}

export async function deleteRecord(recordId: string): Promise<void> {
  await del<null>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
}

export const deleteInterviewRecord = deleteRecord

/**
 * OpenAPI shows a static sample path:
 * GET /api/mentoring/records/student/stu-12345
 *
 * The actual reusable implementation should be:
 * GET /api/mentoring/records/student/{studentId}
 */
export async function getRecordsByStudent(studentId: string): Promise<McpRecord[]> {
  const res = await get<any[]>(`/api/mentoring/records/student/${encodeURIComponent(studentId)}`)
  return normalizeRecordList(res.data || [])
}

export const fetchRecordsForStudent = getRecordsByStudent

export async function getRecordDetail(recordId: string): Promise<McpRecord> {
  const res = await get<any>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  return normalizeRecord(res.data)
}

export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const res = await get<any[]>(`/api/mentoring/records/group/${encodeURIComponent(groupId)}`)
  return (res.data || []).map(normalizeStudentGroupRecord)
}

export async function getMyRecords(): Promise<McpRecord[]> {
  const res = await get<any[]>('/api/mentoring/records/mine')
  return normalizeRecordList(res.data || [])
}

export async function searchStudentInMyGroups(studentId: string): Promise<StudentFromApi | null> {
  const res = await get<any>('/api/mentoring/records/students/search', { studentId })
  return res.data ? normalizeStudent(res.data, studentId) : null
}

export const lookupStudent = searchStudentInMyGroups

// ==================== Groups ====================

export async function searchGroups(groupId?: string): Promise<GroupSearchResult[]> {
  const res = await get<any[]>('/api/mentoring/groups/search', { groupId })
  const list = Array.isArray(res.data) ? res.data : res.data ? [res.data] : []
  return list.map(normalizeGroup)
}

export async function getGroupById(groupId: string): Promise<GroupSearchResult | null> {
  const res = await get<any>(`/api/mentoring/groups/${encodeURIComponent(groupId)}`)
  return res.data ? normalizeGroup(res.data) : null
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const res = await get<any[]>(`/api/mentoring/groups/${encodeURIComponent(groupId)}/members`)
  return (res.data || []).map(normalizeGroupMember)
}

/**
 * OpenAPI contains a static sample:
 * GET /api/mentoring/groups/by-mentor/mentor_math_01
 *
 * This function keeps the intended dynamic path.
 */
export async function getGroupsByMentor(mentorId: string): Promise<GroupSearchResult[]> {
  const res = await get<any[]>(`/api/mentoring/groups/by-mentor/${encodeURIComponent(mentorId)}`)
  const list = Array.isArray(res.data) ? res.data : res.data ? [res.data] : []
  return list.map(normalizeGroup)
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  await post<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
  await del<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
}

export async function changeGroupMentor(groupId: string, mentorId: string): Promise<void> {
  await put<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/mentor`,
    { mentorId },
  )
}

// ==================== Special Cases ====================

export async function createSpecialCase(payload: SpecialCasePayload): Promise<SpecialCase> {
  const res = await post<SpecialCase>('/api/mentoring/cases', payload)
  return res.data
}

export const forwardCaseToCoordinator = createSpecialCase

export async function listMyCases(): Promise<SpecialCase[]> {
  const res = await get<SpecialCase[]>('/api/mentoring/cases/mine')
  return res.data || []
}

export async function listConsultantCases(): Promise<SpecialCase[]> {
  const res = await get<SpecialCase[]>('/api/mentoring/cases/consultant')
  return res.data || []
}

export async function closeCase(caseId: string): Promise<void> {
  await put<null>(`/api/mentoring/cases/${encodeURIComponent(caseId)}/close`)
}

export async function listCoordinatorCases(): Promise<SpecialCase[]> {
  return missingEndpoint('listCoordinatorCases')
}

export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId?: string
  comment?: string
}): Promise<void> {
  if (!payload.caseId) throw new Error('caseId is required')
  return missingEndpoint('forwardCaseToConsultant')
}

// ==================== Appointments ====================

export async function createAppointmentSlots(
  payload: CreateAppointmentSlotsPayload,
): Promise<any> {
  const res = await post<any>('/api/mentoring/appointments/slots', payload)
  return res.data
}

export const createSlots = createAppointmentSlots

export async function setAppointmentSlotVenue(
  slotId: string,
  venue: string,
): Promise<any> {
  const res = await put<any>(
    `/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}/venue`,
    { venue },
  )
  return res.data
}

export const setSlotVenue = setAppointmentSlotVenue
export const mentorConfirmVenue = setAppointmentSlotVenue

export async function deleteAppointmentSlot(slotId: string): Promise<void> {
  await del<null>(`/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}`)
}

export const cancelSlot = deleteAppointmentSlot

export async function getMentorAvailableSlots(mentorId: string): Promise<AppointmentSlot[]> {
  const res = await get<AppointmentSlot[]>(
    `/api/mentoring/appointments/slots/mentor/${encodeURIComponent(mentorId)}`,
  )

  return res.data || []
}

export async function confirmAppointmentSlot(slotId: string): Promise<AppointmentSlot> {
  const res = await post<AppointmentSlot>('/api/mentoring/appointments/confirm', { slotId })
  return res.data
}

export const studentConfirmSlot = confirmAppointmentSlot

export async function listMyAppointments(): Promise<AppointmentSlot[]> {
  return missingEndpoint('listMyAppointments')
}

export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentSlot> {
  if (!appointmentId) throw new Error('appointmentId is required')
  return missingEndpoint('getAppointmentDetail')
}

// ==================== Student Self Service ====================

export async function getStudentGroupStatus(): Promise<StudentGroupStatus | null> {
  const res = await get<StudentGroupStatus>('/api/mentoring/student/group-status')
  return res.data || null
}

export async function getMyMentorInfo(): Promise<MyMentorInfo | null> {
  const res = await get<MyMentorInfo>('/api/mentoring/student/my-mentor')
  return res.data || null
}

export async function getMyStudentRecords(): Promise<McpRecord[]> {
  return missingEndpoint('getMyStudentRecords')
}

// ==================== Export ====================

export async function exportStudentRecordsDoc(studentId: string): Promise<Blob> {
  return await downloadBlob(
    `/api/mentoring/export/student/${encodeURIComponent(studentId)}`,
    { method: 'GET' },
  )
}

export async function exportGroupRecordsDoc(groupId: string): Promise<Blob> {
  return await downloadBlob(
    `/api/mentoring/export/group/${encodeURIComponent(groupId)}`,
    { method: 'GET' },
  )
}

// ==================== FC Root Record APIs ====================

export async function getFcStudentRecords(studentId: string): Promise<McpRecord[]> {
  const res = await get<any[]>(`/records/student/${encodeURIComponent(studentId)}`)
  return normalizeRecordList(res.data || [])
}

export async function getFcRecordDetail(recordId: string): Promise<McpRecord> {
  const res = await get<any>(`/records/${encodeURIComponent(recordId)}`)
  return normalizeRecord(res.data)
}

export async function getFcGroupRecords(groupId: string): Promise<StudentGroupRecord[]> {
  const res = await get<any[]>(`/records/group/${encodeURIComponent(groupId)}`)
  return (res.data || []).map(normalizeStudentGroupRecord)
}

export async function exportFcGroupRecords(groupId: string): Promise<Blob> {
  return await downloadBlob(`/export/group/${encodeURIComponent(groupId)}`, { method: 'GET' })
}

// ==================== Normalizers ====================

function normalizeRecordList(records: any[]): McpRecord[] {
  return records.map(normalizeRecord)
}

function normalizeRecord(raw: any): McpRecord {
  return {
    ...raw,
    recordId: raw?.recordId ?? raw?.id,
    id: raw?.id ?? raw?.recordId,
    studentId: String(raw?.studentId ?? ''),
    mentorId: raw?.mentorId,
    groupId: raw?.groupId,
    interviewDate: normalizeDate(raw?.interviewDate),
    interviewTime: normalizeTime(raw?.interviewTime),
    problemStatement: raw?.problemStatement ?? '',
    interviewSummary: raw?.interviewSummary ?? '',
    followupAction: raw?.followupAction ?? raw?.followUpAction ?? '',
    createTime: raw?.createTime,
    updateTime: raw?.updateTime,
  }
}

function normalizeStudentGroupRecord(raw: any): StudentGroupRecord {
  const records = Array.isArray(raw?.records)
    ? normalizeRecordList(raw.records)
    : Array.isArray(raw?.interviewRecords)
      ? normalizeRecordList(raw.interviewRecords)
      : undefined

  return {
    studentId: String(raw?.studentId ?? raw?.id ?? ''),
    name: raw?.name ?? raw?.studentName ?? raw?.realName ?? raw?.username,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId,
    status: raw?.status,
    groupId: raw?.groupId,
    records,
    interviewRecords: records,
    recordsCount: records ? records.length : raw?.recordsCount,
    raw,
  }
}

function normalizeGroup(raw: any): GroupSearchResult {
  return {
    ...raw,
    groupId: String(raw?.groupId ?? raw?.id ?? ''),
    id: raw?.id ?? raw?.groupId,
    name: raw?.name,
    parentId: raw?.parentId,
    facultyOrgId: raw?.facultyOrgId,
    mentorId: raw?.mentorId,
    mentorName: raw?.mentorName ?? raw?.currentMentor,
    studentCount: raw?.studentCount ?? raw?.count,
    department: raw?.department ?? raw?.departmentName,
    major: raw?.major ?? raw?.majorName,
    raw,
  }
}

function normalizeGroupMember(raw: any): GroupMember {
  return {
    studentId: String(raw?.studentId ?? raw?.id ?? ''),
    majorId: raw?.majorId ?? null,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId,
    updateTime: raw?.updateTime,
    raw,
  }
}

export function normalizeDate(value?: string): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function normalizeTime(value?: string): string {
  if (!value) return ''
  const text = String(value)
  const match = text.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : text
}
