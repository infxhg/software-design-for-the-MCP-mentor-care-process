<template>
  <div class="page">
    <section class="card">
      <div class="top-row">
        <div>
          <h1>Student Log Info</h1>
          <p>
            User:
            <strong>{{ displayName }}</strong>
          </p>
        </div>

        <button class="secondary-btn" type="button" @click="goSearch">
          Back
        </button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <div v-if="isLoading" class="empty-state">
        Loading logs...
      </div>

      <div v-else-if="logs.length === 0" class="empty-state">
        No logs found for this user.
      </div>

      <table v-else class="log-table">
        <thead>
        <tr>
          <th>Time</th>
          <th>User ID</th>
          <th>Username</th>
          <th>Role</th>
          <th>Module</th>
          <th>Action</th>
          <th>Detail</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="item in logs" :key="getLogKey(item)">
          <td>{{ formatTime(getValue(item, 'createTime') || getValue(item, 'createdAt')) }}</td>
          <td>{{ getUserId(item) }}</td>
          <td>{{ getUsername(item) }}</td>
          <td>{{ getValue(item, 'role') || getValue(item, 'userRole') || '-' }}</td>
          <td>{{ getValue(item, 'module') || '-' }}</td>
          <td>{{ getValue(item, 'action') || getValue(item, 'operation') || '-' }}</td>
          <td>
            {{
              getValue(item, 'detail') ||
              getValue(item, 'summary') ||
              getValue(item, 'description') ||
              '-'
            }}
          </td>
        </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchFacultyStudentLogs,
  searchLogs,
  type OperationLog,
} from '../../api/support'

type AnyRecord = Record<string, any>

const route = useRoute()
const router = useRouter()

const logScope = computed(() => (route.meta.logScope === 'faculty' ? 'faculty' : 'support'))
const logBasePath = computed(() =>
    logScope.value === 'faculty' ? '/consultant' : '/support',
)

const logs = ref<OperationLog[]>([])
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

const userId = computed(() => String(route.query.userId ?? route.params.userId ?? '').trim())
const username = computed(() => String(route.query.username ?? '').trim())
const name = computed(() => String(route.query.name ?? '').trim())
const searchKey = computed(() => String(route.query.key ?? userId.value ?? username.value ?? '').trim())

const displayName = computed(() => {
  const parts = [
    name.value,
    username.value && username.value !== name.value ? username.value : '',
    userId.value && userId.value !== username.value ? userId.value : '',
  ].filter(Boolean)

  return parts.length ? parts.join(' / ') : searchKey.value || '-'
})

onMounted(() => {
  loadLogs()
})

async function loadLogs(): Promise<void> {
  const key = searchKey.value || userId.value || username.value

  message.value = ''
  isError.value = false
  logs.value = []

  if (!key) {
    message.value = 'Missing user ID or username.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    // 修复点: 只传 query 单一字段给底层的 support API，防止发送多个字段导致后端走强制 AND 判断
    const list =
        logScope.value === 'faculty'
            ? await searchFacultyStudentLogs(key)
            : await searchLogs({ query: key })

    logs.value = list

    if (list.length === 0) {
      message.value = 'No logs found for this user.'
      isError.value = false
    }
  } catch (error: any) {
    logs.value = []
    message.value = `Failed to load logs: ${error?.message || 'Unknown error'}`
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function getValue(item: OperationLog, key: string): string {
  const raw = item as AnyRecord
  return String(raw[key] ?? '')
}

function getUserId(item: OperationLog): string {
  const raw = item as AnyRecord

  return String(
      raw.userId ??
      raw.studentId ??
      raw.mentorId ??
      raw.operatorUserId ??
      raw.operatorId ??
      raw.targetUserId ??
      '-',
  )
}

function getUsername(item: OperationLog): string {
  const raw = item as AnyRecord

  return String(
      raw.username ??
      raw.userName ??
      raw.operatorUsername ??
      raw.targetUsername ??
      '-',
  )
}

function getLogKey(item: OperationLog): string {
  const raw = item as AnyRecord

  return String(
      raw.logId ??
      raw.id ??
      `${getUserId(item)}-${getUsername(item)}-${raw.createTime ?? raw.createdAt ?? ''}-${
          raw.action ?? raw.operation ?? ''
      }`,
  )
}

function formatTime(value: string): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function goSearch(): void {
  router.push(`${logBasePath.value}/search-log`)
}
</script>

<style scoped>
.page {
  padding: 24px;
}

.card {
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
}

p {
  margin: 10px 0 0;
  color: #64748b;
}

button {
  min-height: 36px;
  padding: 8px 18px;
  border: 0;
  border-radius: 5px;
  font-weight: 700;
  cursor: pointer;
}

.secondary-btn {
  background: #6b7280;
  color: #ffffff;
}

.message {
  margin: 14px 0;
  color: #047857;
}

.message.error {
  color: #dc2626;
}

.empty-state {
  padding: 24px 0;
  color: #64748b;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.log-table th,
.log-table td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

.log-table th {
  background: #f3f4f6;
  color: #111827;
}

.log-table td {
  color: #111827;
}
</style>