import { getUserInfoApi } from './user'
import {
  del,
  downloadBlob,
  downloadBlobWithHeaders,
  get,
  post,
  put,
  saveBlob,
  upload,
  unwrap,
  type BlobWithMeta,
  type QueryParams,
} from './request'
import {
  getOrgTree,
  getMentorsByOrgUnit,
  getMyDeptMember,
  isOrgType,
  lookupStudent as lookupOrgStudent,
  normalizeStudent as normalizeOrgStudent,
  searchMentors,
  searchMyScope,
  type MentorInfo,
  type StudentInfo,
} from './org'

const MENTOR_SLOT_OWNER_KEY = 'mcs_mentor_slot_owner_id'
const MENTOR_SLOTS_CACHE_PREFIX = 'mcs_mentor_slots_'

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

export const STRICT_STUDENT_ID_PATTERN = /^\d{9}$/

export function isStrictStudentId(value: unknown): boolean {
  return STRICT_STUDENT_ID_PATTERN.test(String(value || '').trim())
}

export function getStrictStudentIdValidationMessage(value: unknown): string {
  const id = String(value || '').trim()
  if (!id) return 'Student ID cannot be empty.'
  if (!isStrictStudentId(id)) return 'Invalid Student ID format. Student ID must be exactly 9 digits.'
  return ''
}

export function getRoleAwareStudentIdValidationMessage(value: unknown, role = getStoredFrontendRole()): string {
  const id = String(value || '').trim()
  if (!id) return 'Student ID cannot be empty.'

  if (role === 'coordinator' || role === 'consultant') {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return 'Invalid student identifier format.'
    }
    return ''
  }

  return getStrictStudentIdValidationMessage(id)
}

/**
 * 修改点 (FIX)：原来的 buildFallbackStudentProfile 会在所有真实接口都失败后，
 * 用「学生 ID」同时填充 username、realName、id 字段，伪造一条"成功"记录返回给前端。
 *
 * 这导致 FC 搜索不属于自己 faculty 的学生时：
 *   1) 后端正确抛出 403 权限错误
 *   2) 前端 catch 后吞掉，转头返回一条假学生（id=username=realName）
 *   3) 页面显示三列全是 ID，且没有任何错误提示
 *
 * 修复后：
 *   - 不再生成"假学生"，权限错误必须显式向上抛出；
 *   - 真正"未找到"的情况返回 null，让页面显示 "No matching student record is found."；
 *   - 正常成功路径（接口正常返回学生对象）完全不受影响，仍走 normalizeOrgStudent，
 *     username / realName 显示后端真实值。
 */
function isPermissionError(err: any): boolean {
  if (!err) return false
  if (err.status === 403) return true
  const msg = String(err.message || '').toLowerCase()
  // 兜底：后端 message 里可能直接写 "Forbidden" / "permission" / "无权" / "权限"
  return (
    msg.includes('403') ||
    msg.includes('forbidden') ||
    msg.includes('permission') ||
    msg.includes('not allowed') ||
    /无权|权限|没有权限/.test(String(err.message || ''))
  )
}

function makePermissionError(): Error & { status: number } {
  const err = new Error(
    'You do not have permission to view this student. They may belong to a faculty outside your scope.',
  ) as Error & { status: number }
  err.status = 403
  return err
}

function getStoredFrontendRole(): string {
  try {
    return String(localStorage.getItem('role') || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function normalizeStudentPayload(raw: any, fallbackId = ''): StudentInfo | null {
  if (!raw) return null

  const data = raw?.student ?? raw?.user ?? raw?.member ?? raw
  if (Array.isArray(data)) {
    const first = data[0]
    return first ? normalizeOrgStudent(first, fallbackId) : null
  }

  return normalizeOrgStudent(data, fallbackId)
}

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
  const id = String(studentId || '').trim()
  const role = getStoredFrontendRole()
  const validation = getRoleAwareStudentIdValidationMessage(id, role)
  if (validation) throw new Error(validation)

  // Updated API note:
  // The latest OpenAPI keeps GET /api/mentoring/records/mine as the stable Mentor endpoint.
  // The old concrete-looking /api/mentoring/records/student/stu-12345 entry is not a real
  // path parameter for Mentor testing, so mentor pages should load current mentor records
  // and filter them locally by strict 9-digit Student ID.
  if (role === 'mentor') {
    const rows = await getMyInterviewRecords()
    return rows.filter((record) => String(record.studentId || '').trim() === id)
  }

  const params: QueryParams = {}
  if (filter?.academicYear) params.academicYear = filter.academicYear
  if (filter?.mentorKeyword) params.mentorKeyword = filter.mentorKeyword

  if (role === 'coordinator' || role === 'consultant') {
    try {
      const res = await get<any[]>(
        `/api/mentoring/records/student/${encodeURIComponent(id)}`,
        Object.keys(params).length ? params : undefined,
      )
      return (unwrap(res) || []).map(normalizeRecord)
    } catch (err: any) {
      // 修改点 (FIX)：以前不管什么错都吞掉走 fallback，最后返回 [] —— 导致 FC 搜
      // 不属于自己 faculty 的学生时，访谈记录区只显示 "No interview records found."，
      // 看不出来其实是 403 权限错误。
      // 现在权限错误必须向上抛出，让页面显示明确的"无权限"提示。
      if (isPermissionError(err)) throw err
      try {
        const res = await get<any[]>(
          `/records/student/${encodeURIComponent(id)}`,
          Object.keys(params).length ? params : undefined,
        )
        return (unwrap(res) || []).map(normalizeRecord)
      } catch (err2: any) {
        if (isPermissionError(err2)) throw err2
        return []
      }
    }
  }

  try {
    // Faculty Consultant / Coordinator record browsing endpoint in the updated OpenAPI.
    const res = await get<any[]>(
      `/records/student/${encodeURIComponent(id)}`,
      Object.keys(params).length ? params : undefined,
    )
    return (unwrap(res) || []).map(normalizeRecord)
  } catch {
    // Backward compatibility for older backend builds.
    const res = await get<any[]>(
      `/api/mentoring/records/student/${encodeURIComponent(id)}`,
      Object.keys(params).length ? params : undefined,
    )
    return (unwrap(res) || []).map(normalizeRecord)
  }
}

export const getRecordsByStudent = fetchRecordsForStudent
export const getStudentRecords = fetchRecordsForStudent
export const fetchRecordsByStudent = fetchRecordsForStudent

export async function getRecordDetail(recordId: string): Promise<InterviewRecord> {
  const res = await get<any>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  return normalizeRecord(unwrap(res))
}

export async function getRecordsByGroup(
  groupId: string,
  majorId?: string,
): Promise<StudentGroupRecord[]> {
  const params: QueryParams = {}
  if (majorId) params.majorId = majorId

  const res = await get<any[]>(
    `/api/mentoring/records/group/${encodeURIComponent(groupId)}`,
    Object.keys(params).length ? params : undefined,
  )
  return (unwrap(res) || []).map(normalizeStudentGroupRecord)
}

export async function getMyInterviewRecords(): Promise<InterviewRecord[]> {
  const res = await get<any[]>('/api/mentoring/records/mine')
  return (unwrap(res) || []).map(normalizeRecord)
}

export const getMyRecords = getMyInterviewRecords

export async function saveInterviewRecord(payload: InterviewRecord): Promise<any> {
  // Updated API note:
  // POST /api/mentoring/records is now documented as CREATE only. Do not send recordId/id
  // in the body, otherwise the backend may reject it or create ambiguous data.
  const { recordId: _recordId, id: _id, followUpAction, ...rest } = payload
  const normalized = {
    ...rest,
    followupAction: payload.followupAction ?? followUpAction,
  }
  const res = await post<any>('/api/mentoring/records', normalized)
  return unwrap(res)
}

export const saveRecord = saveInterviewRecord

export async function createRecord(payload: InterviewRecord): Promise<any> {
  return saveInterviewRecord(payload)
}

export async function updateRecord(payload: InterviewRecord): Promise<any> {
  const recordId = String(payload.recordId || payload.id || '').trim()
  if (!recordId) throw new Error('recordId is required')

  // The updated OpenAPI no longer exposes a true UPDATE endpoint for interview records.
  // To keep the existing UI workflow usable, simulate replacement as:
  //   1) create the new version without recordId
  //   2) delete the old record
  // This avoids sending an unsupported update payload to POST /api/mentoring/records.
  const created = await createRecord(payload)

  try {
    await deleteRecord(recordId)
  } catch (error) {
    console.warn('[mentoring] record was re-created but old record could not be deleted:', error)
  }

  return created
}

export async function deleteRecord(recordId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/records/${encodeURIComponent(recordId)}`)
  unwrap(res)
}

export const deleteInterviewRecord = deleteRecord

export async function searchStudentInMyGroups(studentId: string): Promise<StudentInfo | null> {
  const id = String(studentId || '').trim()
  const validation = getStrictStudentIdValidationMessage(id)
  if (validation) throw new Error(validation)

  const res = await get<any>('/api/mentoring/records/students/search', { studentId: id })
  return normalizeStudentPayload(unwrap(res), id)
}

export async function lookupStudent(studentId: string): Promise<StudentInfo | null> {
  const id = String(studentId || '').trim()
  const role = getStoredFrontendRole()
  const validation = getRoleAwareStudentIdValidationMessage(id, role)
  if (validation) throw new Error(validation)

  if (role === 'mentor') {
    // Mentor searches must stay scoped to the mentor's own groups.
    // Try the new mentoring-scoped endpoint first; if that backend build does not support it,
    // fall back to /api/org/student/{studentId}, which the updated OpenAPI also marks as
    // "Mentor searches own-group student".
    try {
      return await searchStudentInMyGroups(id)
    } catch {
      const student = await lookupOrgStudent(id)
      return normalizeStudentPayload(student, id)
    }
  }

  if (role === 'coordinator') {
    // 修改点 (FIX)：跟踪是否遇到过 403。如果三条查询通道里有任何一条因权限被拒，
    // 但又都没能找到学生 → 抛出"无权限"错误，而不是伪造一条假记录。
    let sawPermissionError = false

    try {
      const member = await getMyDeptMember(id)
      const student = normalizeStudentPayload(member, id)
      if (student) return student
    } catch (err: any) {
      if (isPermissionError(err)) sawPermissionError = true
      // 其它错误（如 500 / 网络抖动）保持原行为：忽略，继续尝试下一条通道
    }

    try {
      const student = await lookupOrgStudent(id)
      const normalized = normalizeStudentPayload(student, id)
      if (normalized) return normalized
    } catch (err: any) {
      if (isPermissionError(err)) sawPermissionError = true
    }

    try {
      const scope = await searchMyScope(id)
      const match = scope.students.find((item) => {
        const candidates = [item.studentId, item.id, item.username].map((value) =>
          String(value || '').trim(),
        )
        return candidates.includes(id)
      })
      if (match) return normalizeStudentPayload(match, id)
    } catch (err: any) {
      if (isPermissionError(err)) sawPermissionError = true
    }

    if (sawPermissionError) throw makePermissionError()
    return null
  }

  if (role === 'consultant') {
    // 修改点 (FIX)：同 coordinator 分支 —— FC 搜不属于自己 faculty 的学生时，
    // 后端会抛 403，这里捕获并最终向上抛"权限错误"，而不是返回 buildFallbackStudentProfile
    // (那会让页面显示 username=realName=studentId，没有任何错误提示)。
    let sawPermissionError = false

    try {
      const student = await lookupOrgStudent(id)
      const normalized = normalizeStudentPayload(student, id)
      if (normalized) return normalized
    } catch (err: any) {
      if (isPermissionError(err)) sawPermissionError = true
    }

    try {
      const scope = await searchMyScope(id)
      const match = scope.students.find((item) => {
        const candidates = [item.studentId, item.id, item.username].map((value) =>
          String(value || '').trim(),
        )
        return candidates.includes(id)
      })
      if (match) return normalizeStudentPayload(match, id)
    } catch (err: any) {
      if (isPermissionError(err)) sawPermissionError = true
    }

    if (sawPermissionError) throw makePermissionError()
    return null
  }

  try {
    const student = await lookupOrgStudent(id)
    return normalizeStudentPayload(student, id)
  } catch {
    // For non-mentor pages, keep the old compatibility fallback when org lookup is unavailable.
    return searchStudentInMyGroups(id)
  }
}

export async function searchGroup(
  groupId?: string,
  majorId?: string,
): Promise<{
  group?: GroupInfo
  groups?: GroupInfo[]
  members?: GroupMember[]
  raw?: any
}> {
  const params: QueryParams = {}
  if (groupId) params.groupId = groupId
  if (majorId) params.majorId = majorId

  const res = await get<any>(
    '/api/mentoring/groups/search',
    Object.keys(params).length ? params : undefined,
  )
  const data = unwrap(res)

  if (Array.isArray(data)) {
    const groups = data.map(normalizeGroup)
    return {
      group: groups[0],
      groups,
      members: [],
      raw: data,
    }
  }

  if (data?.group || data?.groups || data?.members) {
    const members = Array.isArray(data?.members)
      ? data.members.map(normalizeMember)
      : []

    /**
     * 修改点 (v8 multi-group)：
     * 后端在按 groupId 模糊匹配（同学年同年级跨 major）时，返回结构是
     *   data: { members: [...], groups: [ {groupId, name, mentorId, ...}, ... ] }
     * 当同时传 majorId 做精确定位时通常只返回 1 个 group（仍在 groups[] 中）。
     *
     * 这里把所有候选 group 用新增的 `groups` 字段暴露给上层，
     * 同时把 `group` 字段填成 groups[0]（旧消费者只看 group 单数仍可用）。
     */
    let groups: GroupInfo[] = []
    if (Array.isArray(data?.groups)) {
      groups = data.groups.map(normalizeGroup)
    }

    let group: GroupInfo | undefined
    if (data?.group) {
      group = normalizeGroup(data.group)
      if (groups.length === 0) groups = [group]
    } else if (groups.length > 0) {
      group = groups[0]
    } else {
      /**
       * 修改点 (FIX，保留原兼容)：
       * 没有 data.group / data.groups，但有 data.members 时
       * （后端把 group 级字段平铺在 data 顶层）。
       */
      const { members: _omitMembers, groups: _omitGroups, ...rest } = data
      const inferredGroupId =
        rest?.groupId ?? rest?.id ?? rest?.unitId ?? members[0]?.groupId ?? groupId ?? ''

      if (inferredGroupId || rest?.mentorId || Object.keys(rest).length > 0) {
        group = normalizeGroup({ ...rest, groupId: inferredGroupId })
        groups = [group]
      }
    }

    return {
      group,
      groups,
      members,
      raw: data,
    }
  }

  return {
    group: data ? normalizeGroup(data) : undefined,
    groups: data ? [normalizeGroup(data)] : [],
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

/**
 * 修改点 (NEW)：按 groupKey 增/删组员（FC 专用）。
 *
 * 接口：
 *   POST   /api/mentoring/groups/by-key/{groupKey}/members/{studentId}
 *   DELETE /api/mentoring/groups/by-key/{groupKey}/members/{studentId}
 *
 * 与老的 addStudentToGroup / removeStudentFromGroup 的区别：
 *   - groupKey 是 group 全局唯一 UUID，等价于 groupId+majorId+mentorId，
 *     可以精确定位「同 groupId / 同 majorId 但不同 mentor」造成的多组场景；
 *   - 不再需要 majorId 配合 groupId 消歧；
 *   - 老接口保留供其它入口继续使用（ConsultantGroupDetailView 等）。
 */
export async function addStudentToGroupByKey(
  groupKey: string,
  studentId: string,
): Promise<void> {
  const key = String(groupKey || '').trim()
  if (!key) throw new Error('groupKey is required')

  const res = await post<null>(
    `/api/mentoring/groups/by-key/${encodeURIComponent(key)}/members/${encodeURIComponent(studentId)}`,
  )
  unwrap(res)
}

export async function removeStudentFromGroupByKey(
  groupKey: string,
  studentId: string,
): Promise<void> {
  const key = String(groupKey || '').trim()
  if (!key) throw new Error('groupKey is required')

  const res = await del<null>(
    `/api/mentoring/groups/by-key/${encodeURIComponent(key)}/members/${encodeURIComponent(studentId)}`,
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
 * 修改点 (NEW)：按 groupKey 修改组导师（FC 专用）。
 *   PUT /api/mentoring/groups/by-key/{groupKey}/mentor
 *   Body: { mentorId }
 *
 * 与 changeGroupMentor(groupId, mentorId, majorId?) 的区别：
 *   - 这个接口直接用全局唯一的 groupKey (UUID)，不需要 majorId 配合就能精确定位组，
 *     适合 ConsultantChangeMentorsView 这种「按 groupId 列出多个候选组、然后逐张
 *     卡片修改导师」的场景：每张卡片自带 groupKey，避免同 groupId 跨 major 的歧义。
 *   - 老接口仍保留供 ConsultantGroupDetailView 等其它入口继续用。
 *
 * 200 响应 data 形如：
 *   { groupId, name, groupKey, groupLabel, parentId, facultyOrgId, mentorId }
 * 归一化后返回 GroupInfo。
 */
export async function changeGroupMentorByKey(
  groupKey: string,
  mentorId: string,
): Promise<GroupInfo> {
  const key = String(groupKey || '').trim()
  if (!key) throw new Error('groupKey is required')

  const res = await put<any>(
    `/api/mentoring/groups/by-key/${encodeURIComponent(key)}/mentor`,
    { mentorId },
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
  const rows = (unwrap(res) || []).map(normalizeSlot)
  const mentorId = rows.find((row) => row.mentorId)?.mentorId
  if (mentorId) rememberMentorSlotOwnerId(String(mentorId))
  rows.forEach((row) => upsertCachedMentorSlot(row))
  return rows
}

export const createSlots = createAppointmentSlots

function looksLikeMentorSysId(value: string): boolean {
  const id = value.trim()
  if (!id) return false
  if (/^[0-9a-f]{32}$/i.test(id)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true
  return id.length >= 20 && !id.includes('_') && /^[0-9a-f]+$/i.test(id)
}

function getStoredUserInfoRecord(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

export function rememberMentorSlotOwnerId(mentorId: string): void {
  const id = String(mentorId || '').trim()
  if (id) localStorage.setItem(MENTOR_SLOT_OWNER_KEY, id)
}

function getMentorSlotsCacheKey(): string {
  const username = String(localStorage.getItem('username') || 'unknown').trim()
  return `${MENTOR_SLOTS_CACHE_PREFIX}${username}`
}

export function loadCachedMentorAppointmentSlots(): AppointmentSlot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(getMentorSlotsCacheKey()) || '[]')
    return Array.isArray(raw) ? raw.map(normalizeSlot) : []
  } catch {
    return []
  }
}

function saveCachedMentorAppointmentSlots(rows: AppointmentSlot[]): void {
  localStorage.setItem(getMentorSlotsCacheKey(), JSON.stringify(rows))
}

export function upsertCachedMentorSlot(slot: AppointmentSlot): void {
  const slotId = String(slot.slotId || '').trim()
  if (!slotId) return

  const rows = loadCachedMentorAppointmentSlots()
  const index = rows.findIndex((row) => row.slotId === slotId)
  if (index >= 0) {
    rows[index] = { ...rows[index], ...slot, slotId }
  } else {
    rows.push({ ...slot, slotId })
  }
  saveCachedMentorAppointmentSlots(rows)
}

function removeCachedMentorSlot(slotId: string): void {
  const id = String(slotId || '').trim()
  if (!id) return
  saveCachedMentorAppointmentSlots(loadCachedMentorAppointmentSlots().filter((row) => row.slotId !== id))
}

export function tagMentorSlotInvitation(
  slotId: string,
  studentId: string,
  studentName?: string,
): AppointmentSlot | null {
  const id = String(slotId || '').trim()
  const invitedStudentId = String(studentId || '').trim()
  if (!id || !invitedStudentId) return null

  const rows = loadCachedMentorAppointmentSlots()
  const existing = rows.find((row) => row.slotId === id)
  if (!existing) return null

  const updated: AppointmentSlot = {
    ...existing,
    invitedStudentId,
    invitedStudentName: studentName || invitedStudentId,
  }
  upsertCachedMentorSlot(updated)
  return updated
}

export async function resolveMentorSlotOwnerIds(): Promise<string[]> {
  const info = getStoredUserInfoRecord()
  const user = info.user || info
  const cached = localStorage.getItem(MENTOR_SLOT_OWNER_KEY) || ''

  const raw = [
    cached,
    info.mentorId,
    user.mentorId,
    user.id,
    user.userId,
    info.userId,
    info.id,
    user.username,
    info.username,
    localStorage.getItem('userId'),
    localStorage.getItem('username'),
  ]

  const unique = Array.from(new Set(raw.map((item) => String(item || '').trim()).filter(Boolean)))

  const username = String(localStorage.getItem('username') || user.username || info.username || '').trim()
  if (username && !unique.some(looksLikeMentorSysId)) {
    try {
      const fresh = await getUserInfoApi(username)
      const profile = (fresh as AnyRecord)?.user ?? fresh
      const sysId = String(profile?.id ?? profile?.userId ?? '').trim()
      if (sysId) unique.unshift(sysId)
    } catch {
      // continue
    }
  }

  return unique.sort((a, b) => {
    const score = (value: string) => {
      if (value === cached) return 0
      if (looksLikeMentorSysId(value)) return 1
      return 2
    }
    return score(a) - score(b)
  })
}

type AnyRecord = Record<string, any>

async function tryListMentorSlotsByPath(path: string): Promise<AppointmentSlot[]> {
  try {
    const res = await get<any[]>(path)
    return (unwrap(res) || []).map(normalizeSlot)
  } catch {
    return []
  }
}

export async function listMyMentorAppointmentSlots(): Promise<AppointmentSlot[]> {
  const cached = loadCachedMentorAppointmentSlots()
  const merged = new Map<string, AppointmentSlot>()
  for (const row of cached) {
    if (row.slotId) merged.set(row.slotId, row)
  }

  const candidates = await resolveMentorSlotOwnerIds()
  const username = String(localStorage.getItem('username') || '').trim()

  if (username && !candidates.some(looksLikeMentorSysId)) {
    try {
      const mentors = await searchMentors(username)
      const match =
          mentors.find(
              (mentor) =>
                  mentor.mentorId === username ||
                  mentor.username === username ||
                  mentor.mentorName === username,
          ) || mentors[0]

      if (match?.mentorId) {
        candidates.unshift(String(match.mentorId))
        rememberMentorSlotOwnerId(String(match.mentorId))
      }
    } catch {
      // mentor search is unavailable for mentor role on some backend builds
    }
  }

  for (const path of [
    '/api/mentoring/appointments/slots/mine',
    '/api/mentoring/appointments/my-slots',
  ]) {
    for (const row of await tryListMentorSlotsByPath(path)) {
      if (row.slotId) merged.set(row.slotId, { ...merged.get(row.slotId), ...row })
    }
  }

  for (const candidate of candidates) {
    try {
      const rows = await getMentorAppointmentSlots(candidate)
      if (rows.length > 0) {
        rememberMentorSlotOwnerId(String(rows[0]?.mentorId || candidate))
      }
      for (const row of rows) {
        if (row.slotId) merged.set(row.slotId, { ...merged.get(row.slotId), ...row })
      }
    } catch {
      // GET /slots/mentor/{id} returns 403 for mentor on current backend
    }
  }

  const combined = [...merged.values()]
  saveCachedMentorAppointmentSlots(combined)
  return combined
}

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
  const row = normalizeSlot(unwrap(res))
  const cached = loadCachedMentorAppointmentSlots().find((item) => item.slotId === slotId)
  upsertCachedMentorSlot({ ...cached, ...row, slotId })
  return row
}

export const setAppointmentSlotVenue = setAppointmentVenue
export const setSlotVenue = setAppointmentVenue
export const mentorConfirmVenue = setAppointmentVenue

export async function cancelAppointmentSlot(slotId: string): Promise<void> {
  const res = await del<null>(`/api/mentoring/appointments/slots/${encodeURIComponent(slotId)}`)
  unwrap(res)
  removeCachedMentorSlot(slotId)
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
  return downloadBlob(`/api/mentoring/export/group/${encodeURIComponent(groupId)}`)
}

export const exportFcGroupRecords = exportGroupRecordsForConsultant

export async function exportConsultantRecords(
  filter: ConsultantExportFilter,
): Promise<BlobWithMeta> {
  const params: QueryParams = {}

  for (const [key, value] of Object.entries(filter)) {
    const text = String(value ?? '').trim()
    if (text) params[key] = text
  }

  if (filter.mentorName && !params.mentorKeyword) params.mentorKeyword = filter.mentorName
  if (filter.studentName && !params.studentKeyword) params.studentKeyword = filter.studentName

  /**
   * 修改点 (FIX)：FC 条件筛选导出后端可能返回两种文件——
   *   - 单条 / 同类型 → application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
   *   - 多个分组打包 → application/zip (.zip)
   * 旧的 downloadBlob 只拿 Blob，前端固定按 .docx 命名，zip 被存成 .docx 打开就乱码。
   * 这里改走 downloadBlobWithHeaders，把后端的真实 Content-Type 和
   * Content-Disposition 文件名一起返回，由调用方按需保存。
   */
  return downloadBlobWithHeaders('/api/mentoring/export/consultant', params)
}

export const exportRecordsByFilter = exportConsultantRecords

export function downloadExportedFile(blob: Blob, filename: string): void {
  saveBlob(blob, filename)
}

/**
 * 修改点 (NEW)：根据后端返回的 Content-Type / Content-Disposition 自动决定
 * 保存的文件名和扩展名。优先级：
 *   1) 后端 Content-Disposition 给的完整文件名（含扩展名）
 *   2) 后端 Content-Type 推断扩展名（zip/docx/doc），拼到 fallbackBaseName 后
 *
 * 这是 exportConsultantRecords 等返回 BlobWithMeta 的接口的配套保存函数，
 * 不影响仍然返回纯 Blob + 由前端硬编码扩展名的其它导出入口。
 */
export function saveExportedBlob(meta: BlobWithMeta, fallbackBaseName: string): void {
  const filename = meta.filename || `${fallbackBaseName}${guessExtensionFromContentType(meta.contentType)}`
  saveBlob(meta.blob, filename)
}

function guessExtensionFromContentType(contentType: string): string {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('zip')) return '.zip'
  if (ct.includes('wordprocessingml')) return '.docx'
  if (ct.includes('msword')) return '.doc'
  // 兜底：保守用 .docx，跟之前默认行为一致
  return '.docx'
}
