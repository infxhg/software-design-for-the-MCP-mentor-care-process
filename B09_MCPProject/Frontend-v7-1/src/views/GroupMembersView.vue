<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Members</h1>

        <!-- 修改点：这里明确显示 Group ID，避免和 mentorId 混淆 -->
        <p class="desc">Group ID: {{ groupId }}</p>
      </div>

      <button class="secondary" @click="goBack">Back</button>
    </div>

    <div v-if="isLoading" class="loading">
      Loading group members...
    </div>

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
        <tr v-for="s in students" :key="String(s.studentId)">
          <td>{{ s.studentId }}</td>
          <td>{{ s.majorId || 'N/A' }}</td>
          <td>{{ s.status || 'N/A' }}</td>
          <td>{{ s.groupId }}</td>
          <td>{{ s.interviewRecords?.length || 0 }} records</td>

          <td>
            <!-- 修改点：点击学生查看该学生记录，传 studentId -->
            <button class="link-button" @click="viewRecord(String(s.studentId))">
              View Record
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!errorMsg" class="empty">
      No students found in this group.
    </p>

    <p v-if="errorMsg" class="error">
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecordsByGroup } from '../api/mentoring'
import type { StudentGroupRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()

/**
 * 修改点：
 * 这里 route 参数必须是 groupId。
 * 前面 SearchMentorView / MentorResultView 点击 groupId 后会跳到：
 * /group-members/{groupId}
 */
const groupId = String(route.params.groupId || '').trim()
const majorId = String(route.query.majorId || '').trim() || undefined

const students = ref<StudentGroupRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

/**
 * 修改点：
 * group ID 格式校验。
 * 文档里 group ID 类似 AcademicYear-Year，例如 2024-2025-Y2。
 * 这里允许字母、数字、下划线、横线。
 */
const GROUP_ID_PATTERN = /^[A-Za-z0-9_-]{2,50}$/

function validateGroupId(input: string): string {
  if (!input) {
    return 'Group ID cannot be empty.'
  }

  if (!GROUP_ID_PATTERN.test(input)) {
    return 'Invalid Group ID format.'
  }

  return ''
}

onMounted(async () => {
  try {
    /**
     * 修改点：
     * 加 groupId 格式校验，避免 URL 里乱输。
     */
    const validationError = validateGroupId(groupId)

    if (validationError) {
      errorMsg.value = validationError
      return
    }

    /**
     * 修改点：
     * 这里必须用 groupId 查组内学生和记录。
     * 不能用 mentorId。
     */
    students.value = await getRecordsByGroup(groupId, majorId)
  } catch (err: any) {
    if (err.message?.includes('401')) {
      errorMsg.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403')) {
      errorMsg.value = 'Authorization warning: You do not have permission to view this group.'
    } else {
      errorMsg.value = err.message || 'Failed to load group members.'
    }
  } finally {
    isLoading.value = false
  }
}) // 修改点：这里必须是 "})"，不能只写 "}"，否则会报 Unexpected token

function viewRecord(studentId: string) {
  /**
   * 修改点：
   * 这里传 studentId，StudentRecordView 负责按 studentId 查记录。
   */
  router.push(`/student-record/${encodeURIComponent(studentId)}`)
}

function goBack() {
  router.push('/search-mentor')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.desc {
  color: #6b7280;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 22px;
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

.empty {
  margin-top: 18px;
  color: #6b7280;
}

.error {
  margin-top: 14px;
  color: #dc2626;
}

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}

.link-button {
  background: transparent;
  color: #2563eb;
  padding: 0;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.link-button:hover {
  text-decoration: underline;
}

.secondary {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
}
</style>
