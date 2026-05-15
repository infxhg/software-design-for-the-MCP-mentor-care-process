/**
 * Mentoring API - Interview records
 *
 * Backend endpoints:
 *   GET  /api/mentoring/records/student/{studentId}   (Faculty Consultant / Coordinator)
 *   GET  /api/mentoring/records/group/{groupId}       (Mentor / Coordinator)
 *   GET  /api/mentoring/records/{recordId}            (Mentor / Coordinator / Consultant)
 *   POST /api/mentoring/records                       (Mentor - save/update)
 */

import { get, post } from './request'

// ---------- Types ----------

export interface McpRecord {
  recordId?: string
  studentId: string
  mentorId?: string
  groupId?: string
  interviewDate: string       // "2026-05-01"
  interviewTime?: string      // "10:00"
  problemStatement: string
  interviewSummary: string
  followupAction: string
  createTime?: string
}

export interface StudentGroupRecord {
  studentId: string
  majorId: string
  status: string
  groupId: string
  interviewRecords: McpRecord[]
}

// ---------- API calls ----------

/** Get interview records for a student (Faculty Consultant / Coordinator) */
export async function getRecordsByStudent(studentId: string): Promise<McpRecord[]> {
  const res = await get<McpRecord[]>(`/mentoring/records/student/${studentId}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get records')
  return res.data || []
}

/** Get all students and records in a group (Mentor / Coordinator) */
export async function getRecordsByGroup(groupId: string): Promise<StudentGroupRecord[]> {
  const res = await get<StudentGroupRecord[]>(`/mentoring/records/group/${groupId}`)
  if (res.code !== 200) throw new Error(res.message || 'Failed to get group records')
  return res.data || []
}

/** Get a single record by ID */
export async function getRecordDetail(recordId: string): Promise<McpRecord> {
  const res = await get<McpRecord>(`/mentoring/records/${recordId}`)
  if (res.code !== 200) throw new Error(res.message || 'Record not found')
  return res.data
}

/** Save or update an interview record (Mentor only) */
export async function saveRecord(record: McpRecord): Promise<void> {
  const res = await post(`/mentoring/records`, record)
  if (res.code !== 200) throw new Error(res.message || 'Failed to save record')
}
