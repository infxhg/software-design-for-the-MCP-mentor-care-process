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
  const obj = response as any

  if (obj && typeof obj === 'object' && 'code' in obj && 'data' in obj) {
    return unwrap(obj) as T
  }

  return response as T
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
  if (Array.isArray(obj.mentors)) return obj.mentors
  if (Array.isArray(obj.mentorList)) return obj.mentorList
  if (Array.isArray(obj.mentorInfoList)) return obj.mentorInfoList

  return []
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
    raw: AnyRecord | string,
    fallbackRole?: RecipientType | string,
): AvailableReceiver | null {
  if (typeof raw === 'string') {
    const id = raw.trim()
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
      raw.account ??
      raw.mentorId ??
      raw.mentorUserId ??
      raw.mentorUsername ??
      raw.studentId ??
      raw.consultantId ??
      raw.coordinatorId ??
      '',
  ).trim()

  if (!id) return null

  const role = normalizeRecipientType(raw.role ?? raw.userRole ?? raw.type ?? fallbackRole)

  return {
    id,
    userId: id,
    username: raw.username ?? raw.account ?? raw.mentorUsername,
    realName: raw.realName ?? raw.name ?? raw.mentorName ?? raw.studentName,
    name:
        raw.name ??
        raw.realName ??
        raw.mentorName ??
        raw.studentName ??
        raw.username ??
        raw.account ??
        raw.mentorUsername ??
        id,
    role,
    type: role,
    email: raw.email ?? raw.mentorEmail,
    phone: raw.phone ?? raw.mentorPhone,
    departmentName: raw.departmentName ?? raw.department,
    raw,
  }
}

function normalizeFlatMentor(raw: AnyRecord): AnyRecord | null {
  const mentorId = raw.mentorId ?? raw.mentorUserId ?? raw.mentorUsername
  const mentorName = raw.mentorName ?? raw.mentorRealName
  const mentorEmail = raw.mentorEmail
  const mentorPhone = raw.mentorPhone

  if (!mentorId && !mentorName && !mentorEmail && !mentorPhone) return null

  return {
    id: mentorId ?? raw.username ?? raw.id,
    userId: mentorId ?? raw.username ?? raw.id,
    username: raw.mentorUsername ?? mentorId,
    realName: mentorName,
    name: mentorName ?? raw.mentorUsername ?? mentorId,
    email: mentorEmail,
    phone: mentorPhone,
    departmentName: raw.departmentName ?? raw.department,
    role: 'mentor',
    type: 'mentor',
  }
}

function findMentorPayload(value: unknown, keyHint = '', depth = 0): AnyRecord | null {
  if (depth > 5) return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMentorPayload(item, keyHint, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = value as AnyRecord | null | undefined
  if (!obj || typeof obj !== 'object') return null

  const flatMentor = normalizeFlatMentor(obj)
  if (flatMentor) return flatMentor

  const hint = keyHint.toLowerCase()
  const role = normalizeRecipientType(obj.role ?? obj.userRole ?? obj.type)

  if (
      role === 'mentor' ||
      obj.mentorId ||
      obj.mentorName ||
      obj.mentorUsername ||
      hint.includes('mentor')
  ) {
    const possible = normalizeReceiver(obj, 'mentor')
    if (possible) return obj
  }

  const directKeys = [
    'mentor',
    'mentorInfo',
    'assignedMentor',
    'myMentor',
    'currentMentor',
    'mentorUser',
    'mentorDTO',
    'mentorVO',
    'teacher',
  ]

  for (const key of directKeys) {
    if (obj[key]) {
      const found = findMentorPayload(obj[key], key, depth + 1)
      if (found) return found
    }
  }

  const arrayKeys = [
    'mentors',
    'mentorList',
    'mentorInfoList',
    'mentorInfos',
    'teachers',
    'list',
    'records',
    'items',
    'content',
  ]

  for (const key of arrayKeys) {
    if (obj[key]) {
      const found = findMentorPayload(obj[key], key, depth + 1)
      if (found) return found
    }
  }

  for (const [key, child] of Object.entries(obj)) {
    if (typeof child === 'object' && child !== null) {
      const found = findMentorPayload(child, key, depth + 1)
      if (found) return found
    }
  }

  return null
}

async function getStudentMentorReceiver(): Promise<AvailableReceiver[]> {
  const endpoints = [
    '/api/mentoring/student/my-mentor',
    '/api/mentoring/student/mentor',
    '/api/mentoring/student/mentor-info',
    '/api/mentoring/student/my-mentor-info',
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await get(endpoint)
      const data = unwrapData<unknown>(response)
      const mentorPayload = findMentorPayload(data)

      if (!mentorPayload) continue

      const receiver = normalizeReceiver(mentorPayload, 'mentor')

      if (receiver) {
        return [
          {
            ...receiver,
            role: 'mentor',
            type: 'mentor',
          },
        ]
      }
    } catch {
      // Try next possible endpoint.
    }
  }

  return []
}

function uniqueReceivers(rows: Array<AvailableReceiver | null>): AvailableReceiver[] {
  const map = new Map<string, AvailableReceiver>()

  for (const row of rows) {
    if (!row?.id) continue
    if (!map.has(row.id)) map.set(row.id, row)
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
      .filter(Boolean) as AvailableReceiver[]
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

function getCurrentRole(): string {
  return normalizeFrontendRole(localStorage.getItem('role') || '')
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

export async function listMyMessages(): Promise<MessageEntity[]> {
  const response = await get('/api/message/list')
  const data = unwrapData<unknown>(response)

  return asArray(data).map(normalizeMessage)
}

export async function getAvailableReceivers(keyword = ''): Promise<AvailableReceiver[]> {
  const role = getCurrentRole()
  const q = keyword.trim()

  if (role === 'student') {
    return getStudentMentorReceiver()
  }

  if (role === 'admin' || role === 'support' || role === 'unknown' || !role) {
    return []
  }

  const tasks: Array<() => Promise<AvailableReceiver[]>> = []

  if (role === 'mentor') {
    tasks.push(() =>
        tryGetArray('/api/mentoring/records/students/search', buildKeywordParams(q), 'student'),
    )
    tasks.push(() => tryGetArray('/api/org/students/search', buildKeywordParams(q), 'student'))
  }

  if (role === 'coordinator') {
    tasks.push(() => tryGetArray('/api/org/my-dept/mentors', buildKeywordParams(q), 'mentor'))
    tasks.push(() => tryGetArray('/api/org/students/search', buildKeywordParams(q), 'student'))
    tasks.push(() => tryGetArray('/api/user/admin/faculty-consultants', undefined, 'consultant'))
  }

  if (role === 'consultant') {
    tasks.push(() => tryGetArray('/api/org/students/search', buildKeywordParams(q), 'student'))
    tasks.push(() => tryGetArray('/api/org/coordinators/search', buildKeywordParams(q), 'coordinator'))
    tasks.push(() => tryGetArray('/api/user/coordinators', buildKeywordParams(q), 'coordinator'))
  }

  const results: AvailableReceiver[] = []
  const errors: unknown[] = []

  for (const task of tasks) {
    try {
      results.push(...(await task()))
    } catch (error) {
      errors.push(error)
    }
  }

  const currentUserId = getCurrentUserId()

  const receivers = uniqueReceivers(results).filter(
      (receiver) => receiver.id !== currentUserId && receiver.userId !== currentUserId,
  )

  if (!receivers.length && tasks.length > 0 && errors.length === tasks.length) {
    throw new Error('Failed to load available receivers from backend.')
  }

  return receivers
}

export async function sendNormalMessage(
    recipientIds: string | string[],
    content: string,
    availableReceivers?: AvailableReceiver[],
): Promise<unknown> {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds]

  const cleanedIds = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)))

  const trimmedContent = content.trim()

  const receivers = availableReceivers ?? (await getAvailableReceivers(''))
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

export async function getUnreadMessageCount(): Promise<number> {
  const response = await get('/api/message/unread-count')
  const data = unwrapData<unknown>(response)
  const count = Number(data)

  return Number.isFinite(count) ? count : 0
}

export async function getMessageDetail(messageId: string | number): Promise<MessageEntity> {
  const id = String(messageId).trim()

  if (!id) {
    throw new Error('Message ID is required.')
  }

  const response = await get(`/api/message/${encodeURIComponent(id)}`)
  const data = unwrapData<AnyRecord>(response)

  return normalizeMessage(data)
}

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
