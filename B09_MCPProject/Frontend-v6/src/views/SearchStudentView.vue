<template>
  <div class="page-card">
    <h1>Search Student's Info</h1>

    <p class="desc">
      Mentors and MCP Coordinators can search student information by student ID.
    </p>

    <div class="form">
      <label>Student ID</label>

      <!-- 修改点：搜索字段明确为 Student ID -->
      <input
          v-model="studentId"
          type="text"
          placeholder="Enter student ID, e.g. 330026143"
          @keyup.enter="searchStudent"
      />

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

    <div v-if="foundStudent" class="results-section">
      <h2>Student Information</h2>

      <table>
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Username</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
        </tr>
        </thead>

        <tbody>
        <tr>
          <td>{{ foundStudent.id }}</td>
          <td>{{ foundStudent.username }}</td>
          <td>{{ foundStudent.realName || foundStudent.username }}</td>
          <td>{{ foundStudent.email || 'N/A' }}</td>
          <td>{{ foundStudent.phone || 'N/A' }}</td>
          <td>{{ formatStatus(foundStudent.status) }}</td>
        </tr>
        </tbody>
      </table>

      <div class="record-section">
        <div class="record-header">
          <h2>Interview Records</h2>
          <button v-if="canEdit" @click="editRecord">Edit Interview Record</button>
        </div>

        <!-- 修改点：records 加载失败时显示提示，不再静默失败 -->
        <p v-if="recordMessage" class="message" :class="{ error: isRecordError }">
          {{ recordMessage }}
        </p>

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

            <!-- 修改点：恢复 formatDate() 方法 -->
            <td>{{ formatDate(record.interviewDate) }}</td>

            <td>{{ record.interviewTime || 'N/A' }}</td>
            <td>{{ record.problemStatement || 'N/A' }}</td>
            <td>{{ record.interviewSummary || 'N/A' }}</td>
            <td>{{ record.followupAction || 'N/A' }}</td>
          </tr>
          </tbody>
        </table>

        <p v-else-if="!recordMessage" class="empty">
          No interview records found.
        </p>
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
import { lookupStudent, fetchRecordsForStudent } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'
import type { StudentFromApi } from '../api/org'

const router = useRouter()

const studentId = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

const recordMessage = ref('')
const isRecordError = ref(false)

const foundStudent = ref<StudentFromApi | null>(null)
const interviewRecords = ref<McpRecord[]>([])

const canEdit = computed(() => getRole() === 'mentor')

/**
 * 修改点：
 * 正式 Student ID 是 9 位数字，例如 330026143。
 *
 * 如果你还要临时测旧数据 test_stu_out_01，
 * 可以临时改成：
 * const STUDENT_ID_PATTERN = /^(\d{9}|[A-Za-z0-9_-]{2,50})$/
 */
const STUDENT_ID_PATTERN = /^\d{9}$/

function validateStudentId(input: string): string {
  if (!input) {
    return 'Warning: Student ID cannot be empty.'
  }

  if (!STUDENT_ID_PATTERN.test(input)) {
    return 'Warning: Invalid Student ID format. Student ID should be 9 digits.'
  }

  return ''
}

/**
 * 修改点：
 * 恢复 formatDate 方法。
 */
function formatDate(d: any): string {
  if (!d) return 'N/A'
  if (typeof d === 'string') return d.substring(0, 10)
  return String(d)
}

/**
 * 修改点：
 * status 可能是 number/string/null。
 */
function formatStatus(status: string | number | null | undefined): string {
  if (status === 1 || status === '1') return 'Active'
  if (status === 0 || status === '0') return 'Inactive'
  return status ? String(status) : 'N/A'
}

async function searchStudent() {
  message.value = ''
  isError.value = false
  recordMessage.value = ''
  isRecordError.value = false
  foundStudent.value = null
  interviewRecords.value = []

  const input = studentId.value.trim()

  /**
   * 修改点：
   * 搜索前做 ID 格式校验。
   */
  const validationError = validateStudentId(input)
  if (validationError) {
    message.value = validationError
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    /**
     * 修改点 (新接口 B09 / Mentor 权限收敛)：
     * 之前 mentor 直接调 /api/org/student/{id}，能搜到任意学生，
     * 包括其他 mentor 组里的学生 —— 是个权限漏洞。
     *
     * 改用 lookupStudent：内部按 role 分流
     *   mentor                  → /mentoring/records/students/search?studentId=
     *                             (后端校验：必须在 mentor 自己组内)
     *   coordinator/consultant  → /org/student/{id} (维持原行为)
     */
    const studentResult = await lookupStudent(input)

    if (!studentResult) {
      message.value = 'No matching student record is found.'
      isError.value = true
      return
    }

    foundStudent.value = studentResult

    try {
      /**
       * 修改点 (FIX)：
       * 之前直接调 getRecordsByStudent → /mentoring/records/student/{id}
       * 这个接口对 Mentor 角色没权限（403），导致 mentor 搜到学生但
       * interview record 死活展示不出来。
       *
       * 改用 fetchRecordsForStudent —— 内部按 role 分流：
       *   mentor      → /mentoring/records/mine，再按 studentId 过滤
       *   coordinator → /mentoring/records/student/{studentId}
       */
      interviewRecords.value = await fetchRecordsForStudent(input)
    } catch (recordErr: any) {
      recordMessage.value = recordErr.message?.includes('403')
          ? 'Authorization warning: You do not have permission to view interview records.'
          : 'Interview records could not be loaded.'
      isRecordError.value = true
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

  /**
   * FIX: Pass the original 9-digit student number, not studentResult.id
   * (which is the system internal ID and may not be 9 digits).
   */
  router.push(`/edit-record/${encodeURIComponent(studentId.value.trim())}`)
}

function clearResult() {
  foundStudent.value = null
  interviewRecords.value = []
  message.value = ''
  isError.value = false
  recordMessage.value = ''
  isRecordError.value = false
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.form {
  max-width: 420px;
  margin-top: 24px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.buttons {
  margin-top: 16px;
}

.buttons button {
  margin-right: 10px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #dc2626;
}

.results-section {
  margin-top: 30px;
}

.results-section h2 {
  margin-bottom: 14px;
  font-size: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
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

.record-section {
  margin-top: 26px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-actions {
  margin-top: 20px;
}

.result-actions button {
  margin-right: 10px;
}

.empty {
  color: #6b7280;
}
</style>
