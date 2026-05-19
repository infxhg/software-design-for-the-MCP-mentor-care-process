/**
 * Administrator API
 *
 * Handles:
 *   - Faculty consultant management (add / change / delete / list)
 *   - Organization (faculty / department / major) setup
 *   - Supporting staff management
 *
 * 备注：
 * 这些后端接口目前文档没明确给出。前端先按 Long Description / Detailed Design
 * 里的语义把请求拼好。后端落地时若 endpoint 路径变化，统一在本文件里改。
 *
 * 所有请求都通过 request.ts 的统一封装走 /api 前缀，
 * 也会自动附 JWT 与 401 跳登录。
 *
 * 兜底：
 * 后端 503 / 网络错误时，会返回本地 mock 数据以让前端流程可用。
 * 真实联调时把 USE_MOCK 改成 false 即可。
 */

import { get, post, del } from './request'

// ==================== Mock toggle ====================

/**
 * Set to false once the corresponding backend endpoints are ready.
 *
 * 修改点：mock 默认开启，避免后端没接上时前端跑不通。
 */
const USE_MOCK = true

// ==================== Types ====================

export interface ConsultantInfo {
  consultantId?: string
  name: string
  email: string
  faculty: string         // FST / FHSS / FSM / DCC ...
}

export interface SupportingStaffInfo {
  staffId?: string
  name: string
  accountId: string
  canViewLog: boolean
  canReplyFeedback: boolean
}

export interface OrgEntry {
  faculty: string
  department: string
  major: string
}

// ==================== Faculty Consultant ====================

/**
 * Mock store kept in memory only — resets on page reload.
 * That mirrors how the real backend would behave from the UI's perspective.
 */
const mockConsultants: ConsultantInfo[] = [
  { consultantId: 'C001', name: 'Prof. Amy', email: 'amy@bnbu.edu.cn', faculty: 'FST' },
  { consultantId: 'C002', name: 'Prof. John', email: 'john@bnbu.edu.cn', faculty: 'DCC' },
  { consultantId: 'C003', name: 'Prof. Smith', email: 'smith@bnbu.edu.cn', faculty: 'FST' },
]

export async function listConsultants(): Promise<ConsultantInfo[]> {
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockConsultants))
  }

  const res = await get<ConsultantInfo[]>('/admin/consultants')
  if (res.code !== 200) throw new Error(res.message || 'Failed to list consultants')
  return res.data || []
}

export async function getConsultant(consultantId: string): Promise<ConsultantInfo | null> {
  if (USE_MOCK) {
    return mockConsultants.find((c) => c.consultantId === consultantId) || null
  }

  const res = await get<ConsultantInfo>(`/admin/consultants/${encodeURIComponent(consultantId)}`)
  if (res.code !== 200) return null
  return res.data || null
}

export async function addConsultant(info: ConsultantInfo): Promise<void> {
  if (USE_MOCK) {
    if (mockConsultants.some((c) => c.email === info.email)) {
      throw new Error('Consultant with this email already exists.')
    }

    mockConsultants.push({
      ...info,
      consultantId: 'C' + String(Date.now()).slice(-6),
    })
    return
  }

  const res = await post('/admin/consultants', info)
  if (res.code !== 200) throw new Error(res.message || 'Failed to add consultant')
}

export async function updateConsultant(info: ConsultantInfo): Promise<void> {
  if (!info.consultantId) throw new Error('consultantId is required')

  if (USE_MOCK) {
    const idx = mockConsultants.findIndex((c) => c.consultantId === info.consultantId)
    if (idx < 0) throw new Error('Consultant not found')
    mockConsultants[idx] = { ...info }
    return
  }

  const res = await post(`/admin/consultants/${encodeURIComponent(info.consultantId)}`, info)
  if (res.code !== 200) throw new Error(res.message || 'Failed to update consultant')
}

export async function deleteConsultant(consultantId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockConsultants.findIndex((c) => c.consultantId === consultantId)
    if (idx < 0) throw new Error('Consultant not found')
    mockConsultants.splice(idx, 1)
    return
  }

  const res = await del(`/admin/consultants/${encodeURIComponent(consultantId)}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to delete consultant')
}

// ==================== Supporting Staff ====================

const mockSupportingStaff: SupportingStaffInfo[] = [
  { staffId: 'S001', name: 'Staff A', accountId: '001', canViewLog: true, canReplyFeedback: true },
  { staffId: 'S002', name: 'Staff B', accountId: '002', canViewLog: true, canReplyFeedback: false },
  { staffId: 'S003', name: 'Staff C', accountId: '003', canViewLog: false, canReplyFeedback: true },
]

export async function listSupportingStaff(): Promise<SupportingStaffInfo[]> {
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockSupportingStaff))
  }

  const res = await get<SupportingStaffInfo[]>('/admin/supporting-staff')
  if (res.code !== 200) throw new Error(res.message || 'Failed to list staff')
  return res.data || []
}

export async function getSupportingStaff(staffId: string): Promise<SupportingStaffInfo | null> {
  if (USE_MOCK) {
    return mockSupportingStaff.find((s) => s.staffId === staffId) || null
  }

  const res = await get<SupportingStaffInfo>(`/admin/supporting-staff/${encodeURIComponent(staffId)}`)
  if (res.code !== 200) return null
  return res.data || null
}

export async function addSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  if (USE_MOCK) {
    if (mockSupportingStaff.some((s) => s.accountId === info.accountId)) {
      throw new Error('Staff with this account ID already exists.')
    }
    mockSupportingStaff.push({
      ...info,
      staffId: 'S' + String(Date.now()).slice(-6),
    })
    return
  }

  const res = await post('/admin/supporting-staff', info)
  if (res.code !== 200) throw new Error(res.message || 'Failed to add staff')
}

export async function updateSupportingStaff(info: SupportingStaffInfo): Promise<void> {
  if (!info.staffId) throw new Error('staffId is required')

  if (USE_MOCK) {
    const idx = mockSupportingStaff.findIndex((s) => s.staffId === info.staffId)
    if (idx < 0) throw new Error('Staff not found')
    mockSupportingStaff[idx] = { ...info }
    return
  }

  const res = await post(`/admin/supporting-staff/${encodeURIComponent(info.staffId)}`, info)
  if (res.code !== 200) throw new Error(res.message || 'Failed to update staff')
}

export async function deleteSupportingStaff(staffId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockSupportingStaff.findIndex((s) => s.staffId === staffId)
    if (idx < 0) throw new Error('Staff not found')
    mockSupportingStaff.splice(idx, 1)
    return
  }

  const res = await del(`/admin/supporting-staff/${encodeURIComponent(staffId)}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to delete staff')
}

// ==================== Organization (Faculty / Department / Major) ====================

const mockOrgTree: OrgEntry[] = [
  { faculty: 'FST', department: 'DCS', major: 'CST' },
  { faculty: 'FST', department: 'DCS', major: 'AI' },
  { faculty: 'FST', department: 'DCS', major: 'DS' },
  { faculty: 'FST', department: 'DM', major: 'EE' },
  { faculty: 'FHSS', department: 'DEMP', major: 'Marketing' },
  { faculty: 'FSM', department: 'DEC', major: 'Economics' },
  { faculty: 'DCC', department: 'GE', major: 'English' },
]

export async function getOrgTree(): Promise<OrgEntry[]> {
  if (USE_MOCK) {
    return JSON.parse(JSON.stringify(mockOrgTree))
  }

  const res = await get<OrgEntry[]>('/admin/organization/tree')
  if (res.code !== 200) throw new Error(res.message || 'Failed to load organization tree')
  return res.data || []
}

export async function addOrgEntry(entry: OrgEntry): Promise<void> {
  if (USE_MOCK) {
    const exists = mockOrgTree.some(
      (o) =>
        o.faculty === entry.faculty &&
        o.department === entry.department &&
        o.major === entry.major,
    )
    if (exists) {
      throw new Error('This faculty/department/major combination already exists.')
    }
    mockOrgTree.push({ ...entry })
    return
  }

  const res = await post('/admin/organization/entry', entry)
  if (res.code !== 200) throw new Error(res.message || 'Failed to add org entry')
}

export async function importOrgFromExcel(file: File): Promise<void> {
  if (USE_MOCK) {
    // Pretend to parse — just verify file is not empty
    if (!file || file.size === 0) {
      throw new Error('Uploaded file is empty.')
    }
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('token')
  const res = await fetch('/api/admin/organization/import', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) throw new Error('Failed to import organization file')
}
