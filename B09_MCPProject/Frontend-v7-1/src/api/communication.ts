import { get, post, unwrap } from './request'
import {
  normalizeFrontendRole,
  normalizeRecipientType,
  validateMessageBeforeSend,
  type RecipientType,
} from '../utils/communicationPolicy'

type AnyRecord = Record<string, any>

export interface MessageEntity {
  id: string
  messageId: string
  senderId?: string
  fromUserId?: string
  from?: string
  recipientIds?: string[]
  receiverIds?: string[]
  recipientId?: string
  receiverId?: string
  toUserId?: string
  content: string
  createTime?: string
  createdAt?: string
  timestamp?: string
  read?: boolean
  status?: string
  raw?: AnyRecord
}

export interface SendMessagePayload {
  recipientIds?: string[]
  receiverIds?: string[]
  recipientId?: string
  receiverId?: string
  toUserId?: string
  content: string
  availableReceivers?: AvailableReceiver[]
}

export interface AvailableReceiver {
  id: string
  userId: string
  username?: string
  realName?: string
  name?: string
  role?: RecipientType | string
  type?: RecipientType | string
  email?: string
  phone?: string
  departmentName?: string
  raw?: AnyRecord
}

function unwrapData<T = unknown>(response: unknown): T {
  return unwrap(response as any) as T
}

function asArray(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[]

  const obj = value as AnyRecord | null | undefined
  if (!obj || typeof obj !== 'object') return []

  if (Array.isArray(obj.records)) return obj.records
  if (Array.isArray(obj.list)) return obj.list
  if (Array.isArray(obj.content)) return obj.content
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.data)) return obj.data

  return []
}

function buildKeywordParams(keyword: string): AnyRecord | undefined {
  const q = keyword.trim()

  if (!q) return undefined

  return {
    keyword: q,
    username: q,
    studentId: q,
  }
}

function normalizeMessage(raw: AnyRecord): MessageEntity {
  const id = String(raw.id ?? raw.messageId ?? raw.msgId ?? '')
  const recipientIds =
    raw.recipientIds ??
    raw.receiverIds ??
    (raw.recipientId ? [raw.recipientId] : undefined) ??
    (raw.receiverId ? [raw.receiverId] : undefined) ??
    (raw.toUserId ? [raw.toUserId] : undefined)

  return {
    ...raw,
    id,
    messageId: String(raw.messageId ?? raw.id ?? raw.msgId ?? id),
    senderId: raw.senderId ?? raw.fromUserId ?? raw.from,
    fromUserId: raw.fromUserId ?? raw.senderId ?? raw.from,
    from: raw.from ?? raw.senderId ?? raw.fromUserId,
    recipientIds,
    receiverIds: raw.receiverIds ?? recipientIds,
    recipientId: raw.recipientId ?? raw.receiverId ?? raw.toUserId,
    receiverId: raw.receiverId ?? raw.recipientId ?? raw.toUserId,
    toUserId: raw.toUserId ?? raw.recipientId ?? raw.receiverId,
    content: String(raw.content ?? raw.message ?? raw.text ?? ''),
    createTime: raw.createTime ?? raw.createdAt ?? raw.timestamp,
    createdAt: raw.createdAt ?? raw.createTime ?? raw.timestamp,
    timestamp: raw.timestamp ?? raw.createTime ?? raw.createdAt,
    read: raw.read ?? raw.isRead,
    status: raw.status,
    raw,
  }
}

function normalizeReceiver(
  raw: AnyRecord | string | number,
  fallbackRole?: RecipientType | string,
): AvailableReceiver | null {
  if (typeof raw === 'string' || typeof raw === 'number') {
    const id = String(raw).trim()
    if (!id) return null

    const role = normalizeRecipientType(fallbackRole)

    return {
      id,
      userId: id,
      username: id,
      name: id,
      role,
      type: role,
      raw: { id },
    }
  }

  const id = String(
    raw.userId ??
      raw.id ??
      raw.username ??
      raw.mentorId ??
      raw.studentId ??
      raw.consultantId ??
      raw.coordinatorId ??
      '',
  ).trim()

  if (!id) return null

  const role = normalizeRecipientType(raw.type ?? raw.role ?? raw.userRole ?? fallbackRole)

  return {
    id,
    userId: id,
    username: raw.username ?? raw.account,
    realName: raw.realName ?? raw.name ?? raw.mentorName ?? raw.studentName,
    name: raw.name ?? raw.realName ?? raw.mentorName ?? raw.studentName ?? raw.username ?? id,
    role,
    type: role,
    email: raw.email,
    phone: raw.phone,
    departmentName: raw.departmentName ?? raw.department,
    raw,
  }
}

function uniqueReceivers(rows: Array<AvailableReceiver | null>): AvailableReceiver[] {
  const map = new Map<string, AvailableReceiver>()

  for (const row of rows) {
    if (!row?.id) continue

    const id = String(row.id).trim()
    if (!id) continue

    if (!map.has(id)) {
      map.set(id, { ...row, id, userId: row.userId || id })
      continue
    }

    const old = map.get(id)!

    map.set(id, {
      ...old,
      ...row,
      id,
      userId: old.userId || row.userId || id,
      username: old.username || row.username,
      realName: old.realName || row.realName,
      name: old.name || row.name,
      role: old.role || row.role,
      type: old.type || row.type,
      email: old.email || row.email,
      phone: old.phone || row.phone,
      departmentName: old.departmentName || row.departmentName,
    })
  }

  return [...map.values()]
}

async function tryGetArray(
  path: string,
  params?: AnyRecord,
  fallbackRole?: RecipientType | string,
): Promise<AvailableReceiver[]> {
  const response = await get(path, params)
  const data = unwrapData<unknown>(response)

  return asArray(data)
    .map((row) => normalizeReceiver(row, fallbackRole))
    .filter((row): row is AvailableReceiver => Boolean(row))
}

function getCurrentRole(): string {
  return normalizeFrontendRole(localStorage.getItem('role'))
}

function getCurrentUserId(): string {
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}')

    return String(
      info.user?.id ??
        info.user?.userId ??
        info.userId ??
        info.id ??
        localStorage.getItem('userId') ??
        '',
    )
  } catch {
    return String(localStorage.getItem('userId') ?? '')
  }
}

async function getStudentMentorReceiver(): Promise<AvailableReceiver[]> {
  const candidateUrls = [
    '/api/mentoring/student/my-mentor',
    '/api/mentoring/my-mentor',
    '/api/student/my-mentor',
  ]

  let lastError: unknown = null

  for (const url of candidateUrls) {
    try {
      const response = await get(url)
      const data = unwrapData<unknown>(response)

      const rows = asArray(data)
      if (rows.length > 0) {
        return uniqueReceivers(
          rows.map((row) => normalizeReceiver(row, 'mentor')),
        )
      }

      const receiver = normalizeReceiver(data as AnyRecord, 'mentor')
      if (receiver) return [receiver]
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) throw lastError

  return []
}

async function getMentorStudentReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const params = buildKeywordParams(keyword)
  const candidateUrls = [
    '/api/mentoring/records/students/search',
    '/api/mentoring/students/search',
    '/api/org/students/search',
  ]

  const result: AvailableReceiver[] = []

  for (const url of candidateUrls) {
    try {
      result.push(...(await tryGetArray(url, params, 'student')))
    } catch {
      // Try next endpoint.
    }
  }

  return uniqueReceivers(result)
}

async function getCoordinatorReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const keywordParams = buildKeywordParams(keyword)
  const result: AvailableReceiver[] = []

  const tasks: Array<Promise<AvailableReceiver[]>> = [
    tryGetArray('/api/org/my-dept/mentors', keywordParams, 'mentor'),
    tryGetArray('/api/org/students/search', keywordParams, 'student'),
    tryGetArray('/api/user/admin/faculty-consultants', undefined, 'consultant'),
  ]

  const settled = await Promise.allSettled(tasks)

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      result.push(...item.value)
    }
  }

  return uniqueReceivers(result)
}

async function getConsultantReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const keywordParams = buildKeywordParams(keyword)
  const result: AvailableReceiver[] = []

  const tasks: Array<Promise<AvailableReceiver[]>> = [
    tryGetArray('/api/org/students/search', keywordParams, 'student'),
    tryGetArray('/api/user/coordinators', keywordParams, 'coordinator'),
    tryGetArray('/api/org/coordinators', keywordParams, 'coordinator'),
  ]

  const settled = await Promise.allSettled(tasks)

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      result.push(...item.value)
    }
  }

  return uniqueReceivers(result)
}

/**
 * GET /api/message/list
 */
export async function listMyMessages(): Promise<MessageEntity[]> {
  const response = await get('/api/message/list')
  const data = unwrapData<unknown>(response)

  return asArray(data).map(normalizeMessage)
}

/**
 * The backend currently has no single unified "available receivers" endpoint in the uploaded code,
 * so this function collects receiver options by role and only exposes allowed receiver types.
 */
export async function getAvailableReceivers(keyword = ''): Promise<AvailableReceiver[]> {
  const role = getCurrentRole()
  const currentUserId = getCurrentUserId()

  let receivers: AvailableReceiver[] = []

  if (role === 'student') {
    receivers = await getStudentMentorReceiver()
  } else if (role === 'mentor') {
    receivers = await getMentorStudentReceivers(keyword)
  } else if (role === 'coordinator') {
    receivers = await getCoordinatorReceivers(keyword)
  } else if (role === 'consultant') {
    receivers = await getConsultantReceivers(keyword)
  } else {
    receivers = []
  }

  return uniqueReceivers(receivers).filter((receiver) => {
    if (!receiver.id) return false
    if (currentUserId && receiver.id === currentUserId) return false

    return true
  })
}

/**
 * POST /api/message/send
 */
export async function sendNormalMessage(
  recipientIds: string | string[],
  content: string,
  availableReceivers?: AvailableReceiver[],
): Promise<unknown> {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds]

  const cleanedIds = Array.from(
    new Set(ids.map((id) => String(id).trim()).filter(Boolean)),
  )

  const trimmedContent = content.trim()
  const receivers = availableReceivers || (await getAvailableReceivers(''))
  const role = getCurrentRole()

  const validationMessage = validateMessageBeforeSend(
    role,
    cleanedIds,
    trimmedContent,
    receivers,
  )

  if (validationMessage) {
    throw new Error(validationMessage)
  }

  const response = await post('/api/message/send', {
    recipientIds: cleanedIds,
    content: trimmedContent,
  })

  return unwrapData(response)
}

export async function sendMessage(payload: SendMessagePayload): Promise<unknown> {
  const recipientIds =
    payload.recipientIds ??
    payload.receiverIds ??
    (payload.recipientId ? [payload.recipientId] : undefined) ??
    (payload.receiverId ? [payload.receiverId] : undefined) ??
    (payload.toUserId ? [payload.toUserId] : undefined) ??
    []

  return sendNormalMessage(recipientIds, payload.content, payload.availableReceivers)
}

/**
 * GET /api/message/unread-count
 */
export async function getUnreadMessageCount(): Promise<number> {
  const response = await get('/api/message/unread-count')
  const data = unwrapData<unknown>(response)
  const count = Number(data)

  return Number.isFinite(count) ? count : 0
}

/**
 * GET /api/message/{messageId}
 */
export async function getMessageDetail(messageId: string | number): Promise<MessageEntity> {
  const id = String(messageId).trim()

  if (!id) {
    throw new Error('Message ID is required.')
  }

  const response = await get(`/api/message/${encodeURIComponent(id)}`)
  const data = unwrapData<AnyRecord>(response)

  return normalizeMessage(data)
}

/**
 * Current API marks a message as read by opening its detail.
 */
export async function markMessageRead(messageId: string | number): Promise<MessageEntity> {
  return getMessageDetail(messageId)
}

export async function replyMessage(
  original: MessageEntity | string | number,
  content: string,
): Promise<unknown> {
  const target =
    typeof original === 'object'
      ? original.senderId ?? original.fromUserId ?? original.from
      : String(original)

  if (!target) {
    throw new Error('Cannot determine message sender to reply to.')
  }

  return sendNormalMessage(target, content)
}

export const listMessages = listMyMessages
export const getMessages = listMyMessages
export const sendNormalMsg = sendNormalMessage
export const sendNormalCommunication = sendNormalMessage
export const unreadCount = getUnreadMessageCount
