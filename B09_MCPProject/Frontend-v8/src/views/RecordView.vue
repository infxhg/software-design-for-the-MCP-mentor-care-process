<template>
  <section class="page-card">
    <div class="header">
      <div>
        <h1>My Interview Records</h1>
        <p class="desc">
          Mentor overview of all interview records returned by /api/mentoring/records/mine.
        </p>
      </div>
      <button class="secondary" :disabled="loading" @click="loadRecords">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <section class="card">
      <div class="filters">
        <label>
          Student ID / Keyword
          <input v-model.trim="keyword" placeholder="Filter by student, group, problem, summary" />
        </label>

        <label>
          Group ID
          <input v-model.trim="groupFilter" list="record-groups" placeholder="Optional group filter" />
          <datalist id="record-groups">
            <option v-for="gid in groupIds" :key="gid" :value="gid" />
          </datalist>
        </label>
      </div>
    </section>

    <p v-if="message" class="message error">{{ message }}</p>

    <section class="card">
      <div class="bar">
        <h2>Records</h2>
        <span class="hint">{{ filteredRecords.length }} / {{ records.length }} shown</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Group ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Problem Statement</th>
            <th>Interview Summary</th>
            <th>Follow-up Action</th>
            <th>Operation</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="record in filteredRecords" :key="record.recordId || record.id || `${record.studentId}-${record.interviewDate}`">
            <td>{{ record.studentId }}</td>
            <td>{{ record.groupId || '-' }}</td>
            <td>{{ formatDate(record.interviewDate) }}</td>
            <td>{{ formatTime(record.interviewTime) }}</td>
            <td>{{ record.problemStatement || '-' }}</td>
            <td>{{ record.interviewSummary || '-' }}</td>
            <td>{{ record.followupAction || record.followUpAction || '-' }}</td>
            <td>
              <button class="primary small" @click="editStudent(record.studentId)">Edit</button>
            </td>
          </tr>

          <tr v-if="filteredRecords.length === 0">
            <td colspan="8" class="empty">No records.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyInterviewRecords, isStrictStudentId, type McpRecord } from '../api/mentoring'

const router = useRouter()

const records = ref<McpRecord[]>([])
const keyword = ref('')
const groupFilter = ref('')
const loading = ref(false)
const message = ref('')

const groupIds = computed(() => {
  return Array.from(new Set(records.value.map((record) => String(record.groupId || '').trim()).filter(Boolean)))
})

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const group = groupFilter.value.trim().toLowerCase()

  return records.value.filter((record) => {
    const groupOk = !group || String(record.groupId || '').toLowerCase().includes(group)
    const text = [
      record.studentId,
      record.groupId,
      record.problemStatement,
      record.interviewSummary,
      record.followupAction,
      record.followUpAction,
      record.interviewDate,
      record.interviewTime,
    ]
      .map((item) => String(item || '').toLowerCase())
      .join(' ')

    const keywordOk = !kw || text.includes(kw)
    return groupOk && keywordOk
  })
})

onMounted(loadRecords)

async function loadRecords() {
  loading.value = true
  message.value = ''

  try {
    records.value = await getMyInterviewRecords()
  } catch (err: any) {
    message.value = toFriendlyError(err, 'Failed to load records.')
  } finally {
    loading.value = false
  }
}

function editStudent(studentId: string) {
  if (!studentId) return
  if (!isStrictStudentId(studentId)) {
    window.alert('This record does not have a valid 9-digit Student ID, so it cannot be opened in the strict edit page.')
    return
  }
  router.push(`/edit-record/${encodeURIComponent(studentId)}`)
}

function formatDate(value: unknown): string {
  if (!value) return '-'
  const text = String(value)
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || text
}

function formatTime(value: unknown): string {
  if (!value) return '-'
  const text = String(value)
  const match = text.match(/(\d{2}:\d{2})/)
  return match?.[1] || text
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Authorization warning: you are not allowed to view these records.'
  }
  return text || fallback
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

.card {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.filters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

button {
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.secondary {
  background: #f8fafc;
}

.small {
  padding: 6px 10px;
  font-size: 12px;
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

  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
