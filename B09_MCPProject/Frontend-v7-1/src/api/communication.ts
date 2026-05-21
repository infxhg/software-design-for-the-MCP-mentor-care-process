/**
 * src/api/communication.ts
 *
 * Communication API - normal messages, appointment wrappers, case wrappers.
 */

import { get, post } from './request'
import {
  createAppointmentSlots,
  setAppointmentVenue,
  confirmAppointmentSlot,
  deleteAppointmentSlot,
  getAppointmentSlotsByMentor,
  forwardCaseToCoordinatorApi,
  getMySubmittedCases,
} from './mentoring'
import type {
  AppointmentSlot,
  CaseItem,
} from './mentoring'

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
  raw?: any
}

export interface InterviewSlot {
  slotId?: string
  date: string
  time: string
  endTime?: string
  venue?: string | null
  status?: string
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
  raw?: any
}

export interface CaseForwardPayload {
  studentId: string
  forwardToId: string
  caseDescription: string
}

// ==================== Normal Messages ====================

export async function listMyMessages(): Promise<MessageEntity[]> {
  const res = await get<any[]>('/api/message/list')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to load messages')
  }

  return (res.data || []).map(normalizeMessage)
}

export async function sendNormalMessage(
  receiverIds: string[],
  content: string,
): Promise<void> {
  if (!content || !content.trim()) {
    throw new Error('Message content cannot be empty.')
  }

  if (!receiverIds || receiverIds.length === 0) {
    throw new Error('Please select at least one receiver.')
  }

  const res = await post<null>('/api/message/send', {
    recipientIds: receiverIds,
    content: content.trim(),
  })

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to send message')
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  const res = await get<any>('/api/message/unread-count')

  if (res.code !== 200) {
    throw new Error(res.message || 'Failed to get unread count')
  }

  if (typeof res.data === 'number') return res.data
  if (typeof res.data?.count === 'number') return res.data.count
  if (typeof res.data?.unreadCount === 'number') return res.data.unreadCount

  return 0
}

export async function getMessageDetail(messageId: string): Promise<MessageEntity> {
  const mid = String(messageId || '').trim()
  if (!mid) throw new Error('messageId is required')

  const res = await get<any>(`/api/message/${encodeURIComponent(mid)}`, {
    messageId: mid,
  })

  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || 'Message not found')
  }

  return normalizeMessage(res.data)
}

// ==================== Interview Arrangements ====================

function missingEndpoint(name: string): never {
  throw new Error(`${name}: backend endpoint is not provided in current OpenAPI. The function is kept here for future wiring.`)
}

/**
 * There is no "GET my invitations / my slots" endpoint yet.
 * Kept for pages that already call this function.
 */
export async function getMyInvitations(): Promise<InterviewInvitation[]> {
  return missingEndpoint('getMyInvitations')
}

/**
 * Old UI name kept.
 * New backend model creates mentor slots by date + startTimes, not per-student invitation.
 */
export async function sendInterviewInvitation(
  studentId: string,
  slots: InterviewSlot[],
): Promise<void> {
  if (!studentId) throw new Error('Please select a student.')
  if (!slots || slots.length === 0) throw new Error('Please add at least one time slot.')

  const grouped = new Map<string, string[]>()

  for (const slot of slots) {
    if (!slot.date) throw new Error('Slot date is required.')
    if (!slot.time) throw new Error('Slot time is required.')

    const times = grouped.get(slot.date) || []
    times.push(slot.time)
    grouped.set(slot.date, times)
  }

  for (const [slotDate, startTimes] of grouped) {
    await createAppointmentSlots({ slotDate, startTimes })
  }
}

/**
 * Old UI name kept. Here invitationId is treated as slotId.
 */
export async function studentConfirmSlot(
  invitationId: string,
  slot?: InterviewSlot,
): Promise<void> {
  const slotId = String(slot?.slotId || invitationId || '').trim()
  if (!slotId) throw new Error('slotId is required.')

  await confirmAppointmentSlot(slotId)
}

/**
 * Old UI name kept. Here invitationId is treated as slotId.
 */
export async function mentorConfirmVenue(
  invitationId: string,
  venue: string,
): Promise<void> {
  const slotId = String(invitationId || '').trim()
  if (!slotId) throw new Error('slotId is required.')
  if (!venue || !venue.trim()) throw new Error('Venue cannot be empty.')

  await setAppointmentVenue(slotId, venue)
}

export async function cancelAppointmentSlot(slotId: string): Promise<void> {
  await deleteAppointmentSlot(slotId)
}

export async function listMentorAvailableSlots(
  mentorId: string,
): Promise<AppointmentSlot[]> {
  return getAppointmentSlotsByMentor(mentorId)
}

// ==================== Forward Cases ====================

/**
 * Missing: coordinator-side inbox endpoint.
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
  return missingEndpoint('listForwardedCasesForCoordinator')
}

export async function forwardCaseToCoordinator(
  payload: CaseForwardPayload,
): Promise<void> {
  if (!payload.studentId) throw new Error('Please select a student.')
  if (!payload.forwardToId) throw new Error('Please select a coordinator.')
  if (!payload.caseDescription?.trim()) {
    throw new Error('Case description cannot be empty.')
  }

  await forwardCaseToCoordinatorApi({
    studentId: payload.studentId,
    targetCoordinatorId: payload.forwardToId,
    description: payload.caseDescription,
  })
}

/**
 * Missing: coordinator -> faculty consultant forwarding endpoint.
 */
export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId: string
}): Promise<void> {
  if (!payload.caseId) throw new Error('Case ID is required.')
  if (!payload.consultantId) throw new Error('Please select a faculty consultant.')

  return missingEndpoint('forwardCaseToConsultant')
}

export async function listMyForwardedCases(): Promise<CaseItem[]> {
  return getMySubmittedCases()
}

// ==================== Helpers ====================

function normalizeMessage(raw: any): MessageEntity {
  const messageId = raw.messageId ?? raw.id ?? ''
  const senderId = raw.senderId ?? ''
  const receiverId = raw.receiverId ?? raw.recipientId ?? ''
  const timestamp = raw.timestamp ?? raw.createTime ?? raw.createdAt ?? ''
  const content = raw.content ?? ''

  return {
    messageId,
    senderId,
    senderName: raw.senderName ?? senderId,
    receiverId,
    receiverName: raw.receiverName ?? raw.recipientName,
    content,
    timestamp,
    isRead: Boolean(raw.isRead ?? raw.read ?? false),
    messageType: raw.messageType ?? raw.type ?? 'normal',
    raw,
  }
}
