import { get, post, unwrap } from './request'

type AnyRecord = Record<string, any>

export type RecipientType =
    | 'student'
    | 'mentor'
    | 'coordinator'
    | 'consultant'
    | 'faculty'
    | 'faculty_consultant'
    | 'support'
    | 'admin'
    | string

export interface MessageEntity {
  id: string
  messageId: string
  senderId?: string
  fromUserId?: string
  from?: string
  senderName?: string
  receiverName?: string
  recipientIds?: string[]
  receiverIds?: string[]
  recipientId?: string
  receiverId?: string
  toUserId?: string
  content: string
  message?: string
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
  role?: RecipientType
  type?: RecipientType
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
  if (Array.isArray(obj.rows)) return obj.rows
  if (Array.isArray(obj.result)) return obj.result

  return []
}

function normalizeRole(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase()

  if (!raw) return ''
  if (raw.includes('admin')) return 'admin'
  if (raw.includes('support')) return 'support'
  if (raw.includes('consultant') || raw.includes('faculty')) return 'consultant'
  if (raw.includes('coordinator') || raw.includes('mcp')) return 'coordinator'
  if (raw.includes('mentor')) return 'mentor'
  if (raw.includes('student') || raw === 'stu') return 'student'

  return raw
}

function getCurrentRole(): string {
  return normalizeRole(localStorage.getItem('role'))
}

function getStoredUserInfo(): AnyRecord {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

function getCurrentUserId(): string {
  const info = getStoredUserInfo()

  return String(
      info.user?.id ??
      info.user?.userId ??
      info.userId ??
      info.id ??
      info.username ??
      localStorage.getItem('userId') ??
      localStorage.getItem('username') ??
      '',
  ).trim()
}

function buildKeywordParams(keyword: string): AnyRecord {
  const q = keyword.trim()

  return {
    keyword: q,
    search: q,
    name: q,
    username: q,
    email: q,
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
    senderName: raw.senderName ?? raw.fromUserName ?? raw.fromName,
    receiverName: raw.receiverName ?? raw.recipientName ?? raw.toUserName ?? raw.toName,
    recipientIds,
    receiverIds: raw.receiverIds ?? recipientIds,
    recipientId: raw.recipientId ?? raw.receiverId ?? raw.toUserId,
    receiverId: raw.receiverId ?? raw.recipientId ?? raw.toUserId,
    toUserId: raw.toUserId ?? raw.recipientId ?? raw.receiverId,
    content: String(raw.content ?? raw.message ?? raw.text ?? ''),
    message: String(raw.message ?? raw.content ?? raw.text ?? ''),
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
    fallbackRole?: RecipientType,
): AvailableReceiver | null {
  if (typeof raw === 'string' || typeof raw === 'number') {
    const id = String(raw).trim()
    if (!id) return null

    return {
      id,
      userId: id,
      username: id,
      name: id,
      role: normalizeRole(fallbackRole),
      type: normalizeRole(fallbackRole),
      raw: { id },
    }
  }

  const id = String(
      raw.userId ??
      raw.id ??
      raw.accountId ??
      raw.username ??
      raw.account ??
      raw.email ??
      raw.studentId ??
      raw.mentorId ??
      raw.consultantId ??
      raw.coordinatorId ??
      '',
  ).trim()

  if (!id) return null

  const role = normalizeRole(
      raw.roleCode ??
      raw.role_code ??
      raw.type ??
      raw.role ??
      raw.userRole ??
      raw.roleName ??
      fallbackRole,
  )

  const name =
      raw.realName ??
      raw.name ??
      raw.userName ??
      raw.username ??
      raw.studentName ??
      raw.mentorName ??
      raw.consultantName ??
      raw.coordinatorName ??
      raw.email ??
      id

  return {
    id,
    userId: id,
    username: raw.username ?? raw.account ?? id,
    realName: raw.realName ?? raw.name ?? raw.userName,
    name,
    role: role || normalizeRole(fallbackRole),
    type: role || normalizeRole(fallbackRole),
    email: raw.email,
    phone: raw.phone,
    departmentName: raw.departmentName ?? raw.department ?? raw.deptName,
    raw,
  }
}

function textIncludes(value: unknown, keyword: string): boolean {
  const left = String(value ?? '').trim().toLowerCase()
  const right = keyword.trim().toLowerCase()

  if (!right) return true
  return Boolean(left && left.includes(right))
}

function messageSenderToReceiver(msg: MessageEntity): AvailableReceiver | null {
  const raw = msg.raw || {}

  const id = String(
      msg.senderId ??
      msg.fromUserId ??
      msg.from ??
      raw.senderId ??
      raw.fromUserId ??
      raw.from ??
      raw.senderUsername ??
      raw.fromUsername ??
      raw.senderName ??
      raw.fromUserName ??
      '',
  ).trim()

  if (!id) return null

  const name = String(
      msg.senderName ??
      raw.senderName ??
      raw.fromUserName ??
      raw.senderUsername ??
      raw.fromUsername ??
      id,
  ).trim()

  return {
    id,
    userId: id,
    username: String(raw.senderUsername ?? raw.fromUsername ?? id),
    realName: name,
    name,
    role: normalizeRole(raw.senderRole ?? raw.fromRole ?? raw.role ?? 'consultant'),
    type: normalizeRole(raw.senderRole ?? raw.fromRole ?? raw.role ?? 'consultant'),
    email: raw.senderEmail ?? raw.fromEmail,
    raw,
  }
}

function messageReceiverToReceiver(msg: MessageEntity): AvailableReceiver | null {
  const raw = msg.raw || {}

  const id = String(
      msg.receiverId ??
      msg.recipientId ??
      msg.toUserId ??
      raw.receiverId ??
      raw.recipientId ??
      raw.toUserId ??
      raw.receiverUsername ??
      raw.recipientUsername ??
      raw.receiverName ??
      raw.recipientName ??
      '',
  ).trim()

  if (!id) return null

  const name = String(
      msg.receiverName ??
      raw.receiverName ??
      raw.recipientName ??
      raw.toUserName ??
      raw.receiverUsername ??
      raw.recipientUsername ??
      id,
  ).trim()

  return {
    id,
    userId: id,
    username: String(raw.receiverUsername ?? raw.recipientUsername ?? id),
    realName: name,
    name,
    role: normalizeRole(raw.receiverRole ?? raw.recipientRole ?? raw.toRole ?? 'consultant'),
    type: normalizeRole(raw.receiverRole ?? raw.recipientRole ?? raw.toRole ?? 'consultant'),
    email: raw.receiverEmail ?? raw.recipientEmail ?? raw.toEmail,
    raw,
  }
}

async function getHistoryReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const q = keyword.trim()
  if (!q) return []

  const messages = await listMyMessages()
  const candidates: AvailableReceiver[] = []

  for (const msg of messages) {
    const sender = messageSenderToReceiver(msg)
    const receiver = messageReceiverToReceiver(msg)

    for (const item of [sender, receiver]) {
      if (!item) continue

      const matched =
          textIncludes(item.id, q) ||
          textIncludes(item.userId, q) ||
          textIncludes(item.username, q) ||
          textIncludes(item.realName, q) ||
          textIncludes(item.name, q) ||
          textIncludes(item.email, q)

      if (matched) {
        candidates.push(item)
      }
    }
  }

  return uniqueReceivers(candidates)
}

function uniqueReceivers(rows: Array<AvailableReceiver | null>): AvailableReceiver[] {
  const map = new Map<string, AvailableReceiver>()

  for (const row of rows) {
    if (!row?.id) continue

    const id = String(row.id).trim()
    if (!id) continue

    if (!map.has(id)) {
      map.set(id, {
        ...row,
        id,
        userId: row.userId || id,
      })
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
    fallbackRole?: RecipientType,
): Promise<AvailableReceiver[]> {
  const response = await get(path, params)
  const data = unwrapData<unknown>(response)

  const rows = asArray(data)

  if (rows.length > 0) {
    return rows
        .map((row) => normalizeReceiver(row, fallbackRole))
        .filter((row): row is AvailableReceiver => Boolean(row))
  }

  const single = normalizeReceiver(data as AnyRecord, fallbackRole)
  return single ? [single] : []
}

async function getFirstAvailableArray(
    calls: Array<() => Promise<AvailableReceiver[]>>,
): Promise<AvailableReceiver[]> {
  const result: AvailableReceiver[] = []

  for (const call of calls) {
    try {
      const rows = await call()
      result.push(...rows)
    } catch {
      // 尝试下一个兼容接口
    }
  }

  return uniqueReceivers(result)
}

async function getStudentMentorReceiver(): Promise<AvailableReceiver[]> {
  const response = await get('/api/mentoring/student/my-mentor')
  const data = unwrapData<AnyRecord>(response)

  const mentorData = data?.mentor ?? data?.mentors ?? data
  const rows = Array.isArray(mentorData) ? mentorData : [mentorData]

  return uniqueReceivers(
      rows
          .map((row) => normalizeReceiver(row, 'mentor'))
          .filter((row): row is AvailableReceiver => Boolean(row)),
  )
}

async function getMentorStudentReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const q = keyword.trim()
  if (!q) return []

  return getFirstAvailableArray([
    () =>
        tryGetArray(
            '/api/mentoring/records/students/search',
            {
              studentId: q,
              keyword: q,
              username: q,
              email: q,
            },
            'student',
        ),
    () => tryGetArray(`/api/org/student/${encodeURIComponent(q)}`, undefined, 'student'),
    () =>
        tryGetArray(
            '/api/org/students/search',
            {
              keyword: q,
              studentId: q,
              username: q,
              email: q,
            },
            'student',
        ),
  ])
}

async function getCoordinatorFacultyReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const baseParams = buildKeywordParams(keyword)

  const roleParamsList: AnyRecord[] = [
    { ...baseParams, role: 'consultant' },
    { ...baseParams, role: 'faculty' },
    { ...baseParams, role: 'faculty_consultant' },
    { ...baseParams, role: 'FACULTY' },
    { ...baseParams, role: 'FACULTY_CONSULTANT' },
  ]

  const calls: Array<() => Promise<AvailableReceiver[]>> = []

  for (const params of roleParamsList) {
    calls.push(
        () => tryGetArray('/api/communication/receivers', params, 'consultant'),
        () => tryGetArray('/api/message/receivers', params, 'consultant'),
        () => tryGetArray('/api/user/receivers', params, 'consultant'),
        () => tryGetArray('/api/users', params, 'consultant'),
    )
  }

  calls.push(
      () => tryGetArray('/api/user/faculty', baseParams, 'consultant'),
      () => tryGetArray('/api/user/faculties', baseParams, 'consultant'),
      () => tryGetArray('/api/user/consultants', baseParams, 'consultant'),
      () => tryGetArray('/api/admin/faculty', baseParams, 'consultant'),
      () => tryGetArray('/api/admin/consultants', baseParams, 'consultant'),
      () => tryGetArray('/api/org/faculty', baseParams, 'consultant'),
      () => tryGetArray('/api/org/faculties', baseParams, 'consultant'),
      () => tryGetArray('/api/org/consultants', baseParams, 'consultant'),
  )

  return getFirstAvailableArray(calls)
}

async function getCoordinatorReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const params = buildKeywordParams(keyword)
  const result: AvailableReceiver[] = []

  const tasks: Array<Promise<AvailableReceiver[]>> = [
    tryGetArray('/api/org/my-dept/mentors', params, 'mentor'),
    tryGetArray('/api/org/students/org_dcs', params, 'student'),
    getCoordinatorFacultyReceivers(keyword),

    // 关键兜底：从历史消息里找 test_faculty_01 / test_faculty_02
    getHistoryReceivers(keyword),
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
  const params = buildKeywordParams(keyword)
  const result: AvailableReceiver[] = []

  const tasks: Array<Promise<AvailableReceiver[]>> = [
    tryGetArray('/api/org/students/search', params, 'student'),
    tryGetArray('/api/user/coordinators', params, 'coordinator'),
    tryGetArray('/api/org/coordinators', params, 'coordinator'),

    // 同样兜底，方便 faculty consultant 搜历史里联系过的人
    getHistoryReceivers(keyword),
  ]

  const settled = await Promise.allSettled(tasks)

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      result.push(...item.value)
    }
  }

  return uniqueReceivers(result)
}

function validateReceiverPermission(
    role: string,
    ids: string[],
    content: string,
    availableReceivers?: AvailableReceiver[],
): string {
  if (!content.trim()) return 'Message content is required.'
  if (ids.length === 0) return 'Please select a recipient.'

  if (role === 'admin' || role === 'support') {
    return 'This role is not allowed to send messages.'
  }

  if (!availableReceivers || availableReceivers.length === 0) {
    return ''
  }

  const allowedIds = new Set(availableReceivers.map((receiver) => String(receiver.id)))
  const illegal = ids.find((id) => !allowedIds.has(String(id)))

  if (illegal) {
    return 'Selected recipient is not allowed for your current role.'
  }

  return ''
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
 * 按当前角色拉取允许沟通对象：
 * student -> 自己的 mentor
 * mentor -> 自己负责小组内的 student，按 studentId 查
 * coordinator -> 本系 mentor + 本系 student + faculty consultant + 历史消息联系人兜底
 * consultant -> student + coordinator + 历史消息联系人兜底
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
  if (currentUserId && String(receiver.id) === String(currentUserId)) return false
  return true
})
}

/**
 * POST /api/message/send
 *
 * 后端接口要求：
 * {
 *   recipientIds: ['xxx'],
 *   content: 'message content'
 * }
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
  const role = getCurrentRole()

  const validationMessage = validateReceiverPermission(
      role,
      cleanedIds,
      trimmedContent,
      availableReceivers,
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
 * 当前接口通过查看详情标记已读
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
