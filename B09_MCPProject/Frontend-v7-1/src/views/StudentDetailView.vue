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
        <!-- 修改点：明确展示 Student ID -->
        <div><strong>Student ID</strong><p>{{ student.id }}</p></div>
        <div><strong>Username</strong><p>{{ student.username }}</p></div>
        <div><strong>Name</strong><p>{{ student.realName || student.username }}</p></div>
        <div><strong>Email</strong><p>{{ student.email || 'N/A' }}</p></div>
        <div><strong>Phone</strong><p>{{ student.phone || 'N/A' }}</p></div>
        <div><strong>Status</strong><p>{{ formatStatus(student.status) }}</p></div>
      </div>

      <div class="record-section">
        <div class="record-header">
          <h2>Interview Records</h2>
          <button v-if="canEdit" @click="editRecord">Edit Interview Record</button>
        </div>

        <p v-if="limitedProfileMessage" class="message warning">
          {{ limitedProfileMessage }}
        </p>

        <!-- 修改点：records 加载失败时显示提示 -->
        <p v-if="recordMessage" class="message" :class="{ error: isRecordError }">
          {{ recordMessage }}
        </p>

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

            <!-- 修改点：恢复 formatDate() 方法 -->
            <td>{{ formatDate(r.interviewDate) }}</td>

            <td>{{ r.interviewTime || 'N/A' }}</td>
            <td>{{ r.problemStatement || 'N/A' }}</td>
            <td>{{ r.interviewSummary || 'N/A' }}</td>
            <td>{{ r.followupAction || 'N/A' }}</td>
          </tr>
          </tbody>
        </table>

        <p v-else-if="!recordMessage" class="empty">No interview records.</p>
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
import { lookupStudent, fetchRecordsForStudent } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'
import type { StudentFromApi } from '../api/org'

const route = useRoute()
const router = useRouter()

/**
 * 修改点：
 * 这个 route 参数现在是 student.id，不是 username。
 */
const studentId = String(route.params.studentId || '').trim()

const student = ref<StudentFromApi | null>(null)
const records = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

const recordMessage = ref('')
const isRecordError = ref(false)
const limitedProfileMessage = ref('')

const canEdit = computed(() => getRole() === 'mentor')

/**
 * 修改点：
 * Student ID 是 9 位数字。
 */
const STUDENT_ID_PATTERN = /^\d{9}$/

function validateStudentId(input: string): string {
  if (!input) return 'Student ID cannot be empty.'

  const role = getRole()
  if (role === 'coordinator' || role === 'consultant') {
    if (!/^[A-Za-z0-9_-]+$/.test(input)) {
      return 'Invalid student identifier format.'
    }
    return ''
  }

  if (!STUDENT_ID_PATTERN.test(input)) {
    return 'Invalid Student ID format. Student ID should be 9 digits.'
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

function formatStatus(status: string | number | null | undefined): string {
  if (status === 1 || status === '1') return 'Active'
  if (status === 0 || status === '0') return 'Inactive'
  return status ? String(status) : 'N/A'
}

onMounted(async () => {
  try {
    /**
     * 修改点：
     * URL 参数也校验，避免直接输入非法 id。
     */
    const validationError = validateStudentId(studentId)
    if (validationError) {
      errorMsg.value = validationError
      return
    }

    /**
     * 修改点 (新接口 B09 / Mentor 权限收敛)：
     * mentor 用 lookupStudent → /mentoring/records/students/search
     * 其他角色继续走 /org/student/{id}。详见 mentoring.ts.
     */
    const studentResult = await lookupStudent(studentId)

    if (!studentResult) {
      errorMsg.value = 'Student not found.'
      return
    }

    student.value = studentResult

    if (
      String(studentResult.realName || studentResult.name || '').trim() === studentId &&
      !studentResult.email
    ) {
      limitedProfileMessage.value =
        'Basic student profile only. This student is linked from a forwarded case but is outside your department lookup scope.'
    }

    try {
      records.value = await fetchRecordsForStudent(studentId)
      if (!records.value.length && limitedProfileMessage.value) {
        recordMessage.value =
          'No interview records are available for this student in your coordinator scope.'
        isRecordError.value = false
      }
    } catch (recordErr: any) {
      recordMessage.value = recordErr.message?.includes('403')
          ? 'Authorization warning: You do not have permission to view interview records.'
          : 'Interview records could not be loaded.'
      isRecordError.value = true
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load student info.'
  } finally {
    isLoading.value = false
  }
})

function editRecord() {
  if (!student.value) return

  /**
   * FIX: Pass the original 9-digit studentId (from URL), not student.value.id
   * (which is the system internal ID).
   */
  router.push(`/edit-record/${encodeURIComponent(studentId)}`)
}

function goBack() {
  if (route.query.source === 'case') {
    router.push('/coordinator/forward-case')
    return
  }
  router.push('/search-student')
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.header,
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header button {
  margin-left: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 24px;
}

.info-grid div {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.info-grid p {
  margin-bottom: 0;
  word-break: break-all;
}

.record-section {
  margin-top: 30px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
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

.message {
  margin-top: 14px;
  color: #047857;
}

.empty {
  color: #6b7280;
}

.error {
  color: #dc2626;
}

.warning {
  color: #92400e;
  background: #fffbeb;
  padding: 12px 14px;
  border-radius: 8px;
}

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}
</style>
