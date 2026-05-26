export type AppRole =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'
  | 'unknown'

export type RecipientType =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'
  | 'unknown'

export interface RecipientOption {
  id: string
  userId?: string
  username?: string
  realName?: string
  name?: string
  role?: string
  type?: string
  userRole?: string
  email?: string
  phone?: string
  departmentName?: string
  raw?: any
}

export const MAX_MESSAGE_LENGTH = 500

const ALLOWED_RECIPIENTS: Record<AppRole, RecipientType[]> = {
  student: ['mentor'],
  mentor: ['student'],
  coordinator: ['student', 'mentor', 'consultant'],
  consultant: ['student', 'coordinator'],
  admin: [],
  support: [],
  unknown: [],
}

export function normalizeFrontendRole(value: unknown): AppRole {
  const role = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')

  if (role === 'student') return 'student'
  if (role === 'mentor') return 'mentor'

  if (
    role === 'coordinator' ||
    role === 'mcp_coordinator' ||
    role === 'mcpcoordinator' ||
    role === 'department_coordinator'
  ) {
    return 'coordinator'
  }

  if (
    role === 'consultant' ||
    role === 'faculty_consultant' ||
    role === 'facultyconsultant' ||
    role === 'fc'
  ) {
    return 'consultant'
  }

  if (role === 'admin' || role === 'administrator') return 'admin'

  if (
    role === 'support' ||
    role === 'support_staff' ||
    role === 'supporting_staff' ||
    role === 'staff'
  ) {
    return 'support'
  }

  return 'unknown'
}

export function normalizeRecipientType(value: unknown): RecipientType {
  const type = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')

  if (type === 'student') return 'student'
  if (type === 'mentor') return 'mentor'

  if (
    type === 'coordinator' ||
    type === 'mcp_coordinator' ||
    type === 'mcpcoordinator' ||
    type === 'department_coordinator'
  ) {
    return 'coordinator'
  }

  if (
    type === 'consultant' ||
    type === 'faculty_consultant' ||
    type === 'facultyconsultant' ||
    type === 'fc'
  ) {
    return 'consultant'
  }

  if (type === 'admin' || type === 'administrator') return 'admin'

  if (
    type === 'support' ||
    type === 'support_staff' ||
    type === 'supporting_staff' ||
    type === 'staff'
  ) {
    return 'support'
  }

  return 'unknown'
}

export function getAllowedRecipientTypesForRole(roleInput: unknown): RecipientType[] {
  const role = normalizeFrontendRole(roleInput)
  return ALLOWED_RECIPIENTS[role] || []
}

export function canRoleSendTo(roleInput: unknown, recipientTypeInput: unknown): boolean {
  const role = normalizeFrontendRole(roleInput)
  const recipientType = normalizeRecipientType(recipientTypeInput)

  return ALLOWED_RECIPIENTS[role]?.includes(recipientType) ?? false
}

export function getRoleLabel(roleInput: unknown): string {
  const role = normalizeFrontendRole(roleInput)

  const labels: Record<AppRole, string> = {
    student: 'Student',
    mentor: 'Mentor',
    coordinator: 'MCP Coordinator',
    consultant: 'Faculty Consultant',
    admin: 'Admin',
    support: 'Supporting Staff',
    unknown: 'Unknown',
  }

  return labels[role]
}

export function getRecipientTypeLabel(typeInput: unknown): string {
  const type = normalizeRecipientType(typeInput)

  const labels: Record<RecipientType, string> = {
    student: 'Student',
    mentor: 'Mentor',
    coordinator: 'MCP Coordinator',
    consultant: 'Faculty Consultant',
    admin: 'Admin',
    support: 'Supporting Staff',
    unknown: 'Unknown',
  }

  return labels[type]
}

export function getRecipientType(receiver: RecipientOption): RecipientType {
  return normalizeRecipientType(
    receiver.type ||
      receiver.role ||
      receiver.userRole ||
      receiver.raw?.type ||
      receiver.raw?.role ||
      receiver.raw?.userRole,
  )
}

export function hasUnsafeMessageContent(content: string): boolean {
  return /<script|<\/script|javascript:|on\w+=|<iframe|<\/iframe/i.test(content)
}

export function validateMessageBeforeSend(
  roleInput: unknown,
  selectedRecipientIds: string[],
  content: string,
  allRecipients: RecipientOption[],
): string {
  const role = normalizeFrontendRole(roleInput)
  const allowedTypes = getAllowedRecipientTypesForRole(role)
  const text = content.trim()

  if (allowedTypes.length === 0) {
    return 'Authorization warning: Your role cannot send messages.'
  }

  const uniqueIds = Array.from(
    new Set(selectedRecipientIds.map((id) => String(id).trim()).filter(Boolean)),
  )

  if (uniqueIds.length === 0) {
    return 'Warning: Please select at least one recipient.'
  }

  if (!text) {
    return 'Warning: Message content cannot be empty.'
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return `Warning: Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters.`
  }

  if (hasUnsafeMessageContent(text)) {
    return 'Warning: Message content contains unsafe HTML or script.'
  }

  if (uniqueIds.length !== selectedRecipientIds.map((id) => String(id).trim()).filter(Boolean).length) {
    return 'Warning: Duplicate recipients are not allowed.'
  }

  const recipientMap = new Map<string, RecipientOption>()

  for (const receiver of allRecipients) {
    const id = String(receiver.id || receiver.userId || '').trim()
    if (id) {
      recipientMap.set(id, receiver)
    }
  }

  for (const id of uniqueIds) {
    const receiver = recipientMap.get(id)

    if (!receiver) {
      return 'Warning: Invalid recipient selected.'
    }

    const recipientType = getRecipientType(receiver)

    if (!canRoleSendTo(role, recipientType)) {
      return `Authorization warning: ${getRoleLabel(role)} cannot send messages to ${getRecipientTypeLabel(
        recipientType,
      )}.`
    }
  }

  return ''
}
