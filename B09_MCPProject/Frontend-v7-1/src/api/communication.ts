import { getMyDeptMember } from './org'
import { getUserInfoByIdApi } from './user'
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
  senderRole?: string
  receiverName?: string
  recipientRole?: string
  recipientDisplayName?: string
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

export interface OutgoingRecipientRecord {
  messageId?: string
  content: string
  sentAt: number
  recipientId: string
  recipientName: string
  recipientRole?: string
  recipientUsername?: string
}

const OUTGOING_RECIPIENT_STORAGE_KEY = 'mcs_outgoing_message_recipients'
const OUTGOING_RECIPIENT_MAX = 300
const OUTGOING_MATCH_WINDOW_MS = 10 * 60 * 1000

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

  const sysUserId = String(raw.id ?? raw.userId ?? raw.accountId ?? '').trim()
  const roleAlias = String(
      raw.mentorId ??
      raw.studentId ??
      raw.consultantId ??
      raw.coordinatorId ??
      '',
  ).trim()
  const loginName = String(raw.username ?? raw.account ?? '').trim()
  const id = sysUserId || roleAlias || loginName

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
    userId: sysUserId || id,
    username: loginName || roleAlias || id,
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

function looksLikeSysUserId(value: string): boolean {
  const id = value.trim()
  if (!id) return false
  if (/^[0-9a-f]{32}$/i.test(id)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true
  return id.length >= 20 && !id.includes('_') && /^[0-9a-f]+$/i.test(id)
}

function extractSysUserIdFromPayload(payload: AnyRecord): string {
  const user = payload?.user ?? payload?.userInfo ?? payload
  return String(user?.id ?? user?.userId ?? payload?.id ?? payload?.userId ?? '').trim()
}

function collectReceiverAliases(receiver: AvailableReceiver): string[] {
  const keys = new Set<string>()
  for (const value of [
    receiver.id,
    receiver.userId,
    receiver.username,
    receiver.name,
    receiver.realName,
    receiver.raw?.id,
    receiver.raw?.userId,
    receiver.raw?.mentorId,
    receiver.raw?.studentId,
    receiver.raw?.consultantId,
    receiver.raw?.coordinatorId,
    receiver.raw?.username,
  ]) {
    const text = String(value ?? '').trim()
    if (text) keys.add(text)
  }
  return [...keys]
}

async function resolveMessageRecipientId(
    lookupKey: string,
    receiver?: AvailableReceiver,
): Promise<string> {
  const key = String(lookupKey).trim()
  if (!key) return ''

  if (receiver?.userId && looksLikeSysUserId(receiver.userId)) {
    return receiver.userId
  }
  if (looksLikeSysUserId(key)) return key

  if (getCurrentRole() === 'coordinator') {
    try {
      const member = await getMyDeptMember(key)
      const sysId = extractSysUserIdFromPayload(member as AnyRecord)
      if (sysId) return sysId
    } catch {
      // continue
    }
  }

  try {
    const info = await getUserInfoByIdApi(key)
    const sysId = extractSysUserIdFromPayload(info as AnyRecord)
    if (sysId) return sysId
  } catch {
    // continue
  }

  try {
    const internal = unwrap(await get<AnyRecord>('/internal/userInfo', { userId: key }))
    const sysId = extractSysUserIdFromPayload(internal as AnyRecord)
    if (sysId) return sysId
  } catch {
    // fall through
  }

  return receiver?.userId || receiver?.id || key
}

async function enrichReceiversWithSysUserId(
    receivers: AvailableReceiver[],
): Promise<AvailableReceiver[]> {
  const enriched = await Promise.all(
      receivers.map(async (receiver) => {
        const lookupKey = String(
            receiver.userId ||
            receiver.id ||
            receiver.username ||
            receiver.raw?.mentorId ||
            receiver.raw?.studentId ||
            receiver.raw?.consultantId ||
            receiver.raw?.coordinatorId ||
            '',
        ).trim()
        if (!lookupKey) return receiver

        const sysId = await resolveMessageRecipientId(lookupKey, receiver)
        if (!sysId || !looksLikeSysUserId(sysId)) return receiver

        return {
          ...receiver,
          id: sysId,
          userId: sysId,
          username: receiver.username || lookupKey,
          raw: { ...receiver.raw, id: sysId, resolvedFrom: lookupKey },
        }
      }),
  )
  return uniqueReceivers(enriched)
}

async function resolveRecipientIdsForSend(
    ids: string[],
    availableReceivers?: AvailableReceiver[],
): Promise<string[]> {
  const aliasMap = new Map<string, AvailableReceiver>()
  for (const receiver of availableReceivers || []) {
    for (const alias of collectReceiverAliases(receiver)) {
      aliasMap.set(alias, receiver)
    }
  }

  const resolved: string[] = []
  for (const rawId of ids) {
    const trimmed = String(rawId).trim()
    if (!trimmed) continue
    const sysId = await resolveMessageRecipientId(trimmed, aliasMap.get(trimmed))
    if (sysId) resolved.push(sysId)
  }
  return Array.from(new Set(resolved))
}

function inferRoleFromLogin(id: string): string {
  const value = String(id).toLowerCase()
  if (value.includes('coord')) return 'coordinator'
  if (value.includes('mentor')) return 'mentor'
  if (value.includes('stu')) return 'student'
  if (value.includes('faculty') || value.includes('consultant') || value.startsWith('fc_')) {
    return 'consultant'
  }
  return ''
}

function filterReceiversByKeyword(
    receivers: AvailableReceiver[] | unknown,
    keyword: string,
): AvailableReceiver[] {
  const list = Array.isArray(receivers) ? receivers : []
  const q = keyword.trim()
  if (!q) return list

  return list.filter((receiver) => {
    return (
        textIncludes(receiver.id, q) ||
        textIncludes(receiver.userId, q) ||
        textIncludes(receiver.username, q) ||
        textIncludes(receiver.realName, q) ||
        textIncludes(receiver.name, q) ||
        textIncludes(receiver.email, q)
    )
  })
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
    role: normalizeRole(
        raw.senderRole ??
        raw.fromRole ??
        raw.role ??
        (inferRoleFromLogin(id) || 'consultant'),
    ),
    type: normalizeRole(
        raw.senderRole ??
        raw.fromRole ??
        raw.role ??
        (inferRoleFromLogin(id) || 'consultant'),
    ),
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

  const messages = await fetchMessageListRaw()
  const candidates: AvailableReceiver[] = []
  const currentUserId = getCurrentUserId().toLowerCase()
  const currentUsername = String(
      getStoredUserInfo().username ?? localStorage.getItem('username') ?? '',
  )
      .trim()
      .toLowerCase()

  for (const msg of messages) {
    const sender = messageSenderToReceiver(msg)
    const receiver = messageReceiverToReceiver(msg)
    const raw = msg.raw || {}

    for (const item of [sender, receiver]) {
      if (!item) continue

      const isSelf =
          (currentUserId &&
              (item.id.toLowerCase() === currentUserId ||
                  item.userId.toLowerCase() === currentUserId)) ||
          (currentUsername &&
              (item.username?.toLowerCase() === currentUsername ||
                  item.id.toLowerCase() === currentUsername))

      if (isSelf) continue

      const displayName = String(
          msg.senderName ??
          msg.receiverName ??
          raw.senderName ??
          raw.receiverName ??
          raw.fromUserName ??
          raw.recipientName ??
          '',
      )

      const matched =
          textIncludes(item.id, q) ||
          textIncludes(item.userId, q) ||
          textIncludes(item.username, q) ||
          textIncludes(item.realName, q) ||
          textIncludes(item.name, q) ||
          textIncludes(item.email, q) ||
          textIncludes(displayName, q)

      if (matched) {
        candidates.push({
          ...item,
          username: item.username || displayName || item.id,
          name: item.name || displayName || item.id,
        })
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

async function getCoordinatorScopeReceivers(keyword: string): Promise<AvailableReceiver[]> {
  const response = await get(
      '/api/org/my-scope/search',
      keyword.trim() ? { keyword: keyword.trim() } : undefined,
  )
  const data = unwrapData<AnyRecord>(response)

  const mentors = Array.isArray(data?.mentors) ? data.mentors : []
  const students = Array.isArray(data?.students) ? data.students : []
  const facultyConsultants = Array.isArray(data?.facultyConsultants)
      ? data.facultyConsultants
      : []

  const receivers = uniqueReceivers([
    ...mentors.map((row) => normalizeReceiver(row, 'mentor')),
    ...students.map((row) => normalizeReceiver(row, 'student')),
    ...facultyConsultants.map((row) => normalizeReceiver(row, 'consultant')),
  ])

  return filterReceiversByKeyword(receivers, keyword)
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
    // Updated API: one scoped endpoint for coordinator to search mentors, students and FCs.
    getCoordinatorScopeReceivers(keyword),

    // Backward-compatible fallbacks for older backend builds.
    tryGetArray('/api/org/my-dept/mentors', params, 'mentor'),
    tryGetArray('/api/org/students/org_dcs', params, 'student'),
    getCoordinatorFacultyReceivers(keyword),

    // 关键兜底：从历史消息里找 test_faculty_01 / test_faculty_02
    getHistoryReceivers(keyword),
  ]

  const settled = await Promise.allSettled(tasks)

  for (const item of settled) {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
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
    tryGetArray('/api/org/mentors/search', params, 'mentor'),
    tryGetArray('/api/user/coordinators', params, 'coordinator'),
    tryGetArray('/api/org/coordinators', params, 'coordinator'),
    getHistoryReceivers(keyword),
  ]

  const settled = await Promise.allSettled(tasks)

  for (const item of settled) {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
      result.push(...item.value)
    }
  }

  return uniqueReceivers(result)
}

function loadOutgoingRecipientRecords(): OutgoingRecipientRecord[] {
  try {
    const raw = localStorage.getItem(OUTGOING_RECIPIENT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveOutgoingRecipientRecords(records: OutgoingRecipientRecord[]): void {
  localStorage.setItem(
      OUTGOING_RECIPIENT_STORAGE_KEY,
      JSON.stringify(records.slice(-OUTGOING_RECIPIENT_MAX)),
  )
}

function messageTimestamp(msg: MessageEntity): number {
  const raw = msg.createTime || msg.createdAt || msg.timestamp
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

function isMessageFromCurrentUser(msg: MessageEntity): boolean {
  const info = getStoredUserInfo()
  const senderValues = [
    msg.senderId,
    msg.fromUserId,
    msg.from,
    msg.senderName,
    msg.raw?.senderId,
    msg.raw?.fromUserId,
    msg.raw?.from,
  ]
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)

  const currentValues = [
    getCurrentUserId(),
    info.user?.id,
    info.user?.userId,
    info.userId,
    info.id,
    info.username,
    info.user?.username,
    localStorage.getItem('userId'),
    localStorage.getItem('username'),
  ]
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)

  return currentValues.some((value) => senderValues.includes(value))
}

function applyOutgoingRecipientRecord(
    msg: MessageEntity,
    record: OutgoingRecipientRecord,
): MessageEntity {
  const displayName =
      record.recipientName ||
      record.recipientUsername ||
      record.recipientId

  return {
    ...msg,
    recipientId: record.recipientId,
    receiverId: record.recipientId,
    toUserId: record.recipientId,
    recipientIds: [record.recipientId],
    receiverIds: [record.recipientId],
    receiverName: displayName,
    recipientDisplayName: displayName,
    recipientRole:
        record.recipientRole ||
        inferRoleFromLogin(record.recipientUsername || record.recipientId),
    raw: {
      ...msg.raw,
      recipientId: record.recipientId,
      recipientName: displayName,
      recipientRole: record.recipientRole,
      recipientUsername: record.recipientUsername,
      recipientDisplayName: displayName,
    },
  }
}

function attachOutgoingRecipients(messages: MessageEntity[]): MessageEntity[] {
  const records = loadOutgoingRecipientRecords()
  const usedIndexes = new Set<number>()
  let recordsChanged = false

  const enriched = messages.map((msg) => {
    if (!isMessageFromCurrentUser(msg)) return msg

    const existingName = String(
        msg.recipientDisplayName || msg.receiverName || msg.raw?.recipientName || '',
    ).trim()

    if (existingName && !/^[0-9a-f-]{20,}$/i.test(existingName)) {
      return {
        ...msg,
        recipientDisplayName: existingName,
        recipientRole: msg.recipientRole || msg.raw?.recipientRole || inferRoleFromLogin(existingName),
      }
    }

    let matchedIndex = records.findIndex(
        (record, index) => record.messageId && record.messageId === msg.id && !usedIndexes.has(index),
    )

    if (matchedIndex < 0) {
      const msgTime = messageTimestamp(msg)
      const content = String(msg.content || msg.message || '').trim()

      matchedIndex = records.findIndex((record, index) => {
        if (usedIndexes.has(index) || record.messageId) return false
        if (record.content.trim() !== content) return false
        return Math.abs(msgTime - record.sentAt) <= OUTGOING_MATCH_WINDOW_MS
      })
    }

    if (matchedIndex < 0) return msg

    usedIndexes.add(matchedIndex)
    const record = records[matchedIndex]
    if (!record) return msg

    if (!record.messageId && msg.id) {
      record.messageId = msg.id
      recordsChanged = true
    }

    return applyOutgoingRecipientRecord(msg, record)
  })

  if (recordsChanged) {
    saveOutgoingRecipientRecords(records)
  }

  return enriched
}

async function resolveIncomingSenderLabels(messages: MessageEntity[]): Promise<MessageEntity[]> {
  const nameCache = new Map<string, { display: string; role: string }>()
  const pendingKeys = new Set<string>()

  for (const msg of messages) {
    if (isMessageFromCurrentUser(msg)) continue

    const senderKey = String(msg.senderId ?? msg.fromUserId ?? msg.from ?? '').trim()
    const currentLabel = String(
        msg.senderName || msg.raw?.senderName || msg.raw?.fromUserName || '',
    ).trim()

    if (!senderKey || (currentLabel && currentLabel !== senderKey)) continue
    if (!nameCache.has(senderKey) && !pendingKeys.has(senderKey)) {
      pendingKeys.add(senderKey)
    }
  }

  await Promise.all(
      [...pendingKeys].map(async (senderKey) => {
        try {
          const info = await getUserInfoByIdApi(senderKey)
          const user = (info as AnyRecord)?.user ?? info
          const display = String(
              user?.username ??
              user?.realName ??
              user?.name ??
              user?.account ??
              senderKey,
          ).trim()
          nameCache.set(senderKey, {
            display,
            role: normalizeRole(user?.role ?? user?.roleCode ?? inferRoleFromLogin(display)),
          })
        } catch {
          nameCache.set(senderKey, {
            display: senderKey,
            role: inferRoleFromLogin(senderKey),
          })
        }
      }),
  )

  return messages.map((msg) => {
    if (isMessageFromCurrentUser(msg)) return msg

    const senderKey = String(msg.senderId ?? msg.fromUserId ?? msg.from ?? '').trim()
    const currentLabel = String(
        msg.senderName || msg.raw?.senderName || msg.raw?.fromUserName || '',
    ).trim()

    if (currentLabel && currentLabel !== senderKey) {
      return {
        ...msg,
        senderRole: msg.senderRole || msg.raw?.senderRole || inferRoleFromLogin(currentLabel),
      }
    }

    const cached = nameCache.get(senderKey)
    if (!cached) return msg

    return {
      ...msg,
      senderName: cached.display,
      senderRole: cached.role,
      raw: { ...msg.raw, senderName: cached.display, senderRole: cached.role },
    }
  })
}

export function recordOutgoingMessageRecipient(input: {
  content: string
  recipientId: string
  recipientName?: string
  recipientRole?: string
  recipientUsername?: string
  messageId?: string
}): void {
  const content = String(input.content ?? '').trim()
  const recipientId = String(input.recipientId ?? '').trim()
  if (!content || !recipientId) return

  const records = loadOutgoingRecipientRecords()
  records.push({
    messageId: input.messageId ? String(input.messageId) : undefined,
    content,
    sentAt: Date.now(),
    recipientId,
    recipientName:
        String(input.recipientName ?? input.recipientUsername ?? recipientId).trim() ||
        recipientId,
    recipientRole: input.recipientRole ? normalizeRole(input.recipientRole) : undefined,
    recipientUsername: input.recipientUsername
        ? String(input.recipientUsername).trim()
        : undefined,
  })
  saveOutgoingRecipientRecords(records)
}

export async function enrichMessageHistory(messages: MessageEntity[]): Promise<MessageEntity[]> {
  return resolveIncomingSenderLabels(attachOutgoingRecipients(messages))
}

async function fetchMessageListRaw(): Promise<MessageEntity[]> {
  const response = await get('/api/message/list')
  const data = unwrapData<unknown>(response)
  return asArray(data).map(normalizeMessage)
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

  const allowedIds = new Set<string>()
  for (const receiver of availableReceivers) {
    for (const alias of collectReceiverAliases(receiver)) {
      allowedIds.add(alias)
    }
  }
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
  const messages = await fetchMessageListRaw()
  return enrichMessageHistory(messages)
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
  receivers = await enrichReceiversWithSysUserId(await getStudentMentorReceiver())
} else if (role === 'mentor') {
  const q = keyword.trim()
  const students = q ? await getMentorStudentReceivers(q) : []
  const history = await getHistoryReceivers(q)

  receivers = uniqueReceivers([
    ...students,
    ...history.filter((row) => {
      const recipientRole = normalizeRole(row.role)
      return (
          recipientRole === 'coordinator' ||
          recipientRole === 'consultant' ||
          recipientRole === 'student'
      )
    }),
  ])
  receivers = await enrichReceiversWithSysUserId(receivers)
} else if (role === 'coordinator') {
  receivers = await enrichReceiversWithSysUserId(await getCoordinatorReceivers(keyword))
} else if (role === 'consultant') {
  receivers = await enrichReceiversWithSysUserId(await getConsultantReceivers(keyword))
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

  const resolvedRecipientIds = await resolveRecipientIdsForSend(
      cleanedIds,
      availableReceivers,
  )

  if (resolvedRecipientIds.length === 0) {
    throw new Error(
        'Could not resolve recipient user id. Search again or pick a contact from message history.',
    )
  }

  const response = await post('/api/message/send', {
    recipientIds: resolvedRecipientIds,
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

  const resolvedTarget = await resolveMessageRecipientId(String(target))
  return sendNormalMessage(resolvedTarget, content)
}

export const listMessages = listMyMessages
export const getMessages = listMyMessages
export const sendNormalMsg = sendNormalMessage
export const sendNormalCommunication = sendNormalMessage
export const unreadCount = getUnreadMessageCount
