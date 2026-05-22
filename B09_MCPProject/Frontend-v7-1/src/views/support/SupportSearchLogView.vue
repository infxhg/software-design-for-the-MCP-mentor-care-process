<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Search Student Log</h1>
        <p class="desc">Please enter ID or Name to access caring logs.</p>
      </div>
      <button class="secondary" type="button" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label for="log-query">Enter ID or Name</label>
        <div class="search-row">
          <input
            id="log-query"
            v-model="query"
            type="text"
            placeholder="e.g. 123456789 or Bnbuer"
            :disabled="isLoading"
            @keyup.enter="search"
          />
          <button class="primary" type="button" :disabled="isLoading" @click="search">
            {{ isLoading ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

      <table v-if="results.length > 0">
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Matched Logs</th>
          <th>Action</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="r in results" :key="r.key">
          <td>{{ r.userId }}</td>
          <td>{{ r.name }}</td>
          <td>{{ r.role }}</td>
          <td>{{ r.logCount }}</td>
          <td>
            <button class="link-btn" type="button" @click="viewLog(r.userId)">View Log</button>
          </td>
        </tr>
        </tbody>
      </table>

      <div class="buttons">
        <button class="secondary" type="button" @click="goBack">Back</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchLogs, type OperationLog } from '../../api/support'

const router = useRouter()

type SearchResult = {
  key: string
  userId: string
  name: string
  role: string
  logCount: number
}

const query = ref('')
const results = ref<SearchResult[]>([])
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function userIdOf(log: OperationLog): string {
  return text(log.userId || log.username || log.userName || log.name || log.id)
}

function nameOf(log: OperationLog): string {
  return text(log.realName || log.name || log.username || log.userName || log.userId) || '-'
}

function roleOf(log: OperationLog): string {
  return text(log.role) || '-'
}

function buildResults(logs: OperationLog[]): SearchResult[] {
  const map = new Map<string, SearchResult>()

  for (const log of logs) {
    const userId = userIdOf(log)
    if (!userId) continue

    const existing = map.get(userId)
    if (existing) {
      existing.logCount += 1
      if (existing.name === '-' && nameOf(log) !== '-') existing.name = nameOf(log)
      if (existing.role === '-' && roleOf(log) !== '-') existing.role = roleOf(log)
      continue
    }

    map.set(userId, {
      key: userId,
      userId,
      name: nameOf(log),
      role: roleOf(log),
      logCount: 1,
    })
  }

  return Array.from(map.values())
}

async function search() {
  message.value = ''
  isError.value = false
  results.value = []

  const q = query.value.trim()
  if (!q) {
    message.value = 'Warning: Please enter an ID or name.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    const logs = await searchLogs({ query: q, userId: q, username: q })
    results.value = buildResults(logs)

    if (results.value.length === 0) {
      message.value = 'No matching log found.'
      isError.value = true
    }
  } catch (err) {
    console.error('[support log] failed to search logs:', err)
    message.value = err instanceof Error ? err.message || 'Search failed.' : 'Search failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function viewLog(userId: string) {
  router.push(`/support/log/${encodeURIComponent(userId)}`)
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form {
  max-width: 760px;
  margin-top: 22px;
}

.form-item {
  margin-top: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.search-row {
  display: flex;
  gap: 10px;
}

.search-row input {
  flex: 1;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

button {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
}

.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary {
  background: #6b7280;
}

.secondary:hover:not(:disabled) {
  background: #4b5563;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
}

th,
td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

th {
  background: #f3f4f6;
}

.link-btn {
  background: transparent;
  color: #2563eb;
  border: none;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  padding: 0;
}

.buttons {
  margin-top: 18px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #dc2626;
}
</style>
