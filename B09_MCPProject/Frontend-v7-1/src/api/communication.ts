/**
 * src/api/communication.ts
 *
 * Message / communication APIs.
 */

import { get, post } from './request'

export interface MessageEntity {
  id: string
  messageId?: string
  senderId?: string
  senderName?: string
  recipientIds?: string[]
  content: string
  createTime?: string
  read?: boolean
  raw?: any
}

export interface SendMessagePayload {
  recipientIds: string[]
  content: string
  [key: string]: any
}

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. A placeholder has been kept here for future integration.`)
}

export async function listMyMessages(): Promise<MessageEntity[]> {
  const res = await get<any[]>('/api/message/list')
  return (res.data || []).map(normalizeMessage)
}

export const listMessages = listMyMessages

export async function sendNormalMessage(
  recipientIds: string[],
  content: string,
): Promise<any> {
  const res = await post<any>('/api/message/send', {
    recipientIds,
    content,
  })

  return res.data
}

export async function sendMessage(payload: SendMessagePayload): Promise<any> {
  const res = await post<any>('/api/message/send', payload)
  return res.data
}

export async function getUnreadMessageCount(): Promise<number> {
  const res = await get<number>('/api/message/unread-count')
  return Number(res.data || 0)
}

export async function getMessageDetail(messageId: string): Promise<MessageEntity> {
  const res = await get<any>(`/api/message/${encodeURIComponent(messageId)}`)
  return normalizeMessage(res.data)
}

export async function getAvailableReceivers(scene?: string): Promise<any[]> {
  if (scene) {
    // keep scene parameter for future endpoint:
    // GET /api/communication/available-receivers?scene=normal
  }

  return missingEndpoint('getAvailableReceivers')
}

export async function markMessageRead(messageId: string): Promise<void> {
  if (!messageId) throw new Error('messageId is required')

  // Currently GET /api/message/{messageId} marks as read according to OpenAPI.
  await getMessageDetail(messageId)
}

export async function replyMessage(messageId: string, recipientIds: string[], content: string): Promise<any> {
  if (!messageId) throw new Error('messageId is required')

  // No dedicated reply endpoint yet. Reuse send endpoint for now.
  return await sendNormalMessage(recipientIds, content)
}

function normalizeMessage(raw: any): MessageEntity {
  return {
    id: String(raw?.id ?? raw?.messageId ?? ''),
    messageId: raw?.messageId ?? raw?.id,
    senderId: raw?.senderId,
    senderName: raw?.senderName ?? raw?.sender,
    recipientIds: raw?.recipientIds,
    content: raw?.content ?? '',
    createTime: raw?.createTime,
    read: raw?.read,
    raw,
  }
}
