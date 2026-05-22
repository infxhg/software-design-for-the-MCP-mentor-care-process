import { get, post, unwrap } from './request'

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
}

export interface AvailableReceiver {
  id: string
  userId: string
  username?: string
  realName?: string
  name?: string
  role?: string
  email?: string
  phone?: string
  departmentName?: string
  raw?: AnyRecord
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

function unwrapData<T = unknown>(response: unknown): T {
  return unwrap(response as any) as T
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

function normalizeReceiver(raw: AnyRecord | string, fallbackRole?: string): AvailableReceiver | null {
  if (typeof raw === 'string') {
    const id = raw.trim()
    if (!id) return null
    return {
      id,
      userId: id,
      username: id,
      name: id,
      role: fallbackRole,
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

  return {
    id,
    userId: id,
    username: raw.username ?? raw.account,
    realName: raw.realName ?? raw.name ?? raw.mentorName ?? raw.studentName,
    name: raw.name ?? raw.realName ?? raw.mentorName ?? raw.studentName ?? raw.username ?? id,
    role: raw.role ?? raw.userRole ?? fallbackRole,
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
    if (!map.has(row.id)) map.set(row.id, row)
  }

  return [...map.values()]
}

async function tryGetArray(path: string, params?: AnyRecord, fallbackRole?: string): Promise<AvailableReceiver[]> {
  const response = await get(path, params)
  const data = unwrapData<unknown>(response)
  return asArray(data)
    .map((row) => normalizeReceiver(row, fallbackRole))
    .filter(Boolean) as AvailableReceiver[]
}

function getCurrentRole(): string {
  return String(localStorage.getItem('role') || '').toLowerCase()
}

function getCurrentUserId(): string {
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return String(info.userId ?? info.id ?? localStorage.getItem('userId') ?? '')
  } catch {
    return String(localStorage.getItem('userId') ?? '')
  }
}

/**
 * Real backend call: GET /api/message/list
 *
 * Do not return [] on request/permission failure.
 * Returning [] hides real backend errors and makes the page look like there are no messages.
 */
export async function listMyMessages(): Promise<MessageEntity[]> {
  const response = await get('/api/message/list')
  const data = unwrapData<unknown>(response)
  return asArray(data).map(normalizeMessage)
}

/**
 * Real backend call: POST /api/message/send
 */
export async function sendNormalMessage(
  recipientIds: string | string[],
  content: string,
): Promise<unknown> {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds]
  const cleanedIds = ids.map((id) => String(id).trim()).filter(Boolean)
  const trimmedContent = content.trim()

  if (!cleanedIds.length) {
    throw new Error('Please enter at least one recipient.')
  }

  if (!trimmedContent) {
    throw new Error('Message content cannot be empty.')
  }

  const response = await post('/api/message/send', {
    recipientIds: cleanedIds,
    content: trimmedContent,
  })

  return unwrapData(response)
}

/**
 * Compatible payload-style sender.
 */
export async function sendMessage(payload: SendMessagePayload): Promise<unknown> {
  const recipientIds =
    payload.recipientIds ??
    payload.receiverIds ??
    (payload.recipientId ? [payload.recipientId] : undefined) ??
    (payload.receiverId ? [payload.receiverId] : undefined) ??
    (payload.toUserId ? [payload.toUserId] : undefined) ??
    []

  return sendNormalMessage(recipientIds, payload.content)
}

/**
 * Real backend call: GET /api/message/unread-count
 *
 * Do not return 0 on request/permission failure.
 */
export async function getUnreadMessageCount(): Promise<number> {
  const response = await get('/api/message/unread-count')
  const data = unwrapData<unknown>(response)
  const count = Number(data)
  return Number.isFinite(count) ? count : 0
}

/**
 * Real backend call: GET /api/message/{messageId}
 */
export async function getMessageDetail(messageId: string | number): Promise<MessageEntity> {
  const id = String(messageId).trim()
  if (!id) throw new Error('Message ID is required.')

  const response = await get(`/api/message/${encodeURIComponent(id)}`)
  const data = unwrapData<AnyRecord>(response)
  return normalizeMessage(data)
}

/**
 * Backend marks message read by reading detail in current OpenAPI.
 */
export async function markMessageRead(messageId: string | number): Promise<MessageEntity> {
  return getMessageDetail(messageId)
}

export async function replyMessage(original: MessageEntity | string | number, content: string): Promise<unknown> {
  const target =
    typeof original === 'object'
      ? original.senderId ?? original.fromUserId ?? original.from
      : String(original)

  if (!target) {
    throw new Error('Cannot determine message sender to reply to.')
  }

  return sendNormalMessage(target, content)
}

/**
 * Replaces the old mock/stub `return []`.
 *
 * Current OpenAPI has no single "available receivers" endpoint, so this function aggregates
 * real receiver sources that are present in OpenAPI. If none of those backend calls is
 * available for the current role, it throws instead of returning fake data.
 */
export async function getAvailableReceivers(keyword = ''): Promise<AvailableReceiver[]> {
  const role = getCurrentRole()
  const userId = getCurrentUserId()
  const q = keyword.trim()
  const tasks: Array<() => Promise<AvailableReceiver[]>> = []

  if (role === 'student') {
    tasks.push(async () => {
      const response = await get('/api/mentoring/student/my-mentor')
      const data = unwrapData<AnyRecord>(response)
      const row = normalizeReceiver(data, 'mentor')
      return row ? [row] : []
    })
  }

  if (role === 'mentor') {
    tasks.push(() => tryGetArray('/api/mentoring/records/students/search', { keyword: q }, 'student'))
    tasks.push(() => tryGetArray('/api/org/students/search', { keyword: q }, 'student'))
  }

  if (role === 'coordinator') {
    tasks.push(() => tryGetArray('/api/org/my-dept/mentors', { keyword: q }, 'mentor'))
    tasks.push(() => tryGetArray('/api/org/students/search', { keyword: q }, 'student'))
  }

  if (role === 'consultant') {
    tasks.push(() => tryGetArray('/api/org/mentors/search', { keyword: q }, 'mentor'))
    tasks.push(() => tryGetArray('/api/org/students/search', { keyword: q }, 'student'))
    tasks.push(() => tryGetArray('/api/user/admin/faculty-consultants', undefined, 'consultant'))
  }

  if (role === 'admin') {
    tasks.push(() => tryGetArray('/api/user/admin/faculty-consultants', undefined, 'consultant'))
    tasks.push(() => tryGetArray('/api/user/admin/supporting-staff', undefined, 'support'))
    tasks.push(() => tryGetArray('/api/user/students/all', undefined, 'student'))
  }

  if (role === 'support') {
    tasks.push(() => tryGetArray('/api/user/admin/supporting-staff', undefined, 'support'))
  }

  // Generic fallback using documented search endpoints.
  tasks.push(() => tryGetArray('/api/org/mentors/search', { keyword: q }, 'mentor'))
  tasks.push(() => tryGetArray('/api/org/students/search', { keyword: q }, 'student'))

  if (userId) {
    tasks.push(async () => {
      const response = await get(`/api/org/my-dept/member/${encodeURIComponent(userId)}`)
      const data = unwrapData<AnyRecord>(response)
      const row = normalizeReceiver(data)
      return row ? [row] : []
    })
  }

  const results: AvailableReceiver[] = []
  const errors: unknown[] = []

  for (const task of tasks) {
    try {
      results.push(...await task())
    } catch (error) {
      errors.push(error)
    }
  }

  const receivers = uniqueReceivers(results)

  if (!receivers.length && errors.length === tasks.length) {
    throw new Error('Failed to load receivers from backend. No mock receiver list is used.')
  }

  return receivers
}

export const listMessages = listMyMessages
export const getMessages = listMyMessages
export const sendNormalMsg = sendNormalMessage
export const sendNormalCommunication = sendNormalMessage
export const unreadCount = getUnreadMessageCount
