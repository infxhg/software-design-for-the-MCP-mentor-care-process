<template>
  <div class="page-card">
    <div v-if="isLoading" class="loading">Loading student info...</div>

    <div v-else-if="student">
      <div class="header">
        <div>
          <h1>Student Detail</h1>
          <p class="desc">Student information and interview records (read-only).</p>
        </div>
        <div>
          <button class="secondary" @click="goBack">Back</button>
          <button class="secondary" @click="goHome">Home</button>
        </div>
      </div>

      <div class="info-grid">
        <div><strong>Username</strong><p>{{ student.username }}</p></div>
        <div><strong>Name</strong><p>{{ student.realName || student.username }}</p></div>
        <div><strong>Email</strong><p>{{ student.email || 'N/A' }}</p></div>
        <div><strong>Status</strong><p>{{ student.status === 1 ? 'Active' : 'Inactive' }}</p></div>
      </div>

      <div class="record-section">
        <div class="record-header">
          <h2>Interview Records</h2>
          <button v-if="canEdit" @click="editRecord">Edit Interview Record</button>
        </div>

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
import { get } from '../api/request'
import { getRecordsByStudent } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()

const studentId = route.params.studentId as string

const student = ref<any>(null)
const records = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

const canEdit = computed(() => getRole() === 'mentor')

function formatDate(d: any): string {
  if (!d) return 'N/A'
  if (typeof d === 'string') return d.substring(0, 10)
  return String(d)
}

onMounted(async () => {
  try {
    const userRes = await get(`/user/userInfo?username=${encodeURIComponent(studentId)}`)
    if (userRes.code === 200 && userRes.data) {
      student.value = userRes.data.user || userRes.data
      // Fetch records
      const userId = student.value.id
      if (userId) {
        try {
          records.value = await getRecordsByStudent(userId)
        } catch { /* no records or no permission */ }
      }
    } else {
      errorMsg.value = 'Student not found.'
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load student info.'
  } finally {
    isLoading.value = false
  }
})

function editRecord() {
  if (!student.value) return
  router.push(`/edit-record/${student.value.id || studentId}`)
}

function goBack() { router.push('/search-student') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header, .record-header {
  display: flex; justify-content: space-between; align-items: center;
}
.header button { margin-left: 8px; }
.info-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 18px; margin-top: 24px;
}
.info-grid div { padding: 16px; background: #f9fafb; border-radius: 8px; }
.info-grid p { margin-bottom: 0; }
.record-section { margin-top: 30px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.empty { color: #6b7280; }
.error { color: #dc2626; }
.loading { color: #6b7280; padding: 40px; text-align: center; }
</style>
