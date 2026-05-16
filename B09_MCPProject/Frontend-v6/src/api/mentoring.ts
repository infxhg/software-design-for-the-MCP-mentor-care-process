/**
 * Mentoring API - Interview records
 *
 * Backend endpoints:
 *   GET  /api/mentoring/records/student/{studentId}    (Faculty Consultant / Coordinator)
 *   GET  /api/mentoring/records/group/{groupId}        (Mentor / Coordinator)
 *   GET  /api/mentoring/records/{recordId}             (Mentor / Coordinator / Consultant)
 *   GET  /api/mentoring/records/mine                   (Mentor - all own records)
 *   GET  /api/mentoring/records/students/search        (Mentor - lookup a student in own MCP groups)
 *   POST /api/mentoring/records                        (Mentor - save/update)
 */

import { get, post } from './request'
import { searchStudentById } from './org'
import type { StudentFromApi } from './org'

// ---------- Types ----------

export interface McpRecord {
  recordId?: string
  studentId: string
  mentorId?: string
  groupId?: string
  interviewDate: string       // "2026-05-01"
  interviewTime?: string      // "10:00"
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

/** Payload for POST create (all fields) */
export interface CreateRecordPayload {
  studentId: string
  groupId: string
  interviewDate: string
  interviewTime?: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
}

/** Payload for POST update (only 3 fields) */
export interface UpdateRecordPayload {
  recordId: string
  interviewSummary: string
  followupAction: string
}

// ---------- API calls ----------

/** Get interview records for a student (Faculty Consultant / Coordinator) */
export async function getRecordsByStudent(studentId: string): Promise<McpRecord[]> {
  const res = await get<McpRecord[]>(`/mentoring/records/student/${encodeURIComponent(studentId)}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get records')
  return res.data || []
}

/**
 * Get ALL interview records of the currently logged-in mentor.
 * Backend: GET /api/mentoring/records/mine
 *
 * Mentor 角色专用 —— Mentor 不能调 /student/{studentId}（会 403）。
 */
export async function getMyRecords(): Promise<McpRecord[]> {
  const res = await get<McpRecord[]>(`/mentoring/records/mine`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get my records')
  return res.data || []
}

/**
 * Role-aware: fetch interview records for one student.
 *
 *   - mentor                   →  GET /mentoring/records/mine,
 *                                 then filter by studentId locally
 *                                 (mentor has no permission on /student/{id})
 *   - coordinator / consultant →  GET /mentoring/records/student/{studentId}
 *
 * 这是修复 "mentor 搜得到学生但看不到 interview record" 的核心：
 * Mentor 必须改走 /mine 接口而不是 /student/{studentId}。
 */
export async function fetchRecordsForStudent(studentId: string): Promise<McpRecord[]> {
  const role = (localStorage.getItem('role') || '').trim()
  const sid = String(studentId).trim()

  if (role === 'mentor') {
    const all = await getMyRecords()
    return all.filter((r) => String(r.studentId).trim() === sid)
  }

  return await getRecordsByStudent(sid)
}

/** Get all students and records in a group (Mentor / Coordinator) */
export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const res = await get<StudentGroupRecord[]>(`/mentoring/records/group/${encodeURIComponent(groupId)}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get group records')
  return res.data || []
}

/** Get a single record by ID */
export async function getRecordDetail(recordId: string): Promise<McpRecord> {
  const res = await get<McpRecord>(`/mentoring/records/${encodeURIComponent(recordId)}`)
  if (res.code !== 200) throw new Error(res.message || 'Record not found')
  return res.data
}

/** Create a new interview record — POST /api/mentoring/records */
export async function createRecord(payload: CreateRecordPayload): Promise<void> {
  const res = await post('/mentoring/records', payload)
  if (res.code !== 200) throw new Error(res.message || 'Failed to create record')
}

/** Update an existing interview record — POST /api/mentoring/records */
export async function updateRecord(payload: UpdateRecordPayload): Promise<void> {
  const res = await post('/mentoring/records', payload)
  if (res.code !== 200) throw new Error(res.message || 'Failed to update record')
}

/**
 * @deprecated Use createRecord() / updateRecord() instead.
 * Kept for backward compatibility.
 */
export async function saveRecord(record: McpRecord): Promise<void> {
  if (record.recordId) {
    await updateRecord({
      recordId: record.recordId,
      interviewSummary: record.interviewSummary,
      followupAction: record.followupAction,
    })
  } else {
    await createRecord({
      studentId: record.studentId,
      groupId: record.groupId || '',
      interviewDate: record.interviewDate,
      interviewTime: record.interviewTime,
      problemStatement: record.problemStatement,
      interviewSummary: record.interviewSummary,
      followupAction: record.followupAction,
    })
  }
}

// ---------- Student lookup (mentor-scoped) ----------

/**
 * Mentor-only: look up a student that is in one of this mentor's MCP groups.
 *
 * Backend (per B09 接口文档1):
 *   GET /api/mentoring/records/students/search?studentId={studentId}
 *
 * 后端权限：
 *   - 仅 ROLE_MENTOR 可用
 *   - 后端校验 studentId 是否在当前 mentor 负责的任意一个 group 内
 *   - 若 mentor 没有任何小组 → code 500, "该导师尚未负责任何小组，无权查询学生信息"
 *   - 若学生不在 mentor 任何一个组里 → 返回 code 非 200 或 data 为空
 *
 * 这是修复 "B 组 mentor 通过 id 能搜到 A 组学生" 的关键。
 * 旧接口 /api/org/student/{id} 不做这层"是不是我组里"的校验，
 * mentor 不应再调用它。
 *
 * 安全考虑：
 * 任何"不在我组内"的情况都返回 null（和"学生不存在"一视同仁），
 * 避免泄露"该学生在别的组存在"。
 */
export async function searchStudentInMyGroups(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId).trim()
  if (!sid) return null

  let res: any
  try {
    res = await get<any>(`/mentoring/records/students/search?studentId=${encodeURIComponent(sid)}`)
  } catch (err: any) {
    // 把 401 / 403 / 网络错误向上抛，让调用方按现有逻辑给提示
    if (err?.message?.includes('401') || err?.message?.includes('403')) {
      throw err
    }
    // 其它错误（4xx/5xx 网络层）也不该把 "不存在" 和 "网络挂了" 混淆，抛上去
    throw err
  }

  // code 500 (无小组) / code 非 200 / data 为空 → 一视同仁返回 null
  if (!res || res.code !== 200 || res.data == null) {
    return null
  }

  // 容错适配：response.data 可能是单对象，也可能是数组（返回 1 条），
  // 字段名也可能略有差异（id / studentId / userId 等），都兜一下。
  let raw: any = res.data
  if (Array.isArray(raw)) {
    raw = raw[0]
  }
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const id = raw.id ?? raw.studentId ?? raw.userId ?? sid
  const username = raw.username ?? raw.userName ?? (id != null ? String(id) : sid)
  const realName = raw.realName ?? raw.name ?? null
  const email = raw.email ?? ''
  const phone = raw.phone ?? null
  const status = raw.status ?? null
  const groupId = raw.groupId ?? null
  const majorId = raw.majorId ?? raw.major ?? null

  return {
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

/**
 * Role-aware student lookup. UI 调这个，不用关心是哪种角色。
 *
 *   - mentor                   → GET /mentoring/records/students/search?studentId=...
 *                                (后端只允许查 mentor 自己组内的学生)
 *   - coordinator / consultant → GET /org/student/{studentId} (走 org.ts 的 searchStudentById)
 *
 * 这是修复 "B 组 mentor 通过 id 能搜到 A 组学生" 的入口。
 */
export async function lookupStudent(studentId: string): Promise<StudentFromApi | null> {
  const role = (localStorage.getItem('role') || '').trim()
  if (role === 'mentor') {
    return await searchStudentInMyGroups(studentId)
  }
  return await searchStudentById(studentId)
}
