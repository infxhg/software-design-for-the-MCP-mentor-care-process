/**
 * Mentoring API - Interview records.
 *
 * Backend endpoints from OpenAPI:
 *   GET    /api/mentoring/records/student/{studentId}
 *   GET    /api/mentoring/records/group/{groupId}
 *   GET    /api/mentoring/records/{recordId}
 *   GET    /api/mentoring/records/mine
 *   GET    /api/mentoring/records/students/search?studentId=xxx
 *   POST   /api/mentoring/records
 *   DELETE /api/mentoring/records/{recordId}
 */

import { get, post, del } from './request'
import { searchStudentById, getMyDeptMember } from './org'
import type { StudentFromApi } from './org'

// ---------- Types ----------

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
}

export interface StudentGroupRecord {
  studentId: string
  majorId: string
  status: string
  groupId: string
  interviewRecords: McpRecord[]
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

// ---------- Normalizers ----------

function normalizeDate(value: any): string {
  if (!value) return ''
  const text = String(value)

  // 后端可能返回 2026-05-14T16:00:00.000+00:00；前端 date input 需要 YYYY-MM-DD。
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10)
  }

  return text
}

function normalizeTime(value: any): string | undefined {
  if (!value) return undefined
  const text = String(value)

  // 14:30:00 -> 14:30
  if (/^\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 5)
  }

  return text
}

function normalizeRecord(raw: any): McpRecord {
  return {
    recordId: raw?.recordId ?? raw?.id,
    studentId: String(raw?.studentId ?? ''),
    mentorId: raw?.mentorId,
    groupId: raw?.groupId,
    interviewDate: normalizeDate(raw?.interviewDate),
    interviewTime: normalizeTime(raw?.interviewTime),
    problemStatement: String(raw?.problemStatement ?? ''),
    interviewSummary: String(raw?.interviewSummary ?? ''),
    followupAction: String(raw?.followupAction ?? raw?.followUpAction ?? ''),
    createTime: raw?.createTime,
  }
}

function normalizeStudentGroupRecord(raw: any): StudentGroupRecord {
  const records = raw?.interviewRecords ?? raw?.records ?? []
  return {
    studentId: String(raw?.studentId ?? raw?.id ?? ''),
    majorId: String(raw?.majorId ?? raw?.major ?? ''),
    status: String(raw?.status ?? ''),
    groupId: String(raw?.groupId ?? ''),
    interviewRecords: Array.isArray(records) ? records.map(normalizeRecord) : [],
  }
}

// ---------- API calls ----------

/**
 * Get interview records for a student.
 * Consultant / Coordinator 一般走这个；Mentor 看单个学生记录请用 fetchRecordsForStudent。
 */
export async function getRecordsByStudent(studentId: string): Promise<McpRecord[]> {
  const sid = String(studentId || '').trim()
  const res = await get<any[]>(`/mentoring/records/student/${encodeURIComponent(sid)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get records')
  }

  return (res.data || []).map(normalizeRecord)
}

/**
 * Mentor: get all own records.
 */
export async function getMyRecords(): Promise<McpRecord[]> {
  const res = await get<any[]>('/mentoring/records/mine')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get my records')
  }

  return (res.data || []).map(normalizeRecord)
}

/**
 * Role-aware: fetch interview records for one student.
 *
 *   - mentor: GET /mentoring/records/mine then local filter
 *   - coordinator / consultant: GET /mentoring/records/student/{studentId}
 */
export async function fetchRecordsForStudent(studentId: string): Promise<McpRecord[]> {
  const role = (localStorage.getItem('role') || '').trim()
  const sid = String(studentId || '').trim()

  if (role === 'mentor') {
    const all = await getMyRecords()
    return all.filter((r) => String(r.studentId).trim() === sid)
  }

  return await getRecordsByStudent(sid)
}

/**
 * Get all students and records in a group.
 */
export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const gid = String(groupId || '').trim()
  const res = await get<any[]>(`/mentoring/records/group/${encodeURIComponent(gid)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get group records')
  }

  return (res.data || []).map(normalizeStudentGroupRecord)
}

/**
 * Get a single record by ID.
 */
export async function getRecordDetail(recordId: string): Promise<McpRecord> {
  const rid = String(recordId || '').trim()
  const res = await get<any>(`/mentoring/records/${encodeURIComponent(rid)}`)

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Record not found')
  }

  return normalizeRecord(res.data)
}

/**
 * Create a new interview record.
 * 后端 POST /api/mentoring/records；不带 recordId 表示新建。
 */
export async function createRecord(payload: CreateRecordPayload): Promise<void> {
  const res = await post<null>('/mentoring/records', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to create record')
  }
}

/**
 * Update an existing interview record.
 * 后端 POST /api/mentoring/records；带 recordId 表示修改。
 */
export async function updateRecord(payload: UpdateRecordPayload): Promise<void> {
  const res = await post<null>('/mentoring/records', payload)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to update record')
  }
}

/**
 * Delete one persisted interview record.
 */
export async function deleteRecord(recordId: string): Promise<void> {
  const rid = String(recordId || '').trim()
  if (!rid) throw new Error('recordId is required')

  const res = await del<null>(`/mentoring/records/${encodeURIComponent(rid)}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to delete record')
  }
}

/**
 * Backward-compatible helper.
 */
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
    await updateRecord({ recordId: record.recordId, ...base })
  } else {
    await createRecord(base)
  }
}

// ---------- Student lookup ----------

/**
 * Mentor-only: look up a student in current mentor's own MCP groups.
 */
export async function searchStudentInMyGroups(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId || '').trim()
  if (!sid) return null

  const res = await get<any>('/mentoring/records/students/search', {
    studentId: sid,
  })

  if (!res || res.code !== 200 || res.data == null) {
    return null
  }

  let raw = res.data
  if (Array.isArray(raw)) raw = raw[0]
  if (!raw || typeof raw !== 'object') return null

  const id = raw.id ?? raw.studentId ?? raw.userId ?? sid
  return {
    id,
    username: raw.username ?? raw.userName ?? String(id),
    realName: raw.realName ?? raw.name ?? raw.studentName ?? null,
    email: raw.email ?? '',
    phone: raw.phone ?? null,
    status: raw.status ?? null,
    groupId: raw.groupId ?? null,
    majorId: raw.majorId ?? raw.major ?? null,
  }
}

/**
 * Role-aware student lookup.
 *
 *   - mentor      -> /mentoring/records/students/search?studentId=...
 *   - coordinator -> /org/my-dept/member/{userId}
 *   - consultant  -> /org/student/{studentId}
 */
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
