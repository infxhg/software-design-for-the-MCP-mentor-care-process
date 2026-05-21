import { get, post, unwrap } from './request'
import {
  cancelAppointmentSlot,
  confirmAppointmentSlot,
  createAppointmentSlots,
  forwardCaseToConsultant,
  getMentorAppointmentSlots,
  listCoordinatorCases,
  listForwardedCasesForCoordinator,
  sendInterviewInvitation,
  setAppointmentVenue,
  type AppointmentSlot,
  type CaseItem,
} from './mentoring'

export interface MessageItem {
  id: string | number
  senderId: string
  senderName?: string
  content: string
  createTime: string
  read?: boolean
  raw?: any
  [key: string]: any
}

export type MessageEntity = MessageItem

export interface SendMessagePayload {
  recipientIds: string[]
  content: string
  [key: string]: any
}

function normalizeMessage(raw: any): MessageItem {
  return {
    ...raw,
    id: raw?.id ?? raw?.messageId ?? '',
    senderId: raw?.senderId ?? '',
    senderName: raw?.senderName ?? raw?.sender,
    content: raw?.content ?? '',
    createTime: raw?.createTime ?? '',
    read: raw?.read,
    raw,
  }
}

export async function sendMessage(payload: SendMessagePayload): Promise<void> {
  const res = await post<null>('/api/message/send', payload)
  unwrap(res)
}

export async function sendNormalMessage(recipientIds: string[], content: string): Promise<void> {
  return sendMessage({ recipientIds, content })
}

export async function listMessages(): Promise<MessageItem[]> {
  const res = await get<any[]>('/api/message/list')
  return (unwrap(res) || []).map(normalizeMessage)
}

export const listMyMessages = listMessages

export async function getUnreadMessageCount(): Promise<number> {
  const res = await get<number>('/api/message/unread-count')
  return unwrap(res) || 0
}

export async function getMessageDetail(messageId: string | number): Promise<MessageItem> {
  const res = await get<any>(`/api/message/${encodeURIComponent(String(messageId))}`)
  return normalizeMessage(unwrap(res))
}

export async function markMessageRead(messageId: string | number): Promise<void> {
  await getMessageDetail(messageId)
}

export async function replyMessage(
  _messageId: string | number,
  recipientIds: string[],
  content: string,
): Promise<void> {
  return sendMessage({ recipientIds, content })
}

export async function getAvailableReceivers(_scene?: string): Promise<any[]> {
  // Not present in uploaded OpenAPI.
  throw new Error('Receiver-list API is not available. Please enter receiver IDs manually.')
}

export {
  cancelAppointmentSlot,
  confirmAppointmentSlot,
  createAppointmentSlots,
  forwardCaseToConsultant,
  getMentorAppointmentSlots,
  listCoordinatorCases,
  listForwardedCasesForCoordinator,
  sendInterviewInvitation,
  setAppointmentVenue,
}

export async function studentConfirmSlot(
  slotId: string,
  slot?: { slotId?: string },
): Promise<AppointmentSlot> {
  return confirmAppointmentSlot(slot?.slotId || slotId)
}

export async function mentorConfirmVenue(slotId: string, venue: string): Promise<AppointmentSlot> {
  return setAppointmentVenue(slotId, venue)
}

export interface InterviewInvitation {
  invitationId: string
  fromMentorId?: string
  fromMentorName?: string
  slots: Array<{ slotId?: string; date: string; time: string; venue?: string | null }>
  chosenSlot?: { slotId?: string; date: string; time: string; venue?: string | null }
  venue?: string | null
  status: string
  raw?: any
}

export async function getMyInvitations(): Promise<InterviewInvitation[]> {
  // No dedicated invitation endpoint exists in uploaded OpenAPI.
  // Student pages should normally use getMyMentor + getMentorAppointmentSlots.
  return []
}

export type { AppointmentSlot, CaseItem }
