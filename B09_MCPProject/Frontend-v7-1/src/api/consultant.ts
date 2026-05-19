/**
 * Faculty Consultant API
 *
 * Handles:
 *   - Import student name list (Excel)
 *   - Change mentor of a group
 *   - Update mentor group (add/remove students)
 *   - Designate MCP coordinators (manual or Excel)
 *   - List / detail of groups
 *   - List / detail of departments (within own faculty)
 *   - Export interview records by filter
 *
 * 备注：和 admin.ts 同样的 mock 策略 —— 后端接口尚未完全到位时让前端流程可走通。
 */

import { get, post } from './request'

const USE_MOCK = true

// ==================== Types ====================

export interface GroupSummary {
  groupId: string
  mentorName: string
  mentorId?: string
  studentCount?: number
  major?: string
  department?: string
}

export interface GroupMember {
  studentId: string
  name: string
  major?: string
  status?: string
}

export interface DepartmentSummary {
  departmentId: string
  departmentName: string
  faculty: string
  coordinatorName: string | null
  coordinatorEmail: string | null
}

export interface CoordinatorDesignation {
  coordinatorName: string
  email: string
  department: string
}

// ==================== Mock data ====================

const mockGroups: GroupSummary[] = [
  { groupId: 'B01', mentorName: 'Jack', mentorId: 'M001', studentCount: 8, major: 'CST', department: 'DCS' },
  { groupId: 'B02', mentorName: 'Peter', mentorId: 'M002', studentCount: 6, major: 'CST', department: 'DCS' },
  { groupId: 'B03', mentorName: 'Mark', mentorId: 'M003', studentCount: 7, major: 'AI', department: 'DCS' },
  { groupId: '2024-2025-Y2', mentorName: 'Mary Lee', mentorId: 'M004', studentCount: 5, major: 'CST', department: 'DCS' },
]

const mockGroupMembers: Record<string, GroupMember[]> = {
  B01: [
    { studentId: '123456789', name: 'Bnbuer', major: 'CST', status: 'Normal' },
    { studentId: '987654321', name: 'Uicer', major: 'CST', status: 'Normal' },
  ],
  B02: [
    { studentId: '210000001', name: 'Sugar', major: 'CST', status: 'Normal' },
  ],
  B03: [],
  '2024-2025-Y2': [
    { studentId: '330026143', name: 'Test Student', major: 'CST', status: 'Normal' },
  ],
}

const mockDepartments: DepartmentSummary[] = [
  { departmentId: 'DCS', departmentName: 'Computer Science', faculty: 'FST', coordinatorName: 'Jack', coordinatorEmail: 'jack@bnbu.edu.cn' },
  { departmentId: 'DS', departmentName: 'Data Science', faculty: 'FST', coordinatorName: 'Peter', coordinatorEmail: 'peter@bnbu.edu.cn' },
  { departmentId: 'AI', departmentName: 'AI', faculty: 'FST', coordinatorName: 'Mark', coordinatorEmail: 'mark@bnbu.edu.cn' },
  { departmentId: 'DM', departmentName: 'Mathematics', faculty: 'FST', coordinatorName: null, coordinatorEmail: null },
]

// ==================== Group APIs ====================

export async function listGroups(): Promise<GroupSummary[]> {
  if (USE_MOCK) return JSON.parse(JSON.stringify(mockGroups))

  const res = await get<GroupSummary[]>('/consultant/groups')
  if (res.code !== 200) throw new Error(res.message || 'Failed to list groups')
  return res.data || []
}

export async function getGroupDetail(groupId: string): Promise<{
  group: GroupSummary | null
  members: GroupMember[]
}> {
  if (USE_MOCK) {
    return {
      group: mockGroups.find((g) => g.groupId === groupId) || null,
      members: JSON.parse(JSON.stringify(mockGroupMembers[groupId] || [])),
    }
  }

  const res = await get<{ group: GroupSummary; members: GroupMember[] }>(
    `/consultant/groups/${encodeURIComponent(groupId)}`,
  )
  if (res.code !== 200) throw new Error(res.message || 'Failed to load group detail')
  return res.data
}

export async function changeGroupMentor(groupId: string, newMentorId: string): Promise<void> {
  if (USE_MOCK) {
    const g = mockGroups.find((g) => g.groupId === groupId)
    if (!g) throw new Error('Group not found')
    g.mentorId = newMentorId
    g.mentorName = `Mentor#${newMentorId}`
    return
  }

  const res = await post(`/consultant/groups/${encodeURIComponent(groupId)}/mentor`, {
    mentorId: newMentorId,
  })
  if (res.code !== 200) throw new Error(res.message || 'Failed to change mentor')
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  if (USE_MOCK) {
    if (!mockGroupMembers[groupId]) mockGroupMembers[groupId] = []
    if (mockGroupMembers[groupId].some((m) => m.studentId === studentId)) {
      throw new Error('Student already in this group.')
    }
    mockGroupMembers[groupId].push({
      studentId,
      name: 'Student#' + studentId.slice(-3),
      major: 'CST',
      status: 'Normal',
    })
    return
  }

  const res = await post(`/consultant/groups/${encodeURIComponent(groupId)}/members`, {
    studentId,
  })
  if (res.code !== 200) throw new Error(res.message || 'Failed to add student')
}

export async function removeStudentFromGroup(
  groupId: string,
  studentId: string,
): Promise<void> {
  if (USE_MOCK) {
    const list = mockGroupMembers[groupId]
    if (!list) return
    const idx = list.findIndex((m) => m.studentId === studentId)
    if (idx >= 0) list.splice(idx, 1)
    return
  }

  const res = await post(
    `/consultant/groups/${encodeURIComponent(groupId)}/members/remove`,
    { studentId },
  )
  if (res.code !== 200) throw new Error(res.message || 'Failed to remove student')
}

// ==================== Department APIs ====================

export async function listDepartments(): Promise<DepartmentSummary[]> {
  if (USE_MOCK) return JSON.parse(JSON.stringify(mockDepartments))

  const res = await get<DepartmentSummary[]>('/consultant/departments')
  if (res.code !== 200) throw new Error(res.message || 'Failed to list departments')
  return res.data || []
}

export async function getDepartmentDetail(
  deptId: string,
): Promise<DepartmentSummary | null> {
  if (USE_MOCK) {
    return mockDepartments.find((d) => d.departmentId === deptId) || null
  }

  const res = await get<DepartmentSummary>(
    `/consultant/departments/${encodeURIComponent(deptId)}`,
  )
  if (res.code !== 200) return null
  return res.data || null
}

export async function designateCoordinator(payload: CoordinatorDesignation): Promise<void> {
  if (USE_MOCK) {
    const dept = mockDepartments.find(
      (d) =>
        d.departmentId.toLowerCase() === payload.department.toLowerCase() ||
        d.departmentName.toLowerCase() === payload.department.toLowerCase(),
    )
    if (!dept) throw new Error('Department not found.')
    dept.coordinatorName = payload.coordinatorName
    dept.coordinatorEmail = payload.email
    return
  }

  const res = await post('/consultant/departments/designate-coordinator', payload)
  if (res.code !== 200) throw new Error(res.message || 'Failed to designate coordinator')
}

export async function removeCoordinator(deptId: string): Promise<void> {
  if (USE_MOCK) {
    const dept = mockDepartments.find((d) => d.departmentId === deptId)
    if (!dept) throw new Error('Department not found')
    dept.coordinatorName = null
    dept.coordinatorEmail = null
    return
  }

  const res = await post(
    `/consultant/departments/${encodeURIComponent(deptId)}/coordinator/remove`,
    {},
  )
  if (res.code !== 200) throw new Error(res.message || 'Failed to remove coordinator')
}

// ==================== Imports ====================

export async function importStudentNameList(file: File): Promise<{ created: number; updated: number }> {
  if (USE_MOCK) {
    if (!file || file.size === 0) throw new Error('Uploaded file is empty.')
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      throw new Error('Invalid file format. Please upload an Excel file (.xlsx / .xls).')
    }
    return { created: 12, updated: 4 }
  }

  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')
  const res = await fetch('/api/consultant/import/students', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to import student name list')
  return await res.json()
}

export async function importCoordinatorList(file: File): Promise<{ imported: number }> {
  if (USE_MOCK) {
    if (!file || file.size === 0) throw new Error('Uploaded file is empty.')
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      throw new Error('Invalid file format. Please upload an Excel file (.xlsx / .xls).')
    }
    return { imported: 3 }
  }

  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')
  const res = await fetch('/api/consultant/import/coordinators', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to import coordinator list')
  return await res.json()
}

// ==================== Export ====================

export interface ExportFilter {
  academicYears: string[]
  department?: string
  major?: string
  mentorName?: string
  studentName?: string
}

export async function exportRecordsByFilter(filter: ExportFilter): Promise<Blob> {
  if (USE_MOCK) {
    /**
     * 兜底：返回一个伪 Word 文件。
     * 真实场景下后端返回 application/vnd.openxmlformats-officedocument.wordprocessingml.document。
     */
    const text = generateMockWordContent(filter)
    return new Blob([text], { type: 'text/plain' })
  }

  const token = localStorage.getItem('token')
  const res = await fetch('/api/consultant/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(filter),
  })

  if (!res.ok) throw new Error('Export failed')
  return await res.blob()
}

function generateMockWordContent(filter: ExportFilter): string {
  return [
    '===== Mentor Caring System - Interview Record Export =====',
    `Academic Year(s): ${filter.academicYears.join(', ') || 'ALL'}`,
    `Department/Major: ${filter.department || filter.major || 'ALL'}`,
    `Mentor: ${filter.mentorName || 'ALL'}`,
    `Student: ${filter.studentName || 'ALL'}`,
    '',
    '------- Sample Record -------',
    'Faculty: FST',
    'Department: DCS',
    'Major: CST',
    'Student Name: Bnbuer1',
    'Interview record: 1/1/2026',
    'Problem statements: Study difficulty.',
    'Interview summary: Give students advice on study method.',
    'Follow-up actions: Fix the next interview time.',
  ].join('\n')
}
