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
