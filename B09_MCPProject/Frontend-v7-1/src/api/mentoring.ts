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
import {
  getOrgTree,
  getMentorsByOrgUnit,
  isOrgType,
  lookupStudent as lookupOrgStudent,
  type MentorInfo,
  type StudentInfo,
} from './org'

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

export interface StudentRecordFilter {
  /** 学年标签，例如 "2024-2025"。后端按 groupId.startsWith(academicYear) 过滤 */
  academicYear?: string
  /** 导师姓名关键字，忽略大小写模糊匹配导师 realName */
  mentorKeyword?: string
}

export async function fetchRecordsForStudent(
  studentId: string,
  filter?: StudentRecordFilter,
): Promise<InterviewRecord[]> {
  const params: QueryParams = {}
  if (filter?.academicYear) params.academicYear = filter.academicYear
  if (filter?.mentorKeyword) params.mentorKeyword = filter.mentorKeyword

  const res = await get<any[]>(
    `/api/mentoring/records/student/${encodeURIComponent(studentId)}`,
    Object.keys(params).length ? params : undefined,
  )
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
  majorId?: string,
): Promise<{ group?: GroupInfo; members?: GroupMember[]; raw?: any }> {
  const params: QueryParams = {}
  if (groupId) params.groupId = groupId
  if (majorId) params.majorId = majorId

  const res = await get<any>(
    '/api/mentoring/groups/search',
    Object.keys(params).length ? params : undefined,
  )
  const data = unwrap(res)

  if (Array.isArray(data)) {
    return {
      group: data[0] ? normalizeGroup(data[0]) : undefined,
      members: [],
      raw: data,
    }
  }

  if (data?.group || data?.members) {
    const members = Array.isArray(data?.members)
      ? data.members.map(normalizeMember)
      : []

    /**
     * 修改点 (FIX)：
     * 后端 /api/mentoring/groups/search?groupId=xxx 在某些情况下不会返回
     * 嵌套的 data.group，而是把 members 和 group 级字段（groupId / mentorId /
     * facultyOrgId / parentId / mentorName 等）一起平铺在 data 顶层；
     * 此前 searchGroup 只识别 data.group，导致 findMentorByGroupId 拿不到
     * group 对象，SearchMentorView 直接走 "No matching mentor information
     * is found." 分支。
     *
     * 这里改成：若没有显式的 data.group，就把 data 顶层（剔除 members）
     * 当成 group raw，再用 members[0].groupId 或调用方传入的 groupId 兜底
     * 推导 groupId，让上层 findMentorByGroupId 仍能拿到 groupId /
     * mentorId / facultyOrgId 去解析导师。
     */
    let group: GroupInfo | undefined
    if (data?.group) {
      group = normalizeGroup(data.group)
    } else {
      const { members: _omitMembers, ...rest } = data
      const inferredGroupId =
        rest?.groupId ?? rest?.id ?? rest?.unitId ?? members[0]?.groupId ?? groupId ?? ''

      if (inferredGroupId || rest?.mentorId || Object.keys(rest).length > 0) {
        group = normalizeGroup({ ...rest, groupId: inferredGroupId })
      }
    }

    return {
      group,
      members,
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

export async function getGroupMembers(
  groupId: string,
  majorId?: string,
): Promise<GroupMember[]> {
  const res = await get<any[]>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members`,
    majorId ? { majorId } : undefined,
  )
  return (unwrap(res) || []).map(normalizeMember)
}

export async function getGroupsByMentor(mentorId: string): Promise<GroupInfo[]> {
  const res = await get<any[]>(
    `/api/mentoring/groups/by-mentor/${encodeURIComponent(mentorId)}`,
  )
  return (unwrap(res) || []).map(normalizeGroup)
}

export async function addStudentToGroup(
  groupId: string,
  studentId: string,
  majorId?: string,
  status?: string,
): Promise<void> {
  const params: QueryParams = {}
  if (majorId) params.majorId = majorId
  if (status) params.status = status

  const res = await post<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
    undefined,
    Object.keys(params).length ? { params } : {},
  )
  unwrap(res)
}

export async function removeStudentFromGroup(
  groupId: string,
  studentId: string,
  majorId?: string,
): Promise<void> {
  const res = await del<null>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
    majorId ? { params: { majorId } } : {},
  )
  unwrap(res)
}

export async function changeGroupMentor(
  groupId: string,
  mentorId: string,
  majorId?: string,
): Promise<GroupInfo> {
  const res = await put<any>(
    `/api/mentoring/groups/${encodeURIComponent(groupId)}/mentor`,
    { mentorId },
    majorId ? { params: { majorId } } : {},
  )
  return normalizeGroup(unwrap(res))
}

/**
 * 修改点 (NEW)：Faculty Consultant 通过 Group ID 查找该组对应的 mentor。
 *
 * 接口链路（均来自 B09 接口文档，无新增后端接口）：
 *   1) GET /api/mentoring/groups/search?groupId=&majorId=
 *      → data.group 里带 mentorId / facultyOrgId / parentId
 *   2) GET /api/org/mentors/{orgUnitId}（组所在学院/系的导师列表）
 *      → 用 mentorId 匹配出完整导师卡片（姓名/邮箱/office/系）
 *
 * 返回 MentorInfo[]（带上 groupId，便于结果页直接 "Show Members"）。
 *   - 组不存在 → 返回 []
 *   - 组存在但未分配导师 → 抛错，提示该组暂无导师
 *   - 学院导师列表里匹配不到时 → 兜底返回仅含 mentorId + groupId 的最小卡片
 */
export async function findMentorByGroupId(
  groupId: string,
  majorId?: string,
): Promise<MentorInfo[]> {
  const { group } = await searchGroup(groupId, majorId)

  if (!group || !group.groupId) {
    return []
  }

  if (!group.mentorId) {
    throw new Error('This group has no assigned mentor.')
  }

  // 用组所在的学院/系把 mentorId 解析为完整导师信息
  const orgScope = group.facultyOrgId || group.parentId
  if (orgScope) {
    try {
      const mentors = await getMentorsByOrgUnit(orgScope)
      const matched = mentors.find((m) => m.mentorId === group.mentorId)
      if (matched) {
        return [{ ...matched, groupId: group.groupId }]
      }
    } catch {
      // 拿不到导师列表时走下面的兜底
    }
  }

  // 兜底：至少返回 mentorId + groupId，结果页仍可点 "Show Members"
  return [
    {
      mentorId: group.mentorId,
      mentorName: group.mentorName || group.mentorId,
      name: group.mentorName || group.mentorId,
      email: null,
      office: null,
      departmentName: group.department ?? null,
      groupId: group.groupId,
      raw: group,
    } as MentorInfo,
  ]
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
  // 修改点：先取出首元素并判空，让 TS 在严格索引检查下正确收窄类型，
  // 避免 slots[0] 被推断为可能 undefined（TS2532）。
  const first = slots[0]
  if (!first) throw new Error('At least one slot is required')

  const firstDate = first.slotDate || first.date
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
