import {
  del,
  downloadBlob,
  get,
  post,
  put,
  saveBlob,
  upload,
  unwrap,
  type QueryParams,
} from './request'
import { getOrgTree, isOrgType, lookupStudent as lookupOrgStudent, type StudentInfo } from './org'

export interface InterviewRecord {
  recordId?: string
  id?: string
  studentId: string
  mentorId?: string
  groupId?: string
  interviewDate?: string
  interviewTime?: string
  problemStatement?: string
  interviewSummary?: string
  followupAction?: string
  followUpAction?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export type McpRecord = InterviewRecord

export interface GroupInfo {
  groupId: string
  id?: string
  name?: string
  parentId?: string
  facultyOrgId?: string
  mentorId?: string
  mentorName?: string
  studentCount?: number
  major?: string
  department?: string
  raw?: any
  [key: string]: any
}

export type GroupSearchResult = GroupInfo

export interface GroupMember {
  studentId: string
  name?: string
  majorId?: string | null
  major?: string | null
  status?: string | null
  groupId?: string
  updateTime?: string
  raw?: any
  [key: string]: any
}

export interface StudentGroupRecord {
  studentId: string
  name?: string
  major?: string
  status?: string
  groupId?: string
  records?: InterviewRecord[]
  interviewRecords?: InterviewRecord[]
  recordsCount?: number
  raw?: any
  [key: string]: any
}

export interface CaseItem {
  caseId: string
  id?: string
  studentId: string
  submitterId?: string
  coordinatorId?: string | null
  consultantId?: string | null
  description: string
  status?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export type SpecialCase = CaseItem

export interface SpecialCasePayload {
  studentId: string
  description: string
  targetCoordinatorId: string
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

export interface ConsultantExportFilter {
  studentId?: string
  studentKeyword?: string
  mentorKeyword?: string
  academicYearFrom?: string | number
  academicYearTo?: string | number
  dateFrom?: string
  dateTo?: string
  faculty?: string
  department?: string
  major?: string
  mentorName?: string
  studentName?: string
  groupId?: string
  [key: string]: any
}

function normalizeRecord(raw: any): InterviewRecord {
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
    followUpAction: raw?.followUpAction ?? raw?.followupAction ?? '',
  }
}

function normalizeGroup(raw: any): GroupInfo {
  const groupId = String(raw?.groupId ?? raw?.id ?? raw?.unitId ?? '')
  return {
    ...raw,
    groupId,
    id: raw?.id ?? raw?.unitId ?? groupId,
    name: raw?.name,
    parentId: raw?.parentId,
    facultyOrgId: raw?.facultyOrgId,
    mentorId: raw?.mentorId,
    mentorName: raw?.mentorName ?? raw?.currentMentor,
    studentCount: raw?.studentCount ?? raw?.count,
    major: raw?.major ?? raw?.majorName,
    department: raw?.department ?? raw?.departmentName,
    raw,
  }
}

function normalizeMember(raw: any): GroupMember {
  return {
    ...raw,
    studentId: String(raw?.studentId ?? raw?.id ?? ''),
    name: raw?.name ?? raw?.studentName ?? raw?.realName ?? raw?.username,
    majorId: raw?.majorId ?? null,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId,
    updateTime: raw?.updateTime,
    raw,
  }
}

function normalizeStudentGroupRecord(raw: any): StudentGroupRecord {
  const records = Array.isArray(raw?.records)
    ? raw.records.map(normalizeRecord)
    : Array.isArray(raw?.interviewRecords)
      ? raw.interviewRecords.map(normalizeRecord)
      : undefined

  return {
    ...raw,
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

function normalizeCase(raw: any): CaseItem {
  const caseId = String(raw?.caseId ?? raw?.id ?? '')
  return {
    ...raw,
    caseId,
    id: raw?.id ?? caseId,
    studentId: String(raw?.studentId ?? ''),
    description: raw?.description ?? raw?.caseDescription ?? '',
  }
}

function normalizeSlot(raw: any): AppointmentSlot {
  return {
    ...raw,
    slotId: String(raw?.slotId ?? raw?.id ?? ''),
    mentorId: raw?.mentorId,
    studentId: raw?.studentId ?? null,
    slotDate: normalizeDate(raw?.slotDate ?? raw?.date),
    startTime: normalizeTime(raw?.startTime ?? raw?.time),
    endTime: normalizeTime(raw?.endTime),
    venue: raw?.venue ?? null,
    status: raw?.status,
    createTime: raw?.createTime,
  }
}

function normalizeDate(value?: string): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function normalizeTime(value?: string): string {
  if (!value) return ''
  const text = String(value)
  const match = text.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : text
}

export async function fetchRecordsForStudent(studentId: string): Promise<InterviewRecord[]> {
  const res = await get<any[]>(`/api/mentoring/records/student/${encodeURIComponent(studentId)}`)
  return (unwrap(res) || []).map(normalizeRecord)
}

export const getRecordsByStudent = fetchRecordsForStudent
export const getStudentRecords = fetchRecordsForStudent
export const fetchRecordsByStudent = fetchRecordsForStudent

export async function getRecordDetail(recordId: string): Promise<InterviewRecord> {
  const res = await get<any>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  return normalizeRecord(unwrap(res))
}

export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const res = await get<any[]>(`/api/mentoring/records/group/${encodeURIComponent(groupId)}`)
  return (unwrap(res) || []).map(normalizeStudentGroupRecord)
}

export async function getMyInterviewRecords(): Promise<InterviewRecord[]> {
  const res = await get<any[]>('/api/mentoring/records/mine')
  return (unwrap(res) || []).map(normalizeRecord)
}

export const getMyRecords = getMyInterviewRecords

export async function saveInterviewRecord(payload: InterviewRecord): Promise<any> {
  const normalized = {
    ...payload,
    followupAction: payload.followupAction ?? payload.followUpAction,
  }
  const res = await post<any>('/api/mentoring/records', normalized)
  return unwrap(res)
}

export const saveRecord = saveInterviewRecord

export async function createRecord(payload: InterviewRecord): Promise<any> {
  const { recordId, id, ...rest } = payload
  return saveInterviewRecord(rest as InterviewRecord)
}

export async function updateRecord(payload: InterviewRecord): Promise<any> {
  if (!payload.recordId && !payload.id) throw new Error('recordId is required')
  return saveInterviewRecord(payload)
}

export async function deleteRecord(recordId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  unwrap(res)
}

export const deleteInterviewRecord = deleteRecord

export async function searchStudentInMyGroups(studentId: string): Promise<StudentInfo | null> {
  const res = await get<any>('/api/mentoring/records/students/search', { studentId })
  return unwrap(res) || null
}

export async function lookupStudent(studentId: string): Promise<StudentInfo | null> {
  try {
    return await searchStudentInMyGroups(studentId)
  } catch {
    return await lookupOrgStudent(studentId)
  }
}

export async function searchGroup(
  groupId?: string,
): Promise<{ group?: GroupInfo; members?: GroupMember[]; raw?: any }> {
  const res = await get<any>('/api/mentoring/groups/search', groupId ? { groupId } : undefined)
  const data = unwrap(res)

  if (Array.isArray(data)) {
    return {
      group: data[0] ? normalizeGroup(data[0]) : undefined,
      members: [],
      raw: data,
    }
  }

  if (data?.group || data?.members) {
    return {
      group: data?.group ? normalizeGroup(data.group) : undefined,
      members: Array.isArray(data?.members) ? data.members.map(normalizeMember) : [],
      raw: data,
    }
  }

  return {
    group: data ? normalizeGroup(data) : undefined,
    members: [],
    raw: data,
  }
}

export async function searchGroups(groupId?: string): Promise<GroupInfo[]> {
  if (groupId) {
    const data = await searchGroup(groupId)
    return data.group ? [data.group] : []
  }

  const data = await searchGroup()
  if (Array.isArray(data.raw)) return data.raw.map(normalizeGroup)
  if (data.group?.groupId) return [data.group]

  return []
}

async function listGroupsFromOrgTree(): Promise<GroupInfo[]> {
  const units = await getOrgTree()
  return units
    .filter((unit) => isOrgType(unit, 'GROUP'))
    .map((unit) =>
      normalizeGroup({
        groupId: unit.id,
        id: unit.id,
        name: unit.name,
        parentId: unit.parentId,
        raw: unit,
      }),
    )
}

export async function listGroups(groupId?: string): Promise<GroupInfo[]> {
  if (groupId) return searchGroups(groupId)

  try {
    const groups = await searchGroups()
    if (groups.length > 0) return groups
  } catch {
    // Use org tree fallback below.
  }

  return listGroupsFromOrgTree()
}

export async function getGroup(groupId: string): Promise<GroupInfo> {
  const res = await get<any>(`/api/mentoring/groups/${encodeURIComponent(groupId)}`)
  return normalizeGroup(unwrap(res))
}

export const getGroupById = getGroup

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const res = await get<any[]>(`/api/mentoring/groups/${encodeURIComponent(groupId)}/members`)
  return (unwrap(res) || []).map(normalizeMember)
}

export async function getGroupsByMentor(mentorId: string): Promise<GroupInfo[]> {
  const res = await get<any[]>(
    `/api/mentoring/groups/by-mentor/${encodeURIComponent(mentorId)}`,
  )
  return (unwrap(res) || []).map(normalizeGroup)
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  const res = await post<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
  unwrap(res)
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
  const res = await del<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
  unwrap(res)
}

export async function changeGroupMentor(groupId: string, mentorId: string): Promise<GroupInfo> {
  const res = await put<any>(`/api/mentoring/groups/${encodeURIComponent(groupId)}/mentor`, {
    mentorId,
  })
  return normalizeGroup(unwrap(res))
}

export async function importMcpAllocation(file: File, facultyOrgId?: string): Promise<any> {
  const form = new FormData()
  form.append('file', file)
  if (facultyOrgId) form.append('facultyOrgId', facultyOrgId)

  const res = await upload<any>('/api/mentoring/import/mcp-allocation', form)
  return unwrap(res)
}

export async function importCoordinators(file: File): Promise<any> {
  const form = new FormData()
  form.append('file', file)

  const res = await upload<any>('/api/mentoring/import/coordinators', form)
  return unwrap(res)
}

export async function getMyMentor(): Promise<any> {
  const res = await get<any>('/api/mentoring/student/my-mentor')
  return unwrap(res)
}

export const getMyMentorInfo = getMyMentor

export async function getMyGroupStatus(): Promise<any> {
  const res = await get<any>('/api/mentoring/student/group-status')
  return unwrap(res)
}

export const getStudentGroupStatus = getMyGroupStatus

export async function getMyRecordsAsStudent(): Promise<InterviewRecord[]> {
  const res = await get<any[]>('/api/mentoring/student/my-records')
  return (unwrap(res) || []).map(normalizeRecord)
}

export const getMyStudentRecords = getMyRecordsAsStudent

export async function getMyStudentRecordDetail(recordId: string): Promise<InterviewRecord> {
  const res = await get<any>(`/api/mentoring/student/records/${encodeURIComponent(recordId)}`)
  return normalizeRecord(unwrap(res))
}

export async function createSpecialCase(payload: SpecialCasePayload): Promise<CaseItem> {
  const res = await post<any>('/api/mentoring/cases', payload)
  return normalizeCase(unwrap(res))
}

export const forwardCaseToCoordinator = createSpecialCase

export async function listMySubmittedCases(): Promise<CaseItem[]> {
  const res = await get<any[]>('/api/mentoring/cases/mine')
  return (unwrap(res) || []).map(normalizeCase)
}

export const listMyCases = listMySubmittedCases

export async function listCoordinatorCases(): Promise<CaseItem[]> {
  const res = await get<any[]>('/api/mentoring/cases/coordinator')
  return (unwrap(res) || []).map(normalizeCase)
}

export const listForwardedCasesForCoordinator = listCoordinatorCases

export async function listConsultantCases(): Promise<CaseItem[]> {
  const res = await get<any[]>('/api/mentoring/cases/consultant')
  return (unwrap(res) || []).map(normalizeCase)
}

export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId?: string
  targetConsultantId?: string
  forwardToId?: string
}): Promise<any> {
  const targetConsultantId = payload.targetConsultantId || payload.consultantId || payload.forwardToId
  if (!payload.caseId) throw new Error('caseId is required')
  if (!targetConsultantId) throw new Error('targetConsultantId is required')

  const res = await put<any>(`/api/mentoring/cases/${encodeURIComponent(payload.caseId)}/forward`, {
    targetConsultantId,
  })
  return unwrap(res)
}

export async function rejectCase(caseId: string): Promise<any> {
  const res = await put<any>(`/api/mentoring/cases/${encodeURIComponent(caseId)}/reject`)
  return unwrap(res)
}

export async function closeCase(caseId: string): Promise<any> {
  const res = await put<any>(`/api/mentoring/cases/${encodeURIComponent(caseId)}/close`)
  return unwrap(res)
}

export async function createAppointmentSlots(payload: {
  slotDate: string
  startTimes: string[]
}): Promise<AppointmentSlot[]> {
  const res = await post<any[]>('/api/mentoring/appointments/slots', payload)
  return (unwrap(res) || []).map(normalizeSlot)
}

export const createSlots = createAppointmentSlots

export async function sendInterviewInvitation(
  _studentId: string,
  slots: Array<{ date?: string; slotDate?: string; time?: string; startTime?: string }>,
): Promise<AppointmentSlot[]> {
  if (!slots.length) throw new Error('At least one slot is required')

  const firstDate = slots[0].slotDate || slots[0].date
  if (!firstDate) throw new Error('slotDate is required')

  const startTimes = slots
    .filter((slot) => (slot.slotDate || slot.date) === firstDate)
    .map((slot) => slot.startTime || slot.time)
    .filter(Boolean) as string[]

  return createAppointmentSlots({ slotDate: firstDate, startTimes })
}

export async function getMentorAppointmentSlots(mentorId: string): Promise<AppointmentSlot[]> {
  const res = await get<any[]>(`/api/mentoring/appointments/slots/mentor/${encodeURIComponent(mentorId)}`)
  return (unwrap(res) || []).map(normalizeSlot)
}

export const getMentorAvailableSlots = getMentorAppointmentSlots

export async function confirmAppointmentSlot(slotId: string): Promise<AppointmentSlot> {
  const res = await post<any>('/api/mentoring/appointments/confirm', { slotId })
  return normalizeSlot(unwrap(res))
}

export const studentConfirmSlot = confirmAppointmentSlot

export async function setAppointmentVenue(slotId: string, venue: string): Promise<AppointmentSlot> {
  const res = await put<any>(
    `/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}/venue`,
    { venue },
  )
  return normalizeSlot(unwrap(res))
}

export const setAppointmentSlotVenue = setAppointmentVenue
export const setSlotVenue = setAppointmentVenue
export const mentorConfirmVenue = setAppointmentVenue

export async function cancelAppointmentSlot(slotId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}`)
  unwrap(res)
}

export const cancelSlot = cancelAppointmentSlot

export async function exportStudentRecords(studentId: string): Promise<Blob> {
  return downloadBlob(`/api/mentoring/export/student/${encodeURIComponent(studentId)}`)
}

export const exportStudentRecordsDoc = exportStudentRecords

export async function exportGroupRecords(groupId: string): Promise<Blob> {
  return downloadBlob(`/api/mentoring/export/group/${encodeURIComponent(groupId)}`)
}

export const exportGroupRecordsDoc = exportGroupRecords

export async function exportGroupRecordsForConsultant(groupId: string): Promise<Blob> {
  return downloadBlob(`/export/group/${encodeURIComponent(groupId)}`)
}

export const exportFcGroupRecords = exportGroupRecordsForConsultant

export async function exportConsultantRecords(filter: ConsultantExportFilter): Promise<Blob> {
  const params: QueryParams = { ...filter }

  if (filter.mentorName && !params.mentorKeyword) params.mentorKeyword = filter.mentorName
  if (filter.studentName && !params.studentKeyword) params.studentKeyword = filter.studentName

  return downloadBlob('/api/mentoring/export/consultant', params)
}

export const exportRecordsByFilter = exportConsultantRecords

export function downloadExportedFile(blob: Blob, filename: string): void {
  saveBlob(blob, filename)
}
