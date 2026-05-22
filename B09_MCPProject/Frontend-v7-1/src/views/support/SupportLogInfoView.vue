<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Log Information — User Activity Overview</h1>
        <p class="desc">Activity and interaction logs of the selected user.</p>
      </div>
      <button class="secondary" type="button" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading log...</div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="!isLoading && userInfo">
      <div class="info-row">
        <div><strong>Name:</strong> {{ userInfo.name }} (ID: {{ userInfo.userId }})</div>
        <div><strong>Role:</strong> {{ userInfo.role }}</div>
        <div><strong>Department:</strong> {{ userInfo.department }}</div>
        <div><strong>Status:</strong> {{ userInfo.status }}</div>
      </div>

      <h2>Activity &amp; Interaction Logs</h2>

      <table v-if="logs.length > 0">
        <thead>
        <tr>
          <th>Date</th>
          <th>Log Type</th>
          <th>Summary / Action Taken</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(l, i) in logs" :key="`${l.date}-${l.logType}-${i}`">
          <td>{{ l.date }}</td>
          <td>{{ l.logType }}</td>
          <td>{{ l.summary }}</td>
        </tr>
        </tbody>
      </table>

      <p v-else class="empty">No log activity found.</p>
    </div>

    <p v-else-if="!isLoading && !error" class="error">User not found.</p>

    <div class="buttons">
      <button class="secondary" type="button" @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getLogsByUser,
  getUserInfoByIdApi,
  type OperationLog,
  type UserInfoDTO,
} from '../../api/support'

const route = useRoute()
const router = useRouter()

const userId = String(route.params.userId || '').trim()

const userInfo = ref<{
  userId: string
  name: string
  role: string
  department: string
  status: string
} | null>(null)

const logs = ref<Array<{ date: string; logType: string; summary: string }>>([])
const isLoading = ref(true)
const error = ref('')

function text(value: unknown, fallback = '-'): string {
  const result = String(value ?? '').trim()
  return result || fallback
}

function formatDate(value: unknown): string {
  const raw = text(value, '')
  if (!raw) return '-'

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function normalizeLog(log: OperationLog) {
  return {
    date: formatDate(log.date || log.timestamp || log.createTime || log.createdAt),
    logType: text(log.logType || log.type || log.module || log.action || log.operation, 'Activity'),
    summary: text(log.summary || log.detail || log.operation || log.action, '-'),
  }
}

function normalizeUserInfo(info?: UserInfoDTO | null, sourceLog?: OperationLog) {
  if (!info && !sourceLog && !userId) return null

  return {
    userId: text(info?.userId || info?.id || sourceLog?.userId || userId),
    name: text(
      info?.realName ||
        info?.name ||
        info?.username ||
        sourceLog?.realName ||
        sourceLog?.name ||
        sourceLog?.username ||
        sourceLog?.userName ||
        userId,
    ),
    role: text(info?.role || sourceLog?.role),
    department: text(sourceLog?.department),
    status: text(info?.status || sourceLog?.status),
  }
}

async function loadLogInfo() {
  if (!userId) {
    error.value = 'Invalid user ID.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''

  let fetchedLogs: OperationLog[] = []
  let fetchedUser: UserInfoDTO | null = null
  let logError: unknown = null
  let userError: unknown = null

  try {
    fetchedLogs = await getLogsByUser(userId)
  } catch (err) {
    logError = err
    console.error('[support log] failed to load user logs:', err)
  }

  try {
    fetchedUser = await getUserInfoByIdApi(userId)
  } catch (err) {
    userError = err
    console.warn('[support log] failed to load user info:', err)
  }

  logs.value = fetchedLogs.map(normalizeLog)
  userInfo.value = normalizeUserInfo(fetchedUser, fetchedLogs[0])

  if (!userInfo.value && fetchedLogs.length === 0) {
    const fallbackError = logError || userError
    error.value = fallbackError instanceof Error ? fallbackError.message : 'Failed to load log information.'
  }

  isLoading.value = false
}

onMounted(() => {
  loadLogInfo()
})

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

.info-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 22px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

h2 {
  margin-top: 24px;
  font-size: 17px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
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

button {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.secondary {
  background: #6b7280;
}

.secondary:hover {
  background: #4b5563;
}

.buttons {
  margin-top: 22px;
}

.empty,
.loading {
  color: #6b7280;
  padding: 20px 0;
}

.error {
  color: #dc2626;
}
</style>
