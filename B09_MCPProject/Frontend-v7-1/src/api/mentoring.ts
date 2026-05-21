/**
 * src/api/mentoring.ts
 *
 * Mentoring API - interview records, groups, cases, appointments, exports.
 */

import { get, post, put, del, postForm, getBlob } from './request'
import { searchStudentById, getMyDeptMember } from './org'
import type { StudentFromApi } from './org'

// ==================== Types ====================

export interface McpRecord {
  recordId?: string
  studentId: string
  mentorId?: string
  groupId?: string
  interviewDate: string
  interviewTime?: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
  createTime?: string
  [key: string]: any
}

export interface StudentGroupRecord {
  studentId: string
  majorId?: string
  major?: string
  status?: string
  groupId: string
  interviewRecords: McpRecord[]
  [key: string]: any
}

export interface CreateRecordPayload {
  studentId: string
  groupId: string
  interviewDate: string
  interviewTime?: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
}

export interface UpdateRecordPayload extends CreateRecordPayload {
  recordId: string
}

export interface GroupSearchResult {
  groupId?: string
  id?: string
  name?: string
  mentorId?: string
  mentorName?: string
  studentCount?: number
  major?: string
  department?: string
  [key: string]: any
}

export interface GroupMember {
  studentId: string
  majorId?: string | null
  status?: string
  groupId?: string
  updateTime?: string
  [key: string]: any
}

export interface CaseItem {
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

export interface ForwardCasePayload {
  studentId: string
  description: string
  targetCoordinatorId: string
}

export interface AppointmentSlot {
  slotId: string
  mentorId: string
  studentId?: string | null
  slotDate: string
  startTime: string
  endTime?: string
  venue?: string | null
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | string
  createTime?: string
  [key: string]: any
}

export interface CreateAppointmentSlotsPayload {
  slotDate: string
  startTimes: string[]
}

export interface StudentGroupStatus {
  majorId?: string | null
  groupId?: string | null
  status?: string | null
  [key: string]: any
}

export interface StudentMyMentor {
  mentor: any[]
  groupId: string
  [key: string]: any
}

// ==================== Excel Imports ====================

/**
 * Current OpenAPI still documents these import URLs as GET, but file upload
 * must be multipart/form-data. Keep POST here to match the actual upload usage.
 */
export async function importMcpAllocation(
  file: File,
  facultyOrgId?: string,
): Promise<any> {
  if (!file || file.size === 0) {
    throw new Error('Uploaded file is empty.')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (facultyOrgId) formData.append('facultyOrgId', facultyOrgId)

  const res = await postForm<any>('/api/mentoring/import/mcp-allocation', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import MCP allocation')
  }

  return res.data
}

/**
 * Current OpenAPI still documents these import URLs as GET, but file upload
 * must be multipart/form-data. Keep POST here to match the actual upload usage.
 */
export async function importCoordinators(
  file: File,
  facultyOrgId?: string,
): Promise<any> {
  if (!file || file.size === 0) {
    throw new Error('Uploaded file is empty.')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (facultyOrgId) formData.append('facultyOrgId', facultyOrgId)

  const res = await postForm<any>('/api/mentoring/import/coordinators', formData)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to import coordinators')
  }

  return res.data
}

// ==================== Group APIs ====================

export async function searchGroups(groupId?: string): Promise<GroupSearchResult[]> {
  const res = await get<any>('/api/mentoring/groups/search', {
    groupId,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search groups')
  }

  if (Array.isArray(res.data)) return res.data
  if (res.data) return [res.data]
  return []
}

export async function getGroupById(groupId: string): Promise<GroupSearchResult | null> {
  const gid = String(groupId || '').trim()
  if (!gid) return null

  const res = await get<any>(`/api/mentoring/groups/${encodeURIComponent(gid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return res.data
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const gid = String(groupId || '').trim()
  if (!gid) return []

  const res = await get<any[]>(
    `/api/mentoring/groups/${encodeURIComponent(gid)}/members`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get group members')
  }

  return (res.data || []).map((item: any) => ({
    ...item,
    studentId: item.studentId ?? item.id ?? item.userId ?? '',
    groupId: item.groupId ?? gid,
  }))
}

export async function changeMentoringGroupMentor(
  groupId: string,
  mentorId: string,
): Promise<any> {
  const gid = String(groupId || '').trim()
  const mid = String(mentorId || '').trim()
  if (!gid) throw new Error('groupId is required')
  if (!mid) throw new Error('mentorId is required')

  const res = await put<any>(
    `/api/mentoring/groups/${encodeURIComponent(gid)}/mentor`,
    { mentorId: mid },
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to change group mentor')
  }

  return res.data
}

export async function addGroupMember(
  groupId: string,
  studentId: string,
): Promise<void> {
  const gid = String(groupId || '').trim()
  const sid = String(studentId || '').trim()
  if (!gid) throw new Error('groupId is required')
  if (!sid) throw new Error('studentId is required')

  const res = await post<null>(
    `/api/mentoring/groups/${encodeURIComponent(gid)}/members/${encodeURIComponent(sid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to add student to group')
  }
}

export async function removeGroupMember(
  groupId: string,
  studentId: string,
): Promise<void> {
  const gid = String(groupId || '').trim()
  const sid = String(studentId || '').trim()
  if (!gid) throw new Error('groupId is required')
  if (!sid) throw new Error('studentId is required')

  const res = await del<null>(
    `/api/mentoring/groups/${encodeURIComponent(gid)}/members/${encodeURIComponent(sid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to remove student from group')
  }
}

// ==================== Interview Record API ====================

export async function getRecordsByStudent(studentId: string): Promise<McpRecord[]> {
  const sid = String(studentId || '').trim()
  if (!sid) return []

  const res = await get<any[]>(
    `/api/mentoring/records/student/${encodeURIComponent(sid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get records')
  }

  return normalizeRecordList(res.data || [])
}

export async function getMyRecords(): Promise<McpRecord[]> {
  const res = await get<any[]>('/api/mentoring/records/mine')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get my records')
  }

  return normalizeRecordList(res.data || [])
}

export async function fetchRecordsForStudent(studentId: string): Promise<McpRecord[]> {
  const role = (localStorage.getItem('role') || '').trim()
  const sid = String(studentId || '').trim()
  if (!sid) return []

  if (role === 'mentor') {
    const all = await getMyRecords()
    return all.filter((r) => String(r.studentId).trim() === sid)
  }

  return await getRecordsByStudent(sid)
}

export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const gid = String(groupId || '').trim()
  if (!gid) return []

  const res = await get<any[]>(
    `/api/mentoring/records/group/${encodeURIComponent(gid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get group records')
  }

  return (res.data || []).map((item: any) => ({
    ...item,
    studentId: item.studentId ?? item.id ?? '',
    groupId: item.groupId ?? gid,
    interviewRecords: normalizeRecordList(item.interviewRecords || item.records || []),
  }))
}

export async function getRecordDetail(recordId: string): Promise<McpRecord> {
  const rid = String(recordId || '').trim()
  if (!rid) throw new Error('recordId is required')

  const res = await get<any>(
    `/api/mentoring/records/${encodeURIComponent(rid)}`,
  )

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Record not found')
  }

  return normalizeRecord(res.data)
}

/**
 * POST /api/mentoring/records
 * Without recordId = create.
 */
export async function createRecord(payload: CreateRecordPayload): Promise<any> {
  const res = await post<any>('/api/mentoring/records', normalizeRecordPayload(payload))

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to create record')
  }

  return res.data
}

/**
 * POST /api/mentoring/records
 * With recordId = update.
 */
export async function updateRecord(payload: UpdateRecordPayload): Promise<any> {
  const res = await post<any>('/api/mentoring/records', normalizeRecordPayload(payload))

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update record')
  }

  return res.data
}

export async function deleteRecord(recordId: string): Promise<void> {
  const rid = String(recordId || '').trim()
  if (!rid) throw new Error('recordId is required')

  const res = await del<null>(`/api/mentoring/records/${encodeURIComponent(rid)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete record')
  }
}

export async function saveRecord(record: McpRecord): Promise<void> {
  const base = {
    studentId: record.studentId,
    groupId: record.groupId || '',
    interviewDate: normalizeDate(record.interviewDate),
    interviewTime: normalizeTime(record.interviewTime),
    problemStatement: record.problemStatement,
    interviewSummary: record.interviewSummary,
    followupAction: record.followupAction,
  }

  if (record.recordId) {
    await updateRecord({
      recordId: record.recordId,
      ...base,
    })
  } else {
    await createRecord(base)
  }
}

// ==================== Student Lookup ====================

export async function searchStudentInMyGroups(
  studentId: string,
): Promise<StudentFromApi | null> {
  const sid = String(studentId || '').trim()
  if (!sid) return null

  const res = await get<any>('/api/mentoring/records/students/search', {
    studentId: sid,
  })

  if (!res || res.code !== 200 || res.data == null) {
    return null
  }

  let raw: any = res.data
  if (Array.isArray(raw)) raw = raw[0]

  if (!raw || typeof raw !== 'object') return null

  return normalizeStudent(raw, sid)
}

export async function lookupStudent(studentId: string): Promise<StudentFromApi | null> {
  const role = (localStorage.getItem('role') || '').trim()

  if (role === 'mentor') {
    return await searchStudentInMyGroups(studentId)
  }

  if (role === 'coordinator') {
    return await getMyDeptMember(studentId)
  }

  return await searchStudentById(studentId)
}

// ==================== Cases ====================

export async function forwardCaseToCoordinatorApi(
  payload: ForwardCasePayload,
): Promise<CaseItem> {
  if (!payload.studentId) throw new Error('studentId is required')
  if (!payload.targetCoordinatorId) throw new Error('targetCoordinatorId is required')
  if (!payload.description?.trim()) throw new Error('description is required')

  const res = await post<any>('/api/mentoring/cases', {
    studentId: payload.studentId,
    description: payload.description.trim(),
    targetCoordinatorId: payload.targetCoordinatorId,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to forward case')
  }

  return normalizeCase(res.data)
}

export async function getMySubmittedCases(): Promise<CaseItem[]> {
  const res = await get<any[]>('/api/mentoring/cases/mine')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load submitted cases')
  }

  return (res.data || []).map(normalizeCase)
}

export async function getConsultantCases(): Promise<CaseItem[]> {
  const res = await get<any[]>('/api/mentoring/cases/consultant')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load consultant cases')
  }

  return (res.data || []).map(normalizeCase)
}

export async function closeConsultantCase(caseId: string): Promise<void> {
  const cid = String(caseId || '').trim()
  if (!cid) throw new Error('caseId is required')

  const res = await put<null>(
    `/api/mentoring/cases/${encodeURIComponent(cid)}/close`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to close case')
  }
}

// ==================== Appointments ====================

export async function createAppointmentSlots(
  payload: CreateAppointmentSlotsPayload,
): Promise<AppointmentSlot[]> {
  if (!payload.slotDate) throw new Error('slotDate is required')
  if (!payload.startTimes || payload.startTimes.length === 0) {
    throw new Error('Please add at least one start time.')
  }

  const res = await post<any[]>('/api/mentoring/appointments/slots', {
    slotDate: payload.slotDate,
    startTimes: payload.startTimes,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to create appointment slots')
  }

  return (res.data || []).map(normalizeAppointmentSlot)
}

export async function setAppointmentVenue(
  slotId: string,
  venue: string,
): Promise<AppointmentSlot> {
  const sid = String(slotId || '').trim()
  const finalVenue = String(venue || '').trim()
  if (!sid) throw new Error('slotId is required')
  if (!finalVenue) throw new Error('venue is required')

  const res = await put<any>(
    `/api/mentoring/appointments/slots/${encodeURIComponent(sid)}/venue`,
    { venue: finalVenue },
  )

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to set venue')
  }

  return normalizeAppointmentSlot(res.data)
}

export async function deleteAppointmentSlot(slotId: string): Promise<void> {
  const sid = String(slotId || '').trim()
  if (!sid) throw new Error('slotId is required')

  const res = await del<null>(
    `/api/mentoring/appointments/slots/${encodeURIComponent(sid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to cancel appointment slot')
  }
}

export async function getAppointmentSlotsByMentor(
  mentorId: string,
): Promise<AppointmentSlot[]> {
  const mid = String(mentorId || '').trim()
  if (!mid) return []

  const res = await get<any[]>(
    `/api/mentoring/appointments/slots/mentor/${encodeURIComponent(mid)}`,
  )

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load mentor appointment slots')
  }

  return (res.data || []).map(normalizeAppointmentSlot)
}

export async function confirmAppointmentSlot(slotId: string): Promise<AppointmentSlot> {
  const sid = String(slotId || '').trim()
  if (!sid) throw new Error('slotId is required')

  const res = await post<any>('/api/mentoring/appointments/confirm', {
    slotId: sid,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to confirm appointment')
  }

  return normalizeAppointmentSlot(res.data)
}

// ==================== Student self APIs ====================

export async function getStudentGroupStatus(): Promise<StudentGroupStatus | null> {
  const res = await get<StudentGroupStatus>('/api/mentoring/student/group-status')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get group status')
  }

  return res.data || null
}

export async function getStudentMyMentor(): Promise<StudentMyMentor | null> {
  const res = await get<StudentMyMentor>('/api/mentoring/student/my-mentor')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get my mentor')
  }

  return res.data || null
}

// ==================== Export ====================

export async function exportStudentRecords(studentId: string): Promise<Blob> {
  const sid = String(studentId || '').trim()
  if (!sid) throw new Error('studentId is required')

  return getBlob(`/api/mentoring/export/student/${encodeURIComponent(sid)}`)
}

export async function exportGroupRecords(groupId: string): Promise<Blob> {
  const gid = String(groupId || '').trim()
  if (!gid) throw new Error('groupId is required')

  return getBlob(`/api/mentoring/export/group/${encodeURIComponent(gid)}`)
}

// ==================== Normalizers ====================

function normalizeStudent(raw: any, fallbackId: string): StudentFromApi {
  const id = raw.id ?? raw.studentId ?? raw.userId ?? fallbackId
  const username = raw.username ?? raw.userName ?? String(id)
  const realName = raw.realName ?? raw.name ?? raw.studentName ?? null
  const email = raw.email ?? ''
  const phone = raw.phone ?? null
  const status = raw.status ?? null
  const groupId = raw.groupId ?? null
  const majorId = raw.majorId ?? raw.major ?? null

  return {
    ...raw,
    id,
    username,
    realName,
    email,
    phone,
    status,
    groupId,
    majorId,
  }
}

function normalizeRecordPayload(payload: CreateRecordPayload | UpdateRecordPayload): any {
  const normalized: any = {
    ...payload,
    interviewDate: normalizeDate(payload.interviewDate),
    interviewTime: normalizeTime(payload.interviewTime),
    followupAction:
      payload.followupAction ?? (payload as any).followUpAction ?? '',
  }

  return normalized
}

function normalizeRecordList(records: any[]): McpRecord[] {
  return records.map(normalizeRecord)
}

function normalizeRecord(raw: any): McpRecord {
  return {
    ...raw,
    recordId: raw.recordId ?? raw.id,
    studentId: raw.studentId,
    mentorId: raw.mentorId,
    groupId: raw.groupId,
    interviewDate: normalizeDate(raw.interviewDate),
    interviewTime: normalizeTime(raw.interviewTime),
    problemStatement: raw.problemStatement ?? '',
    interviewSummary: raw.interviewSummary ?? '',
    followupAction: raw.followupAction ?? raw.followUpAction ?? '',
    createTime: raw.createTime,
  }
}

function normalizeCase(raw: any): CaseItem {
  return {
    ...raw,
    caseId: String(raw.caseId ?? raw.id ?? ''),
    studentId: String(raw.studentId ?? ''),
    submitterId: raw.submitterId ?? raw.mentorId,
    coordinatorId: raw.coordinatorId ?? null,
    consultantId: raw.consultantId ?? null,
    description: raw.description ?? raw.caseDescription ?? '',
    status: raw.status ?? '',
    createTime: raw.createTime,
    updateTime: raw.updateTime,
  }
}

function normalizeAppointmentSlot(raw: any): AppointmentSlot {
  return {
    ...raw,
    slotId: String(raw.slotId ?? raw.id ?? ''),
    mentorId: String(raw.mentorId ?? ''),
    studentId: raw.studentId ?? null,
    slotDate: raw.slotDate ?? raw.date ?? '',
    startTime: normalizeTime(raw.startTime ?? raw.time),
    endTime: normalizeTime(raw.endTime),
    venue: raw.venue ?? null,
    status: raw.status ?? 'AVAILABLE',
    createTime: raw.createTime,
  }
}

export function normalizeDate(value?: string): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function normalizeTime(value?: string): string {
  if (!value) return ''
  const text = String(value)
  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5)
  return text
}
