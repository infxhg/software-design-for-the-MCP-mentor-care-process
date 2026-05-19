/**
 * Shared type definitions for the Mentor Caring System
 */

export type Role =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'

export const roleLabels: Record<Role, string> = {
  student: 'Student',
  mentor: 'Mentor',
  coordinator: 'MCP Coordinator',
  consultant: 'Faculty Consultant',
  admin: 'Administrator',
  support: 'Supporting Staff',
}

export function getRole(): Role {
  return (localStorage.getItem('role') as Role) || 'student'
}

export function getRoleLabel(role: Role): string {
  return roleLabels[role] || role
}

/**
 * Faculty list for dropdowns. Reflects the four current BNBU faculties.
 * (FST / FHSS / FSM / DCC) — kept here so changes propagate everywhere.
 */
export const FACULTIES = ['FST', 'FHSS', 'FSM', 'DCC'] as const
export type FacultyCode = typeof FACULTIES[number]

/**
 * Student status values used throughout the system.
 * Per the long description: suspended / normal / probation
 */
export const STUDENT_STATUSES = ['Normal', 'Suspended', 'Probation'] as const
export type StudentStatus = typeof STUDENT_STATUSES[number]
