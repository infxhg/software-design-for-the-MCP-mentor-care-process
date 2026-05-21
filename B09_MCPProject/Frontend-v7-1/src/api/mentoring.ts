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

export interface InterviewRecord {
  recordId?: string
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
  [key: string]: any
}

export interface GroupInfo {
  groupId: string
  name?: string
  parentId?: string
  facultyOrgId?: string
  mentorId?: string
  mentorName?: string
  studentCount?: number
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
  status?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface AppointmentSlot {
  slotId: string
  mentorId: string
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
  [key: string]: any
}

// Interview records
export async function fetchRecordsForStudent(studentId: string): Promise<InterviewRecord[]> {
  const res = await get<InterviewRecord[]>(
    `/api/mentoring/records/student/${encodeURIComponent(studentId)}`,
  )
  return unwrap(res) || []
}

export async function getStudentRecords(studentId: string): Promise<InterviewRecord[]> {
  return fetchRecordsForStudent(studentId)
}

export async function getRecordDetail(recordId: string): Promise<InterviewRecord> {
  const res = await get<InterviewRecord>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  return unwrap(res)
}

export async function getRecordsByGroup(groupId: string): Promise<any[]> {
  const res = await get<any[]>(`/api/mentoring/records/group/${encodeURIComponent(groupId)}`)
  return unwrap(res) || []
}

export async function getMyInterviewRecords(): Promise<InterviewRecord[]> {
  const res = await get<InterviewRecord[]>('/api/mentoring/records/mine')
  return unwrap(res) || []
}

// 后端用 POST /api/mentoring/records 兼容新增和修改：
// 不带 recordId = 新增；带 recordId = 修改。
export async function saveInterviewRecord(payload: InterviewRecord): Promise<any> {
  const normalized = {
    ...payload,
    followupAction: payload.followupAction ?? payload.followUpAction,
  }
  const res = await post<any>('/api/mentoring/records', normalized)
  return unwrap(res)
}

export async function createRecord(payload: InterviewRecord): Promise<any> {
  const { recordId, ...rest } = payload
  return saveInterviewRecord(rest as InterviewRecord)
}

export async function updateRecord(payload: InterviewRecord): Promise<any> {
  if (!payload.recordId) throw new Error('recordId is required')
  return saveInterviewRecord(payload)
}

export async function deleteRecord(recordId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  unwrap(res)
}

// Groups
export async function searchGroup(groupId?: string): Promise<{ group?: GroupInfo; members?: GroupMember[]; raw?: any }> {
  const res = await get<any>('/api/mentoring/groups/search', groupId ? { groupId } : undefined)
  const data = unwrap(res)
  return {
    group: data?.group ?? (Array.isArray(data) ? undefined : data),
    members: data?.members ?? [],
    raw: data,
  }
}

export async function listGroups(groupId?: string): Promise<GroupInfo[]> {
  const data = await searchGroup(groupId)
  if (Array.isArray(data.raw)) return data.raw
  return data.group ? [data.group] : []
}

export async function getGroup(groupId: string): Promise<GroupInfo> {
  const res = await get<GroupInfo>(`/api/mentoring/groups/${encodeURIComponent(groupId)}`)
  return unwrap(res)
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const res = await get<GroupMember[]>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members`,
  )
  return unwrap(res) || []
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  const res = await post<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
  unwrap(res)
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
  // OpenAPI 里给的是具体样例 /api/mentoring/groups/group_a1/members/test_stu_in_01，
  // 后端一般会按动态路径处理，所以这里使用动态路径。
  const res = await del<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
  )
  unwrap(res)
}

export async function changeGroupMentor(groupId: string, mentorId: string): Promise<GroupInfo> {
  const res = await put<GroupInfo>(`/api/mentoring/groups/${encodeURIComponent(groupId)}/mentor`, {
    mentorId,
  })
  return unwrap(res)
}

export async function getGroupsByMentor(mentorId: string): Promise<GroupInfo[]> {
  // OpenAPI 导出成了 /by-mentor/mentor_math_01，但描述明确路径结尾是 mentor id。
  const res = await get<GroupInfo[]>(
    `/api/mentoring/groups/by-mentor/${encodeURIComponent(mentorId)}`,
  )
  return unwrap(res) || []
}

// Excel imports
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

// Student own endpoints
export async function getMyMentor(): Promise<any> {
  const res = await get<any>('/api/mentoring/student/my-mentor')
  return unwrap(res)
}

export async function getMyGroupStatus(): Promise<any> {
  const res = await get<any>('/api/mentoring/student/group-status')
  return unwrap(res)
}

export async function getMyRecordsAsStudent(): Promise<InterviewRecord[]> {
  const res = await get<InterviewRecord[]>('/api/mentoring/student/my-records')
  return unwrap(res) || []
}

export async function getMyStudentRecordDetail(recordId: string): Promise<InterviewRecord> {
  const res = await get<InterviewRecord>(
    `/api/mentoring/student/records/${encodeURIComponent(recordId)}`,
  )
  return unwrap(res)
}

// Special cases
export async function createSpecialCase(payload: {
  studentId: string
  description: string
  targetCoordinatorId: string
}): Promise<CaseItem> {
  const res = await post<CaseItem>('/api/mentoring/cases', payload)
  return unwrap(res)
}

export async function listMySubmittedCases(): Promise<CaseItem[]> {
  const res = await get<CaseItem[]>('/api/mentoring/cases/mine')
  return unwrap(res) || []
}

export async function listCoordinatorCases(): Promise<CaseItem[]> {
  const res = await get<CaseItem[]>('/api/mentoring/cases/coordinator')
  return unwrap(res) || []
}

// 兼容旧函数名
export const listForwardedCasesForCoordinator = listCoordinatorCases

export async function listConsultantCases(): Promise<CaseItem[]> {
  const res = await get<CaseItem[]>('/api/mentoring/cases/consultant')
  return unwrap(res) || []
}

export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId?: string
  targetConsultantId?: string
}): Promise<any> {
  const targetConsultantId = payload.targetConsultantId || payload.consultantId
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

// Appointments
export async function createAppointmentSlots(payload: {
  slotDate: string
  startTimes: string[]
}): Promise<AppointmentSlot[]> {
  const res = await post<AppointmentSlot[]>('/api/mentoring/appointments/slots', payload)
  return unwrap(res) || []
}

export async function getMentorAppointmentSlots(mentorId: string): Promise<AppointmentSlot[]> {
  const res = await get<AppointmentSlot[]>(
    `/api/mentoring/appointments/slots/mentor/${encodeURIComponent(mentorId)}`,
  )
  return unwrap(res) || []
}

export async function confirmAppointmentSlot(slotId: string): Promise<AppointmentSlot> {
  const res = await post<AppointmentSlot>('/api/mentoring/appointments/confirm', { slotId })
  return unwrap(res)
}

export async function setAppointmentVenue(slotId: string, venue: string): Promise<AppointmentSlot> {
  const res = await put<AppointmentSlot>(
    `/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}/venue`,
    { venue },
  )
  return unwrap(res)
}

export async function cancelAppointmentSlot(slotId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}`)
  unwrap(res)
}

// Exports
export async function exportStudentRecords(studentId: string): Promise<Blob> {
  return downloadBlob(`/api/mentoring/export/student/${encodeURIComponent(studentId)}`)
}

export async function exportGroupRecords(groupId: string): Promise<Blob> {
  return downloadBlob(`/api/mentoring/export/group/${encodeURIComponent(groupId)}`)
}

export async function exportGroupRecordsForConsultant(groupId: string): Promise<Blob> {
  return downloadBlob(`/export/group/${encodeURIComponent(groupId)}`)
}

export async function exportConsultantRecords(filter: ConsultantExportFilter): Promise<Blob> {
  const params: QueryParams = { ...filter }

  // 兼容旧页面字段 mentorName/studentName；后端当前描述推荐 mentorKeyword/studentKeyword
  if (filter.mentorName && !params.mentorKeyword) params.mentorKeyword = filter.mentorName
  if (filter.studentName && !params.studentKeyword) params.studentKeyword = filter.studentName

  return downloadBlob('/api/mentoring/export/consultant', params)
}

export async function exportRecordsByFilter(filter: ConsultantExportFilter): Promise<Blob> {
  return exportConsultantRecords(filter)
}

export function downloadExportedFile(blob: Blob, filename: string): void {
  saveBlob(blob, filename)
}


// ==================== Backward compatibility for old pages ====================

export type McpRecord = InterviewRecord
export type SpecialCase = CaseItem
export type SpecialCasePayload = {
  studentId: string
  description: string
  targetCoordinatorId: string
  [key: string]: any
}

export interface CreateRecordPayload extends InterviewRecord {}
export interface UpdateRecordPayload extends InterviewRecord {
  recordId: string
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

export type GroupSearchResult = GroupInfo

export async function lookupStudent(studentId: string): Promise<any> {
  const res = await get<any>(`/api/org/student/${encodeURIComponent(studentId)}`)
  return unwrap(res)
}

export const getRecordsByStudent = fetchRecordsForStudent
export const fetchRecordsByStudent = fetchRecordsForStudent
export const getMyRecords = getMyInterviewRecords
export const getStudentGroupStatus = getMyGroupStatus
export const getMyMentorInfo = getMyMentor
export const getMyStudentRecords = getMyRecordsAsStudent

export const saveRecord = saveInterviewRecord
export const deleteInterviewRecord = deleteRecord

export const createSlots = createAppointmentSlots
export const setAppointmentSlotVenue = setAppointmentVenue
export const setSlotVenue = setAppointmentVenue
export const mentorConfirmVenue = setAppointmentVenue
export const getMentorAvailableSlots = getMentorAppointmentSlots
export const cancelSlot = cancelAppointmentSlot
export const studentConfirmSlot = confirmAppointmentSlot

export const listMyCases = listMySubmittedCases
export const forwardCaseToCoordinator = createSpecialCase

export const exportStudentRecordsDoc = exportStudentRecords
export const exportGroupRecordsDoc = exportGroupRecords
export const exportFcGroupRecords = exportGroupRecordsForConsultant

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
