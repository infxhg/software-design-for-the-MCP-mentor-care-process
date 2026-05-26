<template>
  <section class="page-card">
    <div class="header">
      <div>
        <h1>Export Records</h1>
        <p class="desc">
          Export interview records by student, by group, or generate a local Word-compatible file from all loaded mentor records.
        </p>
      </div>
      <button class="secondary" :disabled="loadingRecords" @click="loadMyRecords">
        {{ loadingRecords ? 'Loading...' : 'Load My Records' }}
      </button>
    </div>

    <div class="grid">
      <section class="card">
        <h2>Export by Student</h2>
        <input v-model.trim="studentId" placeholder="9-digit Student ID, e.g. 330026143" />
        <button class="primary" :disabled="!studentId || loading" @click="exportStudent">
          Export Student Records
        </button>
      </section>

      <section class="card">
        <h2>Export by Group</h2>
        <input v-model.trim="groupId" list="group-options" placeholder="Group ID, e.g. 2024-2025-Y2" />
        <datalist id="group-options">
          <option v-for="gid in groupIdsFromRecords" :key="gid" :value="gid" />
        </datalist>
        <button class="primary" :disabled="!groupId || loading" @click="exportGroup">
          Export Group Records
        </button>
      </section>

      <section class="card">
        <h2>Export All Loaded Mentor Records</h2>
        <p class="hint">
          Use this fallback when backend only provides student/group export.
          It creates a Word-compatible .doc file in the browser from /api/mentoring/records/mine.
        </p>
        <button class="primary" :disabled="loading || records.length === 0" @click="exportAllLoadedRecords">
          Export Loaded Records
        </button>
      </section>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

    <section class="card">
      <div class="bar">
        <h2>Loaded Records Preview</h2>
        <span class="hint">{{ records.length }} record(s)</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Group ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Problem</th>
            <th>Summary</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="record in records" :key="record.recordId || record.id || `${record.studentId}-${record.interviewDate}`">
            <td>{{ record.studentId }}</td>
            <td>{{ record.groupId || '-' }}</td>
            <td>{{ formatDate(record.interviewDate) }}</td>
            <td>{{ formatTime(record.interviewTime) }}</td>
            <td>{{ record.problemStatement || '-' }}</td>
            <td>{{ record.interviewSummary || '-' }}</td>
          </tr>

          <tr v-if="records.length === 0">
            <td colspan="6" class="empty">No loaded records. Click "Load My Records".</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  downloadExportedFile,
  exportGroupRecords,
  exportStudentRecords,
  getMyInterviewRecords,
  getStrictStudentIdValidationMessage,
  type McpRecord,
} from '../../api/mentoring'

const studentId = ref('')
const groupId = ref('')
const records = ref<McpRecord[]>([])

const loading = ref(false)
const loadingRecords = ref(false)
const message = ref('')
const isError = ref(false)

const groupIdsFromRecords = computed(() => {
  return Array.from(new Set(records.value.map((record) => String(record.groupId || '').trim()).filter(Boolean)))
})

onMounted(loadMyRecords)

async function loadMyRecords() {
  loadingRecords.value = true
  clearMessage()

  try {
    records.value = await getMyInterviewRecords()
  } catch (err: any) {
    showError(toFriendlyError(err, 'Failed to load mentor records.'))
  } finally {
    loadingRecords.value = false
  }
}

async function exportStudent() {
  const validation = getStrictStudentIdValidationMessage(studentId.value)
  if (validation) {
    showError(validation)
    return
  }

  loading.value = true
  clearMessage()

  try {
    const blob = await exportStudentRecords(studentId.value.trim())
    downloadExportedFile(blob, `student-${safeFilePart(studentId.value)}-records.docx`)
    showSuccess('Student records export started.')
  } catch (err: any) {
    showError(toFriendlyError(err, 'Export failed.'))
  } finally {
    loading.value = false
  }
}

async function exportGroup() {
  loading.value = true
  clearMessage()

  try {
    const blob = await exportGroupRecords(groupId.value.trim())
    downloadExportedFile(blob, `group-${safeFilePart(groupId.value)}-records.docx`)
    showSuccess('Group records export started.')
  } catch (err: any) {
    showError(toFriendlyError(err, 'Export failed.'))
  } finally {
    loading.value = false
  }
}

function exportAllLoadedRecords() {
  if (records.value.length === 0) {
    showError('No records loaded.')
    return
  }

  const html = buildWordHtml(records.value)
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  downloadExportedFile(blob, `mentor-all-records-${new Date().toISOString().slice(0, 10)}.doc`)
  showSuccess('Local Word-compatible export started.')
}

function buildWordHtml(rows: McpRecord[]): string {
  const grouped = new Map<string, McpRecord[]>()

  rows.forEach((record) => {
    const sid = String(record.studentId || 'Unknown Student')
    if (!grouped.has(sid)) grouped.set(sid, [])
    grouped.get(sid)!.push(record)
  })

  const sections = Array.from(grouped.entries()).map(([sid, studentRecords]) => {
    const recordsHtml = studentRecords
      .map((record) => `
        <div style="border:1px solid #999; padding:10px; margin:10px 0;">
          <p><strong>Interview record:</strong> ${escapeHtml(formatDate(record.interviewDate))} ${escapeHtml(formatTime(record.interviewTime))}</p>
          <p><strong>Group ID:</strong> ${escapeHtml(record.groupId || 'N/A')}</p>
          <p><strong>Problem statements:</strong><br>${escapeHtml(record.problemStatement || 'N/A')}</p>
          <p><strong>Interview summary:</strong><br>${escapeHtml(record.interviewSummary || 'N/A')}</p>
          <p><strong>Follow-up actions:</strong><br>${escapeHtml(record.followupAction || record.followUpAction || 'N/A')}</p>
        </div>
      `)
      .join('')

    return `<h2>Student Name / ID: ${escapeHtml(sid)}</h2>${recordsHtml}`
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Mentor Interview Records</title>
      </head>
      <body>
        <h1>Mentor Interview Records</h1>
        <p>Export time: ${escapeHtml(new Date().toLocaleString())}</p>
        ${sections}
      </body>
    </html>
  `
}

function formatDate(value: unknown): string {
  if (!value) return 'N/A'
  const text = String(value)
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || text
}

function formatTime(value: unknown): string {
  if (!value) return 'N/A'
  const text = String(value)
  const match = text.match(/(\d{2}:\d{2})/)
  return match?.[1] || text
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '-')
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Authorization warning: you are not allowed to export these records.'
  }
  return text || fallback
}

function clearMessage() {
  message.value = ''
  isError.value = false
}

function showSuccess(text: string) {
  message.value = text
  isError.value = false
}

function showError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header,
.bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.desc,
.hint,
.empty {
  color: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.card {
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 12px;
}

input {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

button {
  width: fit-content;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.secondary {
  background: #f8fafc;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #b42318;
}

@media (max-width: 760px) {
  .header,
  .bar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
