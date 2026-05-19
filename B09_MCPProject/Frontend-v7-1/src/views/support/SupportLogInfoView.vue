<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Log Information — User Activity Overview</h1>
        <p class="desc">Activity and interaction logs of the selected user.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading log...</div>

    <div v-else-if="userInfo">
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
        <tr v-for="(l, i) in logs" :key="i">
          <td>{{ l.date }}</td>
          <td>{{ l.logType }}</td>
          <td>{{ l.summary }}</td>
        </tr>
        </tbody>
      </table>

      <p v-else class="empty">No log activity found.</p>
    </div>

    <p v-else class="error">User not found.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

onMounted(async () => {
  /**
   * Mock: real backend should expose GET /api/support/log/{userId}
   */
  await new Promise((r) => setTimeout(r, 200))

  userInfo.value = {
    userId,
    name: 'Bnbuer',
    role: 'student',
    department: 'FST',
    status: 'Active',
  }

  logs.value = [
    { date: '2026-03-20', logType: 'Interview', summary: 'Progress review by Jack' },
    { date: '2026-02-10', logType: 'Allocation', summary: 'Assigned to Group 2024-Y2' },
    { date: '2026-01-15', logType: 'Login', summary: 'Logged in from web client' },
  ]

  isLoading.value = false
})

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.info-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px; margin-top: 22px;
  padding: 16px; background: #f9fafb; border-radius: 8px;
}

h2 { margin-top: 24px; font-size: 17px; }
table { width: 100%; border-collapse: collapse; margin-top: 14px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.buttons { margin-top: 22px; }
.empty, .loading { color: #6b7280; padding: 20px 0; }
.error { color: #dc2626; }
</style>
