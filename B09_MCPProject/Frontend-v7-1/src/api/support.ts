import {
  getFeedbackDetail,
  getLogsByUser,
  getUserInfoByIdApi,
  listFeedback,
  listLogs,
  replyFeedback,
  updateFeedbackStatus,
  type FeedbackItem,
  type OperationLog,
  type UserInfoDTO,
} from './user'

export {
  getFeedbackDetail,
  getLogsByUser,
  getUserInfoByIdApi,
  listFeedback,
  listLogs,
  replyFeedback,
  updateFeedbackStatus,
}

export type { FeedbackItem, OperationLog, UserInfoDTO }

type AnyRecord = Record<string, any>

export type LogSearchParams = {
  query?: string
  keyword?: string
  userId?: string
  username?: string
  action?: string
  startTime?: string
  endTime?: string
}

export interface LogUserSearchResult {
  userId: string
  username: string
  name: string
  role: string
  matchedLogs: number
  logs: OperationLog[]
  logSearchKey: string
  rawUser?: AnyRecord
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' ? (value as AnyRecord) : {}
}

function extractUserPayload(value: unknown): AnyRecord {
  const raw = asRecord(value)

  return asRecord(
      raw.user ??
      raw.userInfo ??
      raw.account ??
      raw.data ??
      raw,
  )
}

function normalizeUser(value: unknown, fallback = ''): LogUserSearchResult | null {
  const user = extractUserPayload(value)

  const id = String(
      user.id ??
      user.userId ??
      user.studentId ??
      user.mentorId ??
      user.operatorUserId ??
      user.accountId ??
      fallback,
  ).trim()

  const username = String(
      user.username ??
      user.account ??
      user.name ??
      fallback,
  ).trim()

  if (!id && !username) return null

  const name = String(user.realName || user.name || username || id || 'Unknown')
  const role = String(user.role || (user.roles ? (Array.isArray(user.roles) ? user.roles[0] : user.roles) : '') || 'User')

  return {
    userId: id,
    username: username,
    name: name,
    role: role,
    matchedLogs: 0,
    logs: [],
    logSearchKey: id || username,
    rawUser: user,
  }
}

async function tryGetUserByKeyword(query: string): Promise<LogUserSearchResult[]> {
  if (!query) return []
  const list: LogUserSearchResult[] = []

  // 核心修复：依次调用增强后的解耦接口，分别将数字视为主键、用户名、账号资产进行全方位抓取
  try {
    const u = await getUserInfoByIdApi(query)
    const norm = normalizeUser(u, query)
    if (norm) list.push(norm)
  } catch {
    // 忽略单次轮询失败，继续下文检索
  }

  return list
}

function buildCandidateKeywords(query: string, users: LogUserSearchResult[]): string[] {
  const set = new Set<string>()
  const q = query.trim()
  if (q) {
    set.add(q)
    set.add(q.toLowerCase())
  }

  for (const u of users) {
    if (u.userId) set.add(u.userId)
    if (u.username) {
      set.add(u.username)
      set.add(u.username.toLowerCase())
    }
  }

  return Array.from(set).filter(Boolean)
}

function getLogUserIds(log: OperationLog): string[] {
  const raw = log as AnyRecord
  return [
    String(raw.userId ?? ''),
    String(raw.studentId ?? ''),
    String(raw.mentorId ?? ''),
    String(raw.operatorUserId ?? ''),
    String(raw.operatorId ?? ''),
    String(raw.targetUserId ?? ''),
  ].map((s) => s.trim()).filter(Boolean)
}

function getLogUsernames(log: OperationLog): string[] {
  const raw = log as AnyRecord
  return [
    String(raw.username ?? ''),
    String(raw.userName ?? ''),
    String(raw.operatorUsername ?? ''),
    String(raw.targetUsername ?? ''),
  ].map((s) => s.trim().toLowerCase()).filter(Boolean)
}

function logMatchesAny(log: OperationLog, keywords: string[]): boolean {
  const ids = getLogUserIds(log)
  const names = getLogUsernames(log)

  const raw = log as AnyRecord
  const text = [
    String(raw.operation ?? ''),
    String(raw.action ?? ''),
    String(raw.module ?? ''),
    String(raw.detail ?? ''),
    String(raw.summary ?? ''),
    String(raw.description ?? ''),
  ].map((s) => s.toLowerCase())

  for (const kw of keywords) {
    const kwLow = kw.toLowerCase()
    if (ids.includes(kw)) return true
    if (names.includes(kwLow)) return true
    if (text.some((t) => t.includes(kwLow))) return true
  }

  return false
}

async function tryListLogs(params: LogSearchParams): Promise<OperationLog[]> {
  // 核心修复：向后端拉取基础日志时清除有冲突隐患的模糊字段包，改用纯净形式调用
  try {
    return await listLogs({})
  } catch {
    try {
      return await listLogs(params)
    } catch {
      return []
    }
  }
}

async function searchLogsByKeywords(keywords: string[], params: LogSearchParams): Promise<OperationLog[]> {
  if (keywords.length === 0) return []

  // 分别针对单独字段进行高内聚查询，防止后端抛出 AND 复合查询异常
  const results: OperationLog[] = []
  const seenIds = new Set<string>()

  for (const kw of keywords) {
    try {
      const chunk = await listLogs({ userId: kw })
      for (const log of chunk) {
        const key = `${kw}-${(log as any).logId || (log as any).id || Date.now()}`
        if (!seenIds.has(key)) {
          seenIds.add(key)
          results.push(log)
        }
      }
    } catch {
      // 捕获个别参数格式 400，确保轮询不中断
    }
  }

  return results
}

function dedupeLogs(list: OperationLog[]): OperationLog[] {
  const seen = new Set<string>()
  const result: OperationLog[] = []

  for (const item of list) {
    const raw = item as AnyRecord
    const id = String(raw.logId ?? raw.id ?? '')
    const key = id || `${raw.userId || ''}-${raw.username || ''}-${raw.createTime || raw.createdAt || ''}-${raw.action || ''}`

    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

function dedupeUsers(list: LogUserSearchResult[]): LogUserSearchResult[] {
  const seen = new Set<string>()
  const result: LogUserSearchResult[] = []

  for (const item of list) {
    const key = `${item.userId || ''}-${item.username || ''}`.trim()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

export async function searchLogs(params: LogSearchParams = {}): Promise<OperationLog[]> {
  const query = String(params.query ?? params.keyword ?? params.userId ?? params.username ?? '').trim()

  if (!query) {
    return listLogs(params)
  }

  const users = await tryGetUserByKeyword(query)
  const keywords = buildCandidateKeywords(query, users)

  let logs = await searchLogsByKeywords(keywords, params)

  if (logs.length === 0) {
    const allLogs = await tryListLogs(params)
    logs = allLogs.filter((log) => logMatchesAny(log, keywords))
  }

  return dedupeLogs(logs)
}

export async function searchLogUsers(params: LogSearchParams = {}): Promise<LogUserSearchResult[]> {
  const query = String(params.query ?? params.keyword ?? params.userId ?? params.username ?? '').trim()

  if (!query) {
    return []
  }

  const users = await tryGetUserByKeyword(query)
  const keywords = buildCandidateKeywords(query, users)

  let logs = await searchLogs(params)
  if (logs.length === 0) {
    const allLogs = await tryListLogs(params)
    logs = allLogs.filter((log) => logMatchesAny(log, keywords))
  }

  const result: LogUserSearchResult[] = [...users]

  for (const log of logs) {
    const ids = getLogUserIds(log)
    const names = getLogUsernames(log)

    let matched = false
    for (const kw of keywords) {
      if (ids.includes(kw) || names.includes(kw.toLowerCase())) {
        matched = true
        break
      }
    }

    if (!matched) continue

    const logUserId = ids[0] || ''
    const logUsername = names[0] || ''

    let found = result.find(
        (u) =>
            (logUserId && u.userId === logUserId) ||
            (logUsername && u.username.toLowerCase() === logUsername.toLowerCase()),
    )

    if (!found) {
      found = {
        userId: logUserId,
        username: logUsername,
        name: logUsername || logUserId || 'Unknown',
        role: String((log as any).userRole || (log as any).role || 'User'),
        matchedLogs: 0,
        logs: [],
        logSearchKey: logUserId || logUsername,
      }
      result.push(found)
    }

    found.logs.push(log)
  }

  for (const user of result) {
    user.logs = dedupeLogs(user.logs)
    user.matchedLogs = user.logs.length
    user.logSearchKey = user.userId || user.username || query
  }

  return dedupeUsers(result).filter((u) => u.matchedLogs > 0 || u.userId === query || u.username === query)
}