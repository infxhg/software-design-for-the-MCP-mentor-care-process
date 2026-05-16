/**
 * Organization API - Mentor & Student search
 *
 * Backend endpoints:
 *   GET /api/org/mentors/{orgUnitId}?keyword=xxx     (Coordinator - by org unit)
 *   GET /api/org/mentors/search?keyword=xxx          (Faculty Consultant - global)
 *   GET /api/org/students/{orgId}?keyword=xxx        (Coordinator - by department)
 *   GET /api/org/students/search?keyword=xxx         (Faculty Consultant - global)
 *   GET /api/org/student/{studentId}                 (Exact student query by ID)
 *   GET /api/org/units?unitType=xxx                  (Get org tree)
 *
 * 修改点 (v7)：
 * 新增 my-dept 接口，由后端根据当前 coordinator 的 token 自动确定其所属系，
 * 不再需要前端传 orgUnitId。
 *   GET /api/org/my-dept/member/{userId}             (Coordinator - 严格按用户 id 查询本部门成员)
 *   GET /api/org/my-dept/mentors?keyword=xxx         (Coordinator - 按邮箱/姓名搜本系 mentor)
 */

import { get } from './request'

// ---------- Types ----------

export interface MentorFromApi {
  mentorId: string
  mentorName: string
  email: string
  office: string
  departmentName: string

  /**
   * 修改点：
   * 目前接口文档里的 mentor response 没写 groupId，
   * 但需求文档要求 Search Mentor Info 显示 group ID。
   * 所以前端先兼容这些可能字段。
   */
  groupId?: string | number | null
  groupIds?: Array<string | number> | string | null
  mcpGroupId?: string | number | null
}

export interface StudentFromApi {
  id: string | number
  username: string
  realName: string | null
  email: string
  phone: string | null

  status?: string | number | null
  groupId?: string | null
  majorId?: string | null
}

export interface OrgUnit {
  id: string
  name: string
  unitType: number
  parentId: string | null
}

// ---------- Mentor API ----------

/**
 * Coordinator: search mentors under an org unit.
 *
 * 这个接口对应文档里的：
 * GET /api/org/mentors/{orgUnitId}?keyword=xxx
 *
 * orgUnitId 可以是 department id，也可能是 group id，
 * 具体取决于后端接口如何定义。
 *
 * 修改点 (v7)：
 * 该函数保留，但 SearchMentorView 不再使用它走 coordinator 流程，
 * coordinator 改用 searchMyDeptMentors() —— 由后端从 token 推断所在系。
 */
export async function getMentorsByOrg(orgUnitId: string, keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/${encodeURIComponent(orgUnitId)}${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get mentors')
  }

  return res.data || []
}

/**
 * Faculty Consultant: global mentor search by name / email (fuzzy).
 *
 * Backend (per B09 接口文档增加):
 *   GET /api/org/mentors/search?keyword=xxx
 *
 *   - 角色限制：仅 Faculty Consultant
 *     Coordinator 调用会返回 403
 *   - 关键字：name / email 的模糊匹配，
 *     匹配上且角色为 MENTOR 的人都会返回
 *   - 后端会自动算出 departmentName 一并返回
 *
 * 响应体（data 数组的每一项）：
 *   {
 *     mentorId, mentorName, email, office, departmentName
 *   }
 *
 * 注意：新接口的 response 里 *不* 包含 groupId。
 * 如果需要 group ID，要么后端补字段，
 * 要么前端拿到 mentor 后再单独查 group。
 */
export async function searchAllMentors(keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/mentors/search${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors')
  }

  return res.data || []
}

/**
 * 修改点 (v7 新增)：
 * Coordinator 在自己系下按邮箱/姓名搜 mentor。
 *
 * Backend:
 *   GET /api/org/my-dept/mentors?keyword=xxx
 *
 *   - 角色限制：仅 Coordinator
 *   - 后端从 JWT 中拿到当前 coordinator 的所属系（department），
 *     前端无需也不应传 orgUnitId。
 *   - keyword 对 mentor name (即 username) 和 email 做模糊匹配。
 *   - keyword 不传 => 返回本系全部 mentor。
 *
 * 响应体（data 数组的每一项）：
 *   {
 *     mentorId, mentorName, email, office, departmentName
 *   }
 */
export async function searchMyDeptMentors(keyword?: string): Promise<MentorFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<MentorFromApi[]>(`/org/my-dept/mentors${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search mentors in my department')
  }

  return res.data || []
}

// ---------- Student API ----------

export async function getStudentsByOrg(orgId: string, keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/${encodeURIComponent(orgId)}${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get students')
  }

  return res.data || []
}

export async function searchAllStudents(keyword?: string): Promise<StudentFromApi[]> {
  const kw = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const res = await get<StudentFromApi[]>(`/org/students/search${kw}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to search students')
  }

  return res.data || []
}

/**
 * Exact query one student by Student ID (全校范围，无系级限制).
 *
 * 修改点 (v7)：
 * 该函数保留给 Faculty Consultant 等需要全校查询的角色用。
 * Coordinator 不再走这里，改用 getMyDeptMember() —— 严格限制本系。
 */
export async function searchStudentById(studentId: string): Promise<StudentFromApi | null> {
  const sid = String(studentId).trim()

  if (!sid) {
    return null
  }

  const res = await get<StudentFromApi>(`/org/student/${encodeURIComponent(sid)}`)

  if (res.code !== 200 || !res.data) {
    return null
  }

  return res.data
}

/**
 * 修改点 (v7 新增)：
 * Coordinator 严格按 userId 查询本部门下的成员（mentor 或 student）。
 *
 * Backend:
 *   GET /api/org/my-dept/member/{userId}
 *
 *   - 角色限制：仅 Coordinator
 *   - 后端从 JWT 中拿到 coordinator 的所属系，
 *     校验目标 userId 是否在同一个系下；
 *     不在 → 当作"查不到"处理（避免泄漏跨系信息）。
 *   - 响应 data 是一个 user 对象：
 *       { id, username, realName, phone, email, status, ... }
 *
 * 这是修复 "coordinator 通过 id 能搜到外系学生" 的关键。
 *
 * 备注（按需求方说明）：
 *   该接口同时也能查到 mentor 信息，但 Search Student 模块只用它查 student。
 *   Search Mentor 模块不通过 userId 查询。
 */
export async function getMyDeptMember(userId: string): Promise<StudentFromApi | null> {
  const uid = String(userId).trim()

  if (!uid) {
    return null
  }

  let res: any
  try {
    res = await get<any>(`/org/my-dept/member/${encodeURIComponent(uid)}`)
  } catch (err: any) {
    // 401/403 抛上去走外层提示；404 之类网络错误也抛上去
    throw err
  }

  if (!res || res.code !== 200 || !res.data) {
    return null
  }

  // 容错适配后端字段名差异
  const raw: any = res.data
  const id = raw.id ?? raw.userId ?? uid
  const username = raw.username ?? raw.userName ?? (id != null ? String(id) : uid)
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

// ---------- Org Tree API ----------

export async function getOrgUnits(unitType?: number): Promise<OrgUnit[]> {
  const param = unitType !== undefined ? `?unitType=${unitType}` : ''
  const res = await get<OrgUnit[]>(`/org/units${param}`)

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get org units')
  }

  return res.data || []
}
