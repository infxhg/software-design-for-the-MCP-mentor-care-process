/**
 * Communication API.
 *
 * Backend endpoints from OpenAPI:
 *   POST /api/message/send
 *   GET  /api/message/list
 *   GET  /api/message/unread-count
 *   GET  /api/message/{messageId}
 *
 * 注意：
 * OpenAPI 目前只给了「普通消息」接口。
 * Interview arrangement / Forward case 暂时没有独立后端接口，所以这里用普通消息接口承载发送动作；
 * 列表类函数返回空数组，避免页面崩溃，等后端补接口后只需要改本文件。
 */

import { get, post } from './request'

// ==================== Types ====================

export interface MessageEntity {
  messageId: string
  senderId: string
  senderName: string
  receiverId: string
  receiverName?: string
  content: string
  timestamp: string
  isRead: boolean
  messageType: 'normal' | 'interview' | 'case'
}

export interface InterviewSlot {
  date: string
  time: string
}

export interface InterviewInvitation {
  invitationId: string
  fromMentorName: string
  fromMentorId: string
  studentId: string
  studentName?: string
  slots: InterviewSlot[]
  chosenSlot?: InterviewSlot
  venue?: string
  status: 'pending' | 'student_confirmed' | 'venue_confirmed' | 'cancelled'
}

export interface CaseForwardPayload {
  studentId: string
  forwardToId: string
  caseDescription: string
}

interface RawMessage {
  id?: string
  messageId?: string
  senderId?: string
  senderName?: string
  receiverId?: string
  receiverName?: string
  content?: string
  createTime?: string
  timestamp?: string
  isRead?: boolean
  messageType?: string
  type?: string
}

function normalizeMessage(raw: RawMessage): MessageEntity {
  const messageType = String(raw.messageType ?? raw.type ?? 'normal') as MessageEntity['messageType']

  return {
    messageId: String(raw.messageId ?? raw.id ?? ''),
    senderId: String(raw.senderId ?? ''),
    senderName: String(raw.senderName ?? raw.senderId ?? ''),
    receiverId: String(raw.receiverId ?? ''),
    receiverName: raw.receiverName,
    content: String(raw.content ?? ''),
    timestamp: String(raw.timestamp ?? raw.createTime ?? ''),
    isRead: Boolean(raw.isRead ?? false),
    messageType: ['normal', 'interview', 'case'].includes(messageType) ? messageType : 'normal',
  }
}

// ==================== Normal messages ====================

export async function listMyMessages(): Promise<MessageEntity[]> {
  const res = await get<RawMessage[]>('/message/list')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load messages')
  }

  return (res.data || []).map(normalizeMessage)
}

export async function getUnreadMessageCount(): Promise<number> {
  const res = await get<number>('/message/unread-count')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get unread count')
  }

  return Number(res.data || 0)
}

export async function getMessageDetail(messageId: string): Promise<MessageEntity> {
  const id = String(messageId || '').trim()
  if (!id) throw new Error('messageId is required')

  const res = await get<RawMessage>(`/message/${encodeURIComponent(id)}`, {
    messageId: id,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Failed to load message')
  }

  return normalizeMessage(res.data)
}

export async function sendNormalMessage(
  receiverIds: string[],
  content: string,
): Promise<void> {
  const text = String(content || '').trim()
  if (!text) throw new Error('Message content cannot be empty.')

  const recipientIds = (receiverIds || []).map((id) => String(id).trim()).filter(Boolean)
  if (recipientIds.length === 0) {
    throw new Error('Please select at least one receiver.')
  }

  const res = await post<null>('/message/send', {
    recipientIds,
    content: text,
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to send message')
  }
}

// ==================== Interview arrangements ====================

/**
 * 后端暂未提供独立预约列表接口。
 */
export async function getMyInvitations(): Promise<InterviewInvitation[]> {
  return []
}

/**
 * 暂时通过普通消息发给学生。
 */
export async function sendInterviewInvitation(
  studentId: string,
  slots: InterviewSlot[],
): Promise<void> {
  if (!studentId) throw new Error('Please select a student.')
  if (!slots || slots.length === 0) throw new Error('Please add at least one time slot.')

  const slotText = slots.map((s) => `${s.date} ${s.time}`).join(', ')
  await sendNormalMessage(
    [studentId],
    `[Interview Arrangement] Please choose one of these time slots: ${slotText}`,
  )
}

/**
 * 后端暂未提供确认 slot 接口；保留函数名避免页面编译报错。
 */
export async function studentConfirmSlot(
  invitationId: string,
  slot: InterviewSlot,
): Promise<void> {
  if (!invitationId) throw new Error('Invitation ID is required.')
  if (!slot?.date || !slot?.time) throw new Error('Slot is required.')
}

/**
 * 后端暂未提供确认 venue 接口；保留函数名避免页面编译报错。
 */
export async function mentorConfirmVenue(
  invitationId: string,
  venue: string,
): Promise<void> {
  if (!invitationId) throw new Error('Invitation ID is required.')
  if (!venue || !venue.trim()) throw new Error('Venue cannot be empty.')
}

// ==================== Forward cases ====================

/**
 * 后端暂未提供 coordinator case inbox 接口。
 */
export async function listForwardedCasesForCoordinator(): Promise<
  Array<{
    caseId: string
    fromMentorName: string
    studentId: string
    studentName: string
    description: string
    status: string
  }>
> {
  return []
}

/**
 * 暂时通过普通消息发送 special case 给 coordinator。
 */
export async function forwardCaseToCoordinator(
  payload: CaseForwardPayload,
): Promise<void> {
  if (!payload.studentId) throw new Error('Please select a student.')
  if (!payload.forwardToId) throw new Error('Please select a coordinator.')
  if (!payload.caseDescription?.trim()) {
    throw new Error('Case description cannot be empty.')
  }

  await sendNormalMessage(
    [payload.forwardToId],
    `[Special Case] Student: ${payload.studentId}\n${payload.caseDescription.trim()}`,
  )
}

/**
 * 暂时通过普通消息把 case 转给 consultant。
 */
export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId: string
}): Promise<void> {
  if (!payload.caseId) throw new Error('Case ID is required.')
  if (!payload.consultantId) throw new Error('Please select a faculty consultant.')

  await sendNormalMessage(
    [payload.consultantId],
    `[Forwarded Special Case] Case ID: ${payload.caseId}`,
  )
}
