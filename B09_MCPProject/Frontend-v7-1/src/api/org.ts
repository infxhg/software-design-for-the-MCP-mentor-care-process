import { get, unwrap } from './request'

export interface OrgUnit {
  id: string
  unitId?: string
  name: string
  type: string
  unitType?: string
  parentId?: string | null
  path?: string | null
  sortOrder?: number
  createTime?: string | null
  updateTime?: string | null
  [key: string]: any
}

export interface MentorInfo {
  id?: string
  mentorId: string
  name?: string
  mentorName: string
  username?: string
  realName?: string
  email?: string | null
  office?: string | null
  departmentName?: string | null
  groupId?: string | null
  /**
   * 修改点 (NEW)：mentor 同时被多个组分配时，后端 /api/org/mentors/search
   * 会在 groupIds (学年标识形式，展示用) 和 groupKeys (UUID 唯一标识形式，
   * 接口调用用) 各返回一个数组，且按相同下标一一配对。
   * 为兼容旧数据，也允许字符串形式 (CSV)。
   */
  groupIds?: string[] | string | null
  groupKeys?: string[] | null
  groupKey?: string | null
  raw?: any
  [key: string]: any
}

export interface StudentInfo {
  id?: string
  studentId?: string
  username?: string
  name?: string
  studentName?: string
  realName?: string | null
  phone?: string | null
  email?: string | null
  status?: number | string | null
  isDeleted?: number
  createTime?: string | null
  updateTime?: string | null
  major?: string | null
  majorId?: string | null
  groupId?: string | null
  raw?: any
  [key: string]: any
}

export type MentorFromApi = MentorInfo
export type StudentFromApi = StudentInfo

function normalizeOrgUnit(raw: any): OrgUnit {
  const id = String(raw?.id ?? raw?.unitId ?? '')
  const type = String(raw?.type ?? raw?.unitType ?? '')

  return {
    ...raw,
    id,
    unitId: raw?.unitId ?? id,
    name: String(raw?.name ?? ''),
    type,
    unitType: raw?.unitType ?? type,
    parentId: raw?.parentId ?? null,
    path: raw?.path ?? null,
    sortOrder: raw?.sortOrder,
    createTime: raw?.createTime ?? null,
    updateTime: raw?.updateTime ?? null,
  }
}

function normalizeMentor(raw: any): MentorInfo {
  const mentorId = String(raw?.mentorId ?? raw?.id ?? raw?.userId ?? '')
  const mentorName = String(raw?.mentorName ?? raw?.name ?? raw?.realName ?? raw?.username ?? mentorId)

  /**
   * 修改点 (NEW)：
   * 显式归一化 groupIds (展示用 / 学年标识) 与 groupKeys (UUID / 唯一标识)。
   * 接口示例：
   *   "groupId":   "2024-2025-Y1",
   *   "groupIds":  ["2024-2025-Y1", "2024-2025-Y2"],
   *   "groupKeys": ["cc...aa01", "cc...cc03"]
   * 两数组按索引一一配对，前端按 groupIds[i] 显示，按 groupKeys[i] 跳转/查询。
   */
  let groupIds: string[] | string | null = null
  if (Array.isArray(raw?.groupIds)) {
    groupIds = raw.groupIds.map((v: any) => String(v ?? '').trim()).filter(Boolean)
  } else if (typeof raw?.groupIds === 'string') {
    groupIds = raw.groupIds
  }

  let groupKeys: string[] | null = null
  if (Array.isArray(raw?.groupKeys)) {
    groupKeys = raw.groupKeys.map((v: any) => String(v ?? '').trim()).filter(Boolean)
  }

  return {
    ...raw,
    id: raw?.id ?? mentorId,
    mentorId,
    name: mentorName,
    mentorName,
    email: raw?.email ?? null,
    office: raw?.office ?? null,
    departmentName: raw?.departmentName ?? raw?.department ?? null,
    groupId: raw?.groupId ?? null,
    groupIds,
    groupKeys,
    groupKey: raw?.groupKey ?? null,
    raw,
  }
}

export function normalizeStudent(raw: any, fallbackId = ''): StudentInfo {
  const studentId = String(raw?.studentId ?? raw?.id ?? raw?.userId ?? raw?.username ?? fallbackId ?? '')
  const name = String(raw?.studentName ?? raw?.name ?? raw?.realName ?? raw?.username ?? studentId)

  return {
    ...raw,
    id: String(raw?.id ?? studentId),
    studentId,
    name,
    studentName: raw?.studentName ?? name,
    realName: raw?.realName ?? name,
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    major: raw?.major ?? raw?.majorName ?? raw?.majorId ?? null,
    majorId: raw?.majorId ?? null,
    status: raw?.status ?? null,
    groupId: raw?.groupId ?? null,
    raw,
  }
}

export function isOrgType(unit: any, type: string): boolean {
  return String(unit?.type ?? unit?.unitType ?? '').toUpperCase() === type.toUpperCase()
}

export async function getOrgTree(): Promise<OrgUnit[]> {
  const res = await get<any[]>('/api/org/units')
  return (unwrap(res) || []).map(normalizeOrgUnit)
}

export const getOrgUnits = getOrgTree
export const getRawOrgUnits = getOrgTree

export async function getOrgUnitPublic(unitId: string): Promise<OrgUnit> {
  const res = await get<any>(`/api/org/unit/${encodeURIComponent(unitId)}`)
  return normalizeOrgUnit(unwrap(res))
}

export const getOrgUnit = getOrgUnitPublic

export async function searchMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<any[]>('/api/org/mentors/search', keyword ? { keyword } : undefined)
  return (unwrap(res) || []).map(normalizeMentor)
}

export const searchAllMentors = searchMentors

export async function getMentorsByOrgUnit(orgUnitId: string): Promise<MentorInfo[]> {
  const res = await get<any[]>(`/api/org/mentors/${encodeURIComponent(orgUnitId)}`)
  return (unwrap(res) || []).map(normalizeMentor)
}

export const getMentorsByOrg = getMentorsByOrgUnit

export async function searchDeptMentors(keyword = ''): Promise<MentorInfo[]> {
  const res = await get<any[]>(
    '/api/org/my-dept/mentors',
    keyword ? { keyword } : undefined,
  )
  return (unwrap(res) || []).map(normalizeMentor)
}

export const searchMyDeptMentors = searchDeptMentors

export async function getMyDeptMember(userId: string): Promise<StudentInfo | MentorInfo> {
  const res = await get<any>(`/api/org/my-dept/member/${encodeURIComponent(userId)}`)
  const raw = unwrap(res)

  if (raw?.mentorId || raw?.office || raw?.departmentName) return normalizeMentor(raw)
  return normalizeStudent(raw, userId)
}

export async function lookupStudent(studentId: string): Promise<StudentInfo> {
  const res = await get<any>(`/api/org/student/${encodeURIComponent(studentId)}`)
  return normalizeStudent(unwrap(res), studentId)
}

export const getStudentById = lookupStudent
export const searchStudentById = lookupStudent

export async function searchStudents(keyword = ''): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/org/students/search', keyword ? { keyword } : undefined)
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}

export const searchAllStudents = searchStudents

export async function getDcsStudents(): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/org/students/org_dcs')
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}

export async function getStudentsByDepartment(orgUnitId: string): Promise<StudentInfo[]> {
  // Uploaded OpenAPI only lists /api/org/students/org_dcs as a concrete department-student endpoint.
  if (!orgUnitId || orgUnitId === 'org_dcs') return getDcsStudents()

  // Fallback to global search because dynamic department-student endpoint is not listed.
  return searchStudents(orgUnitId)
}

export const getStudentsByOrg = getStudentsByDepartment

export async function getAllStudents(): Promise<StudentInfo[]> {
  const res = await get<any[]>('/api/user/students/all')
  return (unwrap(res) || []).map((item) => normalizeStudent(item))
}

/**
 * 修改点 (v10 NEW)：
 * 按文档新增的 FC 专用接口
 *   GET /api/org/groups/by-key/{groupKey}
 * 用唯一标识 groupKey (UUID 形态) 拿到该组的完整画像：
 *   { group, mentor, studentMemberIds, studentCount }
 *
 * 用途：Search Mentor Info 找到 mentor 后，点击页面上展示的某个 group ID
 * （前端拿到的实际是 mentor.groupKeys[i]）跳到 GroupMembersView，
 * GroupMembersView 用本接口拉数据，不再走 /api/mentoring/records/group/{groupId}
 * （旧接口不接受 UUID 形态，会 500 "Group not found"）。
 *
 * 注意返回里 studentMemberIds 是字符串数组 (e.g. ["202500004", ...])，
 * 不是带详细字段的 student 对象数组。如果业务需要更多 student 字段，
 * 上层可基于这里的 ID 再去调 lookupStudent / searchStudents。
 */
export interface GroupByKeyGroup {
  groupId?: string
  name?: string
  groupKey?: string
  groupLabel?: string
  parentId?: string
  facultyOrgId?: string
  mentorId?: string
  [key: string]: any
}

export interface GroupByKeyData {
  group: GroupByKeyGroup
  mentor: MentorInfo | null
  studentMemberIds: string[]
  studentCount: number
  raw?: any
}

export async function getGroupByKey(groupKey: string): Promise<GroupByKeyData> {
  const res = await get<any>(
    `/api/org/groups/by-key/${encodeURIComponent(groupKey)}`,
  )
  const data = unwrap(res) || {}

  return {
    group: data.group || {},
    mentor: data.mentor ? normalizeMentor(data.mentor) : null,
    studentMemberIds: Array.isArray(data.studentMemberIds)
      ? data.studentMemberIds.map((v: any) => String(v ?? '').trim()).filter(Boolean)
      : [],
    studentCount:
      typeof data.studentCount === 'number'
        ? data.studentCount
        : Array.isArray(data.studentMemberIds)
          ? data.studentMemberIds.length
          : 0,
    raw: data,
  }
}
