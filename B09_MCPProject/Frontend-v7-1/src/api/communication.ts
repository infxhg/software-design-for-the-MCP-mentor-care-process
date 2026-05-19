/**
 * Communication API
 *
 * Handles:
 *   - Normal messages (send/receive between users)
 *   - Interview arrangement (mentor → student → venue confirmation)
 *   - Forward case (mentor → coordinator → consultant)
 *
 * 备注：mock 兜底，方便前端联调。
 */

import { get, post } from './request'

const USE_MOCK = true

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
  /** 'normal' | 'interview' | 'case' */
  messageType: 'normal' | 'interview' | 'case'
}

export interface InterviewSlot {
  date: string         // YYYY-MM-DD
  time: string         // HH:MM
  /** 30-min slots — end time computed on the fly when displayed */
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
  /** 'pending' | 'student_confirmed' | 'venue_confirmed' | 'cancelled' */
  status: 'pending' | 'student_confirmed' | 'venue_confirmed' | 'cancelled'
}

export interface CaseForwardPayload {
  studentId: string
  forwardToId: string        // coordinator or consultant id
  caseDescription: string
}

// ==================== Mock data ====================

const mockMessages: MessageEntity[] = [
  {
    messageId: 'msg001',
    senderId: '210000001',
    senderName: 'Sugar',
    receiverId: 'mentor001',
    content: 'Hi Mentor, can we have a meeting next week?',
    timestamp: '2026-03-20 10:30:00',
    isRead: false,
    messageType: 'normal',
  },
  {
    messageId: 'msg002',
    senderId: '123456789',
    senderName: 'Bnbuer',
    receiverId: 'mentor001',
    content: 'I have some questions about my study plan.',
    timestamp: '2026-03-18 14:20:00',
    isRead: true,
    messageType: 'normal',
  },
]

const mockInvitations: InterviewInvitation[] = [
  {
    invitationId: 'inv001',
    fromMentorName: 'Mary Lee',
    fromMentorId: 'mentor001',
    studentId: '330026143',
    studentName: 'Test Student',
    slots: [
      { date: '2026-03-27', time: '14:00' },
      { date: '2026-03-27', time: '15:00' },
    ],
    status: 'pending',
  },
]

const mockForwardedCases: Array<{
  caseId: string
  fromMentorName: string
  studentId: string
  studentName: string
  description: string
  status: string
}> = [
  {
    caseId: 'case001',
    fromMentorName: 'Mary Lee',
    studentId: '210000001',
    studentName: 'Sugar',
    description: 'Student has failed 3 finals. Needs faculty attention.',
    status: 'pending',
  },
]

// ==================== Normal messages ====================

export async function listMyMessages(): Promise<MessageEntity[]> {
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockMessages))
  }

  const res = await get<MessageEntity[]>('/messages/mine')
  if (res.code !== 200) throw new Error(res.message || 'Failed to load messages')
  return res.data || []
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

  if (USE_MOCK) {
    for (const rid of receiverIds) {
      mockMessages.push({
        messageId: 'msg' + Date.now(),
        senderId: localStorage.getItem('username') || 'me',
        senderName: localStorage.getItem('username') || 'Me',
        receiverId: rid,
        content,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        isRead: false,
        messageType: 'normal',
      })
    }
    return
  }

  const res = await post('/messages/send', { receiverIds, content, type: 'normal' })
  if (res.code !== 200) throw new Error(res.message || 'Failed to send message')
}

// ==================== Interview arrangements ====================

export async function getMyInvitations(): Promise<InterviewInvitation[]> {
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockInvitations))
  }

  const res = await get<InterviewInvitation[]>('/invitations/mine')
  if (res.code !== 200) throw new Error(res.message || 'Failed to load invitations')
  return res.data || []
}

export async function sendInterviewInvitation(
  studentId: string,
  slots: InterviewSlot[],
): Promise<void> {
  if (!studentId) throw new Error('Please select a student.')
  if (!slots || slots.length === 0) throw new Error('Please add at least one time slot.')

  if (USE_MOCK) {
    mockInvitations.push({
      invitationId: 'inv' + Date.now(),
      fromMentorId: 'me',
      fromMentorName: localStorage.getItem('username') || 'Me',
      studentId,
      slots: slots.map((s) => ({ ...s })),
      status: 'pending',
    })
    return
  }

  const res = await post('/invitations/send', { studentId, slots })
  if (res.code !== 200) throw new Error(res.message || 'Failed to send invitation')
}

export async function studentConfirmSlot(
  invitationId: string,
  slot: InterviewSlot,
): Promise<void> {
  if (USE_MOCK) {
    const inv = mockInvitations.find((i) => i.invitationId === invitationId)
    if (!inv) throw new Error('Invitation not found.')
    inv.chosenSlot = { ...slot }
    inv.status = 'student_confirmed'
    return
  }

  const res = await post(
    `/invitations/${encodeURIComponent(invitationId)}/confirm-slot`,
    slot,
  )
  if (res.code !== 200) throw new Error(res.message || 'Failed to confirm slot')
}

export async function mentorConfirmVenue(
  invitationId: string,
  venue: string,
): Promise<void> {
  if (!venue || !venue.trim()) throw new Error('Venue cannot be empty.')

  if (USE_MOCK) {
    const inv = mockInvitations.find((i) => i.invitationId === invitationId)
    if (!inv) throw new Error('Invitation not found.')
    inv.venue = venue.trim()
    inv.status = 'venue_confirmed'
    return
  }

  const res = await post(
    `/invitations/${encodeURIComponent(invitationId)}/confirm-venue`,
    { venue },
  )
  if (res.code !== 200) throw new Error(res.message || 'Failed to confirm venue')
}

// ==================== Forward cases ====================

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
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockForwardedCases))
  }

  const res = await get('/cases/coordinator/inbox')
  if (res.code !== 200) throw new Error(res.message || 'Failed to load cases')
  return res.data || []
}

export async function forwardCaseToCoordinator(
  payload: CaseForwardPayload,
): Promise<void> {
  if (!payload.studentId) throw new Error('Please select a student.')
  if (!payload.forwardToId) throw new Error('Please select a coordinator.')
  if (!payload.caseDescription?.trim()) {
    throw new Error('Case description cannot be empty.')
  }

  if (USE_MOCK) {
    mockForwardedCases.push({
      caseId: 'case' + Date.now(),
      fromMentorName: localStorage.getItem('username') || 'Me',
      studentId: payload.studentId,
      studentName: 'Student#' + payload.studentId.slice(-3),
      description: payload.caseDescription.trim(),
      status: 'pending',
    })
    return
  }

  const res = await post('/cases/forward/coordinator', payload)
  if (res.code !== 200) throw new Error(res.message || 'Failed to forward case')
}

export async function forwardCaseToConsultant(payload: {
  caseId: string
  consultantId: string
}): Promise<void> {
  if (!payload.caseId) throw new Error('Case ID is required.')
  if (!payload.consultantId) throw new Error('Please select a faculty consultant.')

  if (USE_MOCK) {
    const c = mockForwardedCases.find((c) => c.caseId === payload.caseId)
    if (!c) throw new Error('Case not found.')
    c.status = 'forwarded_to_consultant'
    return
  }

  const res = await post('/cases/forward/consultant', payload)
  if (res.code !== 200) throw new Error(res.message || 'Failed to forward case')
}
