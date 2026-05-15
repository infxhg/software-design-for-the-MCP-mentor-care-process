<template>
  <div class="page-card">
    <h1>Search Student's Info</h1>

    <p class="desc">
      Mentors and MCP Coordinators can search student information by student ID.
    </p>

    <div class="form">
      <label>Student ID</label>
      <input v-model="studentId" type="text" placeholder="Enter student username" />

      <div class="buttons">
        <button @click="searchStudent" :disabled="isLoading">
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>
    </div>

    <!-- Search result -->
    <div v-if="foundStudent" class="results-section">
      <h2>Student Information</h2>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ foundStudent.username }}</td>
            <td>{{ foundStudent.realName || foundStudent.username }}</td>
            <td>{{ foundStudent.email || 'N/A' }}</td>
            <td>{{ foundStudent.status === 1 ? 'Active' : 'Inactive' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Interview Records -->
      <div class="record-section">
        <div class="record-header">
          <h2>Interview Records</h2>
          <button v-if="canEdit" @click="editRecord">Edit Interview Record</button>
        </div>

        <table v-if="interviewRecords.length > 0">
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
            <tr v-for="record in interviewRecords" :key="record.recordId">
              <td>{{ record.recordId }}</td>
              <td>{{ formatDate(record.interviewDate) }}</td>
              <td>{{ record.interviewTime || 'N/A' }}</td>
              <td>{{ record.problemStatement || 'N/A' }}</td>
              <td>{{ record.interviewSummary || 'N/A' }}</td>
              <td>{{ record.followupAction || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No interview records found.</p>
      </div>

      <div class="result-actions">
        <button class="secondary" @click="clearResult">Back to Search</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '../api/request'
import { getRecordsByStudent } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'

const router = useRouter()

const studentId = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

const foundStudent = ref<any>(null)
const interviewRecords = ref<McpRecord[]>([])

const canEdit = computed(() => getRole() === 'mentor')

function formatDate(d: any): string {
  if (!d) return 'N/A'
  if (typeof d === 'string') return d.substring(0, 10)
  return String(d)
}

async function searchStudent() {
  message.value = ''
  isError.value = false
  foundStudent.value = null
  interviewRecords.value = []

  const input = studentId.value.trim()

  if (!input) {
    message.value = 'Warning: Student ID cannot be empty.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    // Step 1: Look up user by username
    const userRes = await get(`/user/userInfo?username=${encodeURIComponent(input)}`)

    if (userRes.code !== 200 || !userRes.data) {
      message.value = 'No matching student record is found.'
      isError.value = true
      return
    }

    const userInfo = userRes.data
    const userEntity = userInfo.user || userInfo
    foundStudent.value = userEntity

    // Step 2: Try to get interview records
    const userId = userEntity.id
    if (userId) {
      try {
        interviewRecords.value = await getRecordsByStudent(userId)
      } catch (recordErr: any) {
        // May fail due to role restrictions — that's OK
        console.warn('Could not fetch interview records:', recordErr.message)
      }
    }
  } catch (err: any) {
    if (err.message?.includes('401')) {
      message.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403')) {
      message.value = 'Authorization warning: You do not have permission to view this student.'
    } else {
      message.value = 'No matching student record is found.'
    }
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function editRecord() {
  if (!foundStudent.value) return
  router.push(`/edit-record/${foundStudent.value.id || foundStudent.value.username}`)
}

function clearResult() {
  foundStudent.value = null
  interviewRecords.value = []
  message.value = ''
  isError.value = false
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.form { max-width: 420px; margin-top: 24px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
.buttons { margin-top: 16px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.results-section { margin-top: 30px; }
.results-section h2 { margin-bottom: 14px; font-size: 18px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.record-section { margin-top: 26px; }
.record-header { display: flex; justify-content: space-between; align-items: center; }
.result-actions { margin-top: 20px; }
.result-actions button { margin-right: 10px; }
.empty { color: #6b7280; }
</style>
