<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Members</h1>
<<<<<<< HEAD
=======

        <!--
          修改点 (v10)：
          展示用的 Group ID 走学年标识形式 (e.g. 2024-2025-Y1)。
          新链路下从后端返回的 group.groupLabel / group.name / mentor.groupId 拿，
          否则 fallback 到 query string ?gid=xxx，最后再退到 path 参数本身。
        -->
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
        <p class="desc">Group ID: {{ displayGroupId }}</p>
      </div>

      <button class="secondary" @click="goBack">Back</button>
    </div>

    <div v-if="isLoading" class="loading">
      Loading group members...
    </div>

    <template v-else>
      <!--
        修改点 (v10 NEW)：
        新链路（从 SearchMentorView 点 groupKey 进来）展示 group 信息卡片
        和 mentor 信息卡片，让用户看到完整画像。
      -->
      <div v-if="groupCard" class="info-card">
        <h2>Group</h2>
        <div class="info-row">
          <span class="label">Group Label:</span>
          <span>{{ groupCard.groupLabel || groupCard.name || groupCard.groupId || '-' }}</span>
        </div>
        <!--
          修改点 (v10)：
          按用户要求，不再展示 groupKey 这一行 UUID 信息。
          groupKey 仍然保留在 URL path 里供接口使用，但不再露给用户看。
        -->
        <div v-if="groupCard.facultyOrgId" class="info-row">
          <span class="label">Faculty Org:</span>
          <span>{{ groupCard.facultyOrgId }}</span>
        </div>
        <div class="info-row">
          <span class="label">Student Count:</span>
          <span>{{ studentCount }}</span>
        </div>
      </div>

<<<<<<< HEAD
        <tbody>
        <tr v-for="s in students" :key="String(s.studentId)">
          <td>{{ s.studentId }}</td>
          <td>{{ s.majorId || 'N/A' }}</td>
          <td>{{ s.status || 'N/A' }}</td>
          <td>{{ s.groupId || displayGroupId }}</td>
          <td>{{ s.interviewRecords?.length || 0 }} records</td>

          <td>
            <button class="link-button" @click="viewRecord(String(s.studentId))">
              View Record
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
=======
      <div v-if="mentorCard" class="info-card">
        <h2>Assigned Mentor</h2>
        <div class="info-row">
          <span class="label">Mentor ID:</span>
          <span>{{ mentorCard.mentorId || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Name:</span>
          <span>{{ mentorCard.mentorName || '-' }}</span>
        </div>
        <div v-if="mentorCard.email" class="info-row">
          <span class="label">Email:</span>
          <span>{{ mentorCard.email }}</span>
        </div>
        <div v-if="mentorCard.office" class="info-row">
          <span class="label">Office:</span>
          <span>{{ mentorCard.office }}</span>
        </div>
        <div v-if="mentorCard.departmentName" class="info-row">
          <span class="label">Department:</span>
          <span>{{ mentorCard.departmentName }}</span>
        </div>
      </div>

      <!-- 学生列表 -->
      <div v-if="students.length > 0">
        <h2 v-if="groupCard">Student Members</h2>
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5

        <table>
          <thead>
          <tr>
            <th>Student ID</th>
            <!--
              修改点 (v10)：
              老链路 (getRecordsByGroup) 拿得到 majorId / status / records，
              新链路 (getGroupByKey) 只有 studentId。
              下面这些列只在「老链路」模式下显示，新链路只展示 Student ID。
            -->
            <template v-if="viewMode === 'records'">
              <th>Major</th>
              <th>Status</th>
              <th>Group ID</th>
              <th>Records</th>
            </template>
            <th>Operation</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="s in students" :key="String(s.studentId)">
            <td>{{ s.studentId }}</td>
            <template v-if="viewMode === 'records'">
              <td>{{ s.majorId || 'N/A' }}</td>
              <td>{{ s.status || 'N/A' }}</td>
              <td>{{ s.groupId }}</td>
              <td>{{ s.interviewRecords?.length || 0 }} records</td>
            </template>

            <td>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
<<<<<<< HEAD
import {
  getGroupMembers,
  getRecordsByGroup,
  searchGroup,
  type GroupMember,
  type StudentGroupRecord,
} from '../api/mentoring'
=======
import { getRecordsByGroup } from '../api/mentoring'
import type { StudentGroupRecord } from '../api/mentoring'
import { getGroupByKey } from '../api/org'
import type { GroupByKeyGroup, MentorInfo } from '../api/org'
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5

const route = useRoute()
const router = useRouter()

<<<<<<< HEAD
const routeParamId = String(route.params.groupId || '').trim()
const queryGid = String(route.query.gid || '').trim()
const majorId = String(route.query.majorId || '').trim() || undefined
const displayGroupId = computed(() => queryGid || routeParamId)
=======
/**
 * 修改点 (v10)：
 * URL path 是后端用于精确定位的标识，两种形态：
 *   - 新链路 (SearchMentorView)：path 是 groupKey (UUID 形态，32+ 位无短横线)
 *   - 旧链路 (MentorResultView 等)：path 是学年标识形式 (含短横线，e.g. 2024-2025-Y1)
 * 展示用的 group label 优先：
 *   后端返回的 group.groupLabel/group.name/mentor.groupId
 *   > query string ?gid=xxx
 *   > path 参数本身
 */
const routeParamId = String(route.params.groupId || '').trim()
const queryGid = String(route.query.gid || '').trim()
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5

/**
 * 修改点 (v10)：
 * 启发式判断 path 参数是 groupKey 还是学年标识形式的 groupId：
 *   - 仅含字母/数字、长度 >= 20  → groupKey (走新接口 /api/org/groups/by-key/...)
 *   - 否则 (含短横线 / 短长度)    → 学年标识 (走旧接口 /api/mentoring/records/group/...)
 * 不严格用 32-hex 是为了适配后端可能产生的其他 hash-like 唯一标识。
 */
function looksLikeGroupKey(s: string): boolean {
  return /^[A-Za-z0-9]{20,}$/.test(s)
}

const viewMode = ref<'records' | 'byKey'>(
  looksLikeGroupKey(routeParamId) ? 'byKey' : 'records',
)

// 旧接口数据：完整 student records
const students = ref<StudentGroupRecord[]>([])

// 新接口数据：group / mentor / 学生 ID 列表
const groupCard = ref<GroupByKeyGroup | null>(null)
const mentorCard = ref<MentorInfo | null>(null)
const studentCount = ref(0)

const isLoading = ref(true)
const errorMsg = ref('')

<<<<<<< HEAD
=======
const displayGroupId = computed(() => {
  // 新链路且接口返回成功后，优先用 group label / name
  if (groupCard.value) {
    const fromServer =
      groupCard.value.groupLabel ||
      groupCard.value.name ||
      groupCard.value.groupId
    if (fromServer && String(fromServer).trim()) {
      return String(fromServer).trim()
    }
  }
  return queryGid || routeParamId
})

/**
 * 修改点：
 * group 标识符格式校验。允许学年标识 (2024-2025-Y2) 和 UUID
 * (cc001122334455667788990011aa0001) 两种形态，
 * 因此放宽长度上限到 64 字符。
 */
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
const GROUP_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/

function validateGroupId(input: string): string {
  if (!input) return 'Group ID cannot be empty.'
  if (!GROUP_ID_PATTERN.test(input)) return 'Invalid Group ID format.'
  return ''
}

function memberToRow(member: GroupMember, groupLabel: string): StudentGroupRecord {
  return {
    studentId: String(member.studentId),
    majorId: member.majorId,
    status: member.status,
    groupId: member.groupId || groupLabel,
    interviewRecords: [],
  }
}

async function loadGroupMembers(): Promise<StudentGroupRecord[]> {
  const data = await searchGroup(routeParamId, majorId)

  if (data.members?.length) {
    return data.members.map((member) => memberToRow(member, displayGroupId.value))
  }

  const members = await getGroupMembers(routeParamId, majorId)
  if (members.length) {
    return members.map((member) => memberToRow(member, displayGroupId.value))
  }

  return getRecordsByGroup(routeParamId, majorId)
}

onMounted(async () => {
  try {
    const validationError = validateGroupId(routeParamId)
    if (validationError) {
      errorMsg.value = validationError
      return
    }

<<<<<<< HEAD
    students.value = await loadGroupMembers()
=======
    if (viewMode.value === 'byKey') {
      /**
       * 修改点 (v10)：
       * 新接口 /api/org/groups/by-key/{groupKey}
       * 返回 { group, mentor, studentMemberIds, studentCount }。
       * studentMemberIds 是字符串数组，前端把它简单包成
       * { studentId } 喂给同一个学生表格渲染。
       */
      const data = await getGroupByKey(routeParamId)
      groupCard.value = data.group || null
      mentorCard.value = data.mentor || null
      studentCount.value = data.studentCount
      students.value = data.studentMemberIds.map(
        (sid) => ({ studentId: sid } as StudentGroupRecord),
      )
    } else {
      /**
       * 旧链路：保留原来的 getRecordsByGroup 实现，
       * 拿回完整 StudentGroupRecord（带 majorId / status / records）。
       */
      students.value = await getRecordsByGroup(routeParamId)
    }
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
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
})

function viewRecord(studentId: string) {
  router.push(`/student-record/${encodeURIComponent(studentId)}`)
}

function goBack() {
<<<<<<< HEAD
=======
  /**
   * 修改点 (v8)：
   * 优先用浏览器 history.back，让 SearchMentorView 的 sessionStorage
   * 恢复逻辑生效，回到带搜索结果的页面。
   */
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
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

.info-card {
  margin-top: 18px;
  padding: 14px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.info-card h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #111827;
}

.info-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  padding: 4px 0;
}

.info-row .label {
  color: #6b7280;
  font-weight: 600;
}

.mono {
  font-family: monospace;
  font-size: 12px;
  color: #4b5563;
  word-break: break-all;
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
