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

type LogSearchParams = {
  query?: string
  keyword?: string
  userId?: string
  username?: string
  action?: string
  startTime?: string
  endTime?: string
}

function getLogKey(log: OperationLog): string {
  return String(
    log.logId ??
      log.id ??
      `${log.userId ?? ''}-${log.createTime ?? log.createdAt ?? ''}-${log.action ?? log.operation ?? ''}`,
  )
}

function logMatchesQuery(log: OperationLog, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return [
    log.userId,
    log.username,
    log.userName,
    log.realName,
    log.name,
    log.role,
    log.department,
    log.operation,
    log.action,
    log.module,
    log.detail,
    log.summary,
    log.logType,
    log.type,
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .some((value) => value.includes(q))
}

function dedupeLogs(logs: OperationLog[]): OperationLog[] {
  const seen = new Set<string>()
  const result: OperationLog[] = []

  for (const log of logs) {
    const key = getLogKey(log)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(log)
  }

  return result
}

export async function searchLogs(params: LogSearchParams = {}): Promise<OperationLog[]> {
  const query = String(params.query ?? params.keyword ?? params.userId ?? params.username ?? '').trim()

  if (!query) {
    return listLogs(params)
  }

  const requests = [
    listLogs({ ...params, query }),
    listLogs({ ...params, keyword: query }),
    listLogs({ ...params, userId: query }),
    listLogs({ ...params, username: query }),
  ]

  const settled = await Promise.allSettled(requests)
  const logs = settled
    .filter((item): item is PromiseFulfilledResult<OperationLog[]> => item.status === 'fulfilled')
    .flatMap((item) => item.value)

  if (logs.length > 0) {
    return dedupeLogs(logs).filter((log) => logMatchesQuery(log, query))
  }

  const firstError = settled.find(
    (item): item is PromiseRejectedResult => item.status === 'rejected',
  )?.reason

  throw firstError instanceof Error ? firstError : new Error('Failed to search logs.')
}
