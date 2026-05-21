import { get, post, unwrap } from './request'
import {
  cancelAppointmentSlot,
  confirmAppointmentSlot,
  createAppointmentSlots,
  getMentorAppointmentSlots,
  setAppointmentVenue,
  type AppointmentSlot,
} from './mentoring'

export interface MessageItem {
  id: string | number
  senderId: string
  content: string
  createTime: string
  [key: string]: any
}

export async function sendMessage(payload: {
  recipientIds: string[]
  content: string
}): Promise<void> {
  const res = await post<null>('/api/message/send', payload)
  unwrap(res)
}

export async function listMessages(): Promise<MessageItem[]> {
  const res = await get<MessageItem[]>('/api/message/list')
  return unwrap(res) || []
}

export async function getUnreadMessageCount(): Promise<number> {
  const res = await get<number>('/api/message/unread-count')
  return unwrap(res) || 0
}

export async function getMessageDetail(messageId: string | number): Promise<MessageItem> {
  const res = await get<MessageItem>(`/api/message/${encodeURIComponent(String(messageId))}`)
  return unwrap(res)
}

export {
  cancelAppointmentSlot,
  confirmAppointmentSlot,
  createAppointmentSlots,
  getMentorAppointmentSlots,
  setAppointmentVenue,
}

export type { AppointmentSlot }

// 兼容旧页面函数名
export async function sendInterviewInvitation(
  _studentId: string,
  slots: Array<{ date?: string; slotDate?: string; time?: string; startTime?: string }>,
): Promise<AppointmentSlot[]> {
  if (!slots.length) throw new Error('At least one slot is required')

  const firstDate = slots[0].slotDate || slots[0].date
  if (!firstDate) throw new Error('slotDate is required')

  const startTimes = slots
    .filter((s) => (s.slotDate || s.date) === firstDate)
    .map((s) => s.startTime || s.time)
    .filter(Boolean) as string[]

  return createAppointmentSlots({
    slotDate: firstDate,
    startTimes,
  })
}

export async function studentConfirmSlot(
  slotId: string,
  slot?: { slotId?: string; date?: string; time?: string; slotDate?: string; startTime?: string },
): Promise<AppointmentSlot> {
  return confirmAppointmentSlot(slot?.slotId || slotId)
}

export async function mentorConfirmVenue(slotId: string, venue: string): Promise<AppointmentSlot> {
  return setAppointmentVenue(slotId, venue)
}


// ==================== Backward compatibility for old student communication page ====================

export interface InterviewSlotForView {
  slotId?: string
  date: string
  time: string
  venue?: string | null
}

export interface InterviewInvitation {
  invitationId: string
  fromMentorId?: string
  fromMentorName?: string
  slots: InterviewSlotForView[]
  chosenSlot?: InterviewSlotForView
  venue?: string | null
  status: 'pending' | 'student_confirmed' | 'venue_confirmed' | string
  raw?: any
}

export async function getMyInvitations(): Promise<InterviewInvitation[]> {
  // This endpoint is not listed in the OpenAPI. Keep the function so old pages compile.
  // If backend later provides it, this will start working automatically.
  try {
    const res = await get<any[]>('/api/mentoring/appointments/invitations/mine')
    const data = unwrap(res) || []
    return Array.isArray(data) ? data.map(normalizeInvitation) : []
  } catch {
    return []
  }
}

function normalizeInvitation(raw: any): InterviewInvitation {
  const rawSlots = Array.isArray(raw?.slots) ? raw.slots : raw?.slotId ? [raw] : []
  const slots = rawSlots.map((slot: any) => ({
    slotId: slot?.slotId ?? slot?.id,
    date: normalizeDateText(slot?.date ?? slot?.slotDate),
    time: normalizeTimeText(slot?.time ?? slot?.startTime),
    venue: slot?.venue ?? null,
  }))

  const chosenRaw = raw?.chosenSlot || raw?.confirmedSlot || raw?.selectedSlot
  const chosenSlot = chosenRaw
    ? {
        slotId: chosenRaw?.slotId ?? chosenRaw?.id,
        date: normalizeDateText(chosenRaw?.date ?? chosenRaw?.slotDate),
        time: normalizeTimeText(chosenRaw?.time ?? chosenRaw?.startTime),
        venue: chosenRaw?.venue ?? raw?.venue ?? null,
      }
    : undefined

  return {
    invitationId: String(raw?.invitationId ?? raw?.slotId ?? raw?.id ?? ''),
    fromMentorId: raw?.fromMentorId ?? raw?.mentorId,
    fromMentorName: raw?.fromMentorName ?? raw?.mentorName ?? raw?.senderName ?? 'Mentor',
    slots,
    chosenSlot,
    venue: raw?.venue ?? chosenSlot?.venue ?? null,
    status: normalizeInvitationStatus(raw?.status, raw?.venue, chosenSlot),
    raw,
  }
}

function normalizeInvitationStatus(status: any, venue: any, chosenSlot?: InterviewSlotForView): string {
  const text = String(status || '').toLowerCase()
  if (text.includes('venue')) return 'venue_confirmed'
  if (text.includes('confirmed') || text.includes('booked') || chosenSlot) {
    return venue ? 'venue_confirmed' : 'student_confirmed'
  }
  return 'pending'
}

function normalizeDateText(value: any): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function normalizeTimeText(value: any): string {
  if (!value) return ''
  const text = String(value)
  const match = text.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : text
}
