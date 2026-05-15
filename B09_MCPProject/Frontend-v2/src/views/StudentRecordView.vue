<template>
  <div class="page-card">
    <div v-if="isLoading" class="loading">Loading student record...</div>

    <div v-else-if="hasData">
      <div class="header">
        <div>
          <h1>Student Record</h1>
          <p class="desc">Detailed student record selected from group member list.</p>
        </div>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div class="info-grid">
        <div><strong>Student ID</strong><p>{{ studentId }}</p></div>
        <div v-if="userInfo">
          <strong>Name</strong><p>{{ userInfo.realName || userInfo.username }}</p>
        </div>
        <div v-if="userInfo">
          <strong>Email</strong><p>{{ userInfo.email || 'N/A' }}</p>
        </div>
        <div v-if="studentExt">
          <strong>Major</strong><p>{{ studentExt.majorId || 'N/A' }}</p>
        </div>
        <div v-if="studentExt">
          <strong>Status</strong><p>{{ studentExt.status || 'N/A' }}</p>
        </div>
        <div v-if="studentExt">
          <strong>Group ID</strong><p>{{ studentExt.groupId || 'N/A' }}</p>
        </div>
      </div>

      <h2>Interview Records</h2>

      <table v-if="records.length > 0">
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Problem Statement</th>
            <th>Interview Summary</th>
            <th>Follow-up Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.recordId">
            <td>{{ r.recordId }}</td>
            <td>{{ formatDate(r.interviewDate) }}</td>
            <td>{{ r.interviewTime || 'N/A' }}</td>
            <td>{{ r.problemStatement }}</td>
            <td>{{ r.interviewSummary }}</td>
            <td>{{ r.followupAction }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">No interview records.</p>
    </div>

    <div v-else>
      <h1>Student Not Found</h1>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecordsByStudent } from '../api/mentoring'
import { get } from '../api/request'
import type { McpRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()
const studentId = route.params.studentId as string

const userInfo = ref<any>(null)
const studentExt = ref<any>(null)
const records = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

const hasData = computed(() => userInfo.value || records.value.length > 0)

function formatDate(d: any): string {
  if (!d) return 'N/A'
  if (typeof d === 'string') return d.substring(0, 10)
  return String(d)
}

onMounted(async () => {
  try {
    // Try to get user info (studentId might be a UUID or username)
    try {
      const res = await get(`/user/userInfo?username=${encodeURIComponent(studentId)}`)
      if (res.code === 200 && res.data) {
        userInfo.value = res.data.user || res.data
      }
    } catch { /* might be a UUID, not username */ }

    // Try to get interview records
    try {
      const id = userInfo.value?.id || studentId
      records.value = await getRecordsByStudent(id)
    } catch { /* no records or no permission */ }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load.'
  } finally {
    isLoading.value = false
  }
})

function goBack() {
  router.back()
}
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.info-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 18px; margin-top: 24px; margin-bottom: 28px;
}
.info-grid div { padding: 16px; background: #f9fafb; border-radius: 8px; }
.info-grid p { margin-bottom: 0; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.empty { color: #6b7280; }
.error { color: #dc2626; }
.loading { color: #6b7280; padding: 40px; text-align: center; }
</style>
