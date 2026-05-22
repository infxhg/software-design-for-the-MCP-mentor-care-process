/**
 * src/api/communication.ts
 *
 * Normal message API wrapper.
 *
 * Uses existing backend endpoints only:
 * - GET  /api/message/list
 * - POST /api/message/send
 * - GET  /api/message/unread-count
 * - GET  /api/message/{messageId}
 */

import { get, post, unwrap } from './request'

export interface MessageEntity {
  id: string
  messageId: string
  senderId?: string
  senderName?: string
  recipientIds?: string[]
  content: string
  createTime?: string
  timestamp?: string
  read?: boolean
  raw?: any
  [key: string]: any
}

export interface SendMessagePayload {
  recipientIds: string[]
  content: string
  [key: string]: any
}

function normalizeMessage(raw: any): MessageEntity {
  const id = String(raw?.id ?? raw?.messageId ?? '')

  const recipientIds = Array.isArray(raw?.recipientIds)
    ? raw.recipientIds.map((item: any) => String(item))
    : Array.isArray(raw?.receiverIds)
      ? raw.receiverIds.map((item: any) => String(item))
      : raw?.recipientId
        ? [String(raw.recipientId)]
        : raw?.receiverId
          ? [String(raw.receiverId)]
          : raw?.toUserId
            ? [String(raw.toUserId)]
            : undefined

  return {
    ...raw,
    id,
    messageId: id,
    senderId: raw?.senderId ?? raw?.fromUserId ?? raw?.from,
    senderName:
      raw?.senderName ??
      raw?.senderUsername ??
      raw?.fromUsername ??
      raw?.fromUserName ??
      raw?.sender ??
      raw?.senderId ??
      '',
    recipientIds,
    content: raw?.content ?? '',
    createTime: raw?.createTime ?? raw?.createdAt ?? raw?.timestamp,
    timestamp: raw?.timestamp ?? raw?.createTime ?? raw?.createdAt,
    read: raw?.read,
    raw,
  }
}

function normalizeReceiverIds(recipientIds: string[]): string[] {
  return Array.from(
    new Set(
      recipientIds
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  )
}

function isPermissionError(error: unknown): boolean {
  const text = String((error as any)?.message || error || '')
  return /permission|forbidden|unauthorized|403|access/i.test(text)
}

/**
 * Load visible messages.
 *
 * Some backend builds only allow Mentor to call /api/message/list.
 * To keep Student / Coordinator / Consultant pages usable without backend changes,
 * permission errors are treated as empty history instead of crashing the page.
 */
export async function listMyMessages(): Promise<MessageEntity[]> {
  try {
    const res = await get<any[]>('/api/message/list')
    return (unwrap(res) || []).map(normalizeMessage)
  } catch (error) {
    if (isPermissionError(error)) return []
    throw error
  }
}

export const listMessages = listMyMessages

/**
 * Send one normal text message to one or more users.
 */
export async function sendNormalMessage(
  recipientIds: string[],
  content: string,
): Promise<any> {
  const normalizedRecipientIds = normalizeReceiverIds(recipientIds)
  const normalizedContent = content.trim()

  if (!normalizedRecipientIds.length) {
    throw new Error('Please enter at least one receiver ID.')
  }

  if (!normalizedContent) {
    throw new Error('Please enter message content.')
  }

  const res = await post<any>('/api/message/send', {
    recipientIds: normalizedRecipientIds,
    content: normalizedContent,
  })

  return unwrap(res)
}

export async function sendMessage(payload: SendMessagePayload): Promise<any> {
  return sendNormalMessage(payload.recipientIds || [], payload.content || '')
}

/**
 * Load unread count.
 *
 * Same as message list: permission errors become 0, so non-mentor roles can still
 * open the page and send messages.
 */
export async function getUnreadMessageCount(): Promise<number> {
  try {
    const res = await get<number>('/api/message/unread-count')
    return Number(unwrap(res) || 0)
  } catch (error) {
    if (isPermissionError(error)) return 0
    throw error
  }
}

/**
 * Get message detail.
 * Calling this endpoint marks the message as read on the backend.
 */
export async function getMessageDetail(messageId: string | number): Promise<MessageEntity> {
  if (!messageId) throw new Error('messageId is required')

  const res = await get<any>(`/api/message/${encodeURIComponent(String(messageId))}`)
  return normalizeMessage(unwrap(res))
}

export async function markMessageRead(messageId: string | number): Promise<void> {
  await getMessageDetail(messageId)
}

/**
 * No dedicated reply endpoint is needed. Reuse normal sending.
 */
export async function replyMessage(
  messageId: string | number,
  recipientIds: string[],
  content: string,
): Promise<any> {
  if (!messageId) throw new Error('messageId is required')
  return sendNormalMessage(recipientIds, content)
}

/**
 * Compatibility function for older pages.
 * No receiver-list endpoint is required for the current UI.
 */
export async function getAvailableReceivers(_scene?: string): Promise<any[]> {
  return []
}

export const listAvailableReceivers = getAvailableReceivers
