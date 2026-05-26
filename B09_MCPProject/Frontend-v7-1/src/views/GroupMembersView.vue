<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Members</h1>

        <!--
          修改点 (v8)：
          展示用的 Group ID 走学年标识形式 (e.g. 2024-2025-Y1)，从 query string
          ?gid=xxx 拿，URL path 里可能是 UUID 形式的 groupKey，不能直接展示。
          没有 query 时（旧链路），fallback 到 path 参数。
        -->
        <p class="desc">Group ID: {{ displayGroupId }}</p>
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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecordsByGroup } from '../api/mentoring'
import type { StudentGroupRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()

/**
 * 修改点 (v8)：
 * URL path 是后端用于精确定位的标识：
 *   - 新链路 (SearchMentorView)：path 是 groupKey (UUID 唯一标识)
 *   - 旧链路 (MentorResultView 等)：path 仍是学年标识形式的 groupId
 * 展示用的 group 学年标识从 query string ?gid=xxx 拿，
 * 没传时 fallback 到 path 本身（旧链路场景下两者本就同值）。
 */
const routeParamId = String(route.params.groupId || '').trim()
const queryGid = String(route.query.gid || '').trim()
const displayGroupId = computed(() => queryGid || routeParamId)

const students = ref<StudentGroupRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

/**
 * 修改点：
 * group 标识符格式校验。允许学年标识 (2024-2025-Y2) 和 UUID
 * (cc001122334455667788990011aa0001) 两种形态，
 * 因此放宽长度上限到 64 字符。
 */
const GROUP_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/

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
    const validationError = validateGroupId(routeParamId)

    if (validationError) {
      errorMsg.value = validationError
      return
    }

    /**
     * 修改点 (v8)：
     * 用 routeParamId（可能是 groupKey UUID，也可能是学年标识 groupId）
     * 调用后端，由后端去做精确定位。
     */
    students.value = await getRecordsByGroup(routeParamId)
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
  /**
   * 修改点 (v8)：
   * 修复「点 Back 跳回空白 search-mentor 页」的问题。
   * 优先用浏览器 history.back，这样能命中 SearchMentorView 的
   * sessionStorage 恢复逻辑，回到带搜索结果的页面。
   * 如果没有历史栈（用户直接通过 URL 进来）则退回 /search-mentor。
   */
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/search-mentor')
  }
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
