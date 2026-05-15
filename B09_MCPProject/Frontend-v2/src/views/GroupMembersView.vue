<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Members</h1>
        <p class="desc">Group / Mentor ID: {{ groupId }}</p>
      </div>
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <div v-if="isLoading" class="loading">Loading group members...</div>

    <div v-else-if="students.length > 0">
      <table>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Major</th>
            <th>Status</th>
            <th>Group ID</th>
            <th>Records</th>
            <th>Operation</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in students" :key="s.studentId">
            <td>{{ s.studentId }}</td>
            <td>{{ s.majorId || 'N/A' }}</td>
            <td>{{ s.status || 'N/A' }}</td>
            <td>{{ s.groupId }}</td>
            <td>{{ s.interviewRecords?.length || 0 }} records</td>
            <td>
              <button class="link-button" @click="viewRecord(s.studentId)">View Record</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="empty">No students found in this group.</p>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecordsByGroup } from '../api/mentoring'
import type { StudentGroupRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string

const students = ref<StudentGroupRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    students.value = await getRecordsByGroup(groupId)
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load group members.'
  } finally {
    isLoading.value = false
  }
})

function viewRecord(studentId: string) {
  router.push(`/student-record/${studentId}`)
}

function goBack() {
  router.push('/search-mentor')
}
</script>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; }
table { width: 100%; border-collapse: collapse; margin-top: 22px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.empty { margin-top: 18px; color: #6b7280; }
.error { margin-top: 14px; color: #dc2626; }
.loading { color: #6b7280; padding: 40px; text-align: center; }
.link-button {
  background: transparent; color: #2563eb; padding: 0;
  border: none; cursor: pointer; font-weight: 600;
}
</style>
