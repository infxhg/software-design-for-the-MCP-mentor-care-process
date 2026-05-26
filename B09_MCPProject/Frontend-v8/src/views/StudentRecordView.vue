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
        <!-- 修改点：studentId 现在就是真正的 Student ID -->
        <div><strong>Student ID</strong><p>{{ studentId }}</p></div>

        <div v-if="userInfo">
          <strong>Username</strong><p>{{ userInfo.username }}</p>
        </div>

        <div v-if="userInfo">
          <strong>Name</strong><p>{{ userInfo.realName || userInfo.username }}</p>
        </div>

        <div v-if="userInfo">
          <strong>Email</strong><p>{{ userInfo.email || 'N/A' }}</p>
        </div>

        <div v-if="userInfo">
          <strong>Phone</strong><p>{{ userInfo.phone || 'N/A' }}</p>
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
import { getRecordsByStudent, lookupStudent } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'
import type { StudentFromApi } from '../api/org'

const route = useRoute()
const router = useRouter()

/**
 * 修改点：
 * 这里统一认为 route 参数是 student.id。
 */
const studentId = String(route.params.studentId || '').trim()

const userInfo = ref<StudentFromApi | null>(null)
const studentExt = ref<StudentFromApi | null>(null)
const records = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

const recordMessage = ref('')
const isRecordError = ref(false)

const hasData = computed(() => userInfo.value || records.value.length > 0)

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

onMounted(async () => {
  try {
    /**
     * 修改点：
     * URL 参数校验。
     */
    const validationError = validateStudentId(studentId)
    if (validationError) {
      errorMsg.value = validationError
      return
    }

    /**
     * 修改点 (新接口 B09 / Mentor 权限收敛 - 纵深防御)：
     * 这个 view 路由 meta 已经限制为 consultant/coordinator，
     * 但出于纵深防御，统一走 lookupStudent，
     * 即使 mentor 通过 URL 直接进来，API 层也会拒绝越权访问。
     */
    const studentResult = await lookupStudent(studentId)

    if (!studentResult) {
      errorMsg.value = 'Student not found.'
      return
    }

    userInfo.value = studentResult
    studentExt.value = studentResult

    /**
     * 修改点：
     * records 查询使用 student.id。
     */
    try {
      /**
       * FIX: Use the 9-digit studentId from URL directly for records query.
       * Previously used studentResult.id (system internal ID) which could
       * be a different format and cause the mentoring API to fail.
       */
      records.value = await getRecordsByStudent(studentId)
    } catch (recordErr: any) {
      recordMessage.value = recordErr.message?.includes('403')
          ? 'Authorization warning: You do not have permission to view interview records.'
          : 'Interview records could not be loaded.'
      isRecordError.value = true
    }
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
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 24px;
  margin-bottom: 28px;
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

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}
</style>
