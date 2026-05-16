<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Mentor Search Result</h1>
        <p class="desc">
          Search result includes mentor information and group ID. Click group ID to view members.
        </p>
      </div>
      <button class="secondary" @click="searchAgain">Search Again</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="results.length > 0">
      <thead>
      <tr>
        <th>Mentor ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Office</th>
        <th>Department</th>

        <!-- 修改点：文档要求显示 group ID -->
        <th>Group ID</th>

        <th>Operation</th>
      </tr>
      </thead>

      <tbody>
      <tr v-for="m in results" :key="m.mentorId">
        <td>{{ m.mentorId }}</td>
        <td>{{ m.mentorName }}</td>
        <td>{{ m.email }}</td>
        <td>{{ m.office || 'N/A' }}</td>
        <td>{{ m.departmentName || 'N/A' }}</td>

        <td>
          <template v-if="getMentorGroupIds(m).length > 0">
            <button
                v-for="gid in getMentorGroupIds(m)"
                :key="gid"
                class="group-link"
                @click="showMembers(gid)"
            >
              {{ gid }}
            </button>
          </template>

          <span v-else class="muted">N/A</span>
        </td>

        <td>
          <button
              v-if="getMentorGroupIds(m).length === 1"
              @click="showMembers(getMentorGroupIds(m)[0])"
          >
            Show Members
          </button>

          <span v-else-if="getMentorGroupIds(m).length > 1" class="muted">
              Click group ID
            </span>

          <span v-else class="muted">
              No group ID
            </span>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No mentor information found. Please go back and search again.</p>

    <div class="actions">
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole } from '../types'
import { getMentorsByOrg, searchAllMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const route = useRoute()
const router = useRouter()
const role = getRole()

const message = ref('')
const results = ref<MentorFromApi[]>([])
const isLoading = ref(true)

/**
 * 修改点：
 * 统一从 mentor 结果中提取 group ID。
 * 不能再用 mentorId 当 groupId。
 */
function getMentorGroupIds(mentor: MentorFromApi): string[] {
  const ids: string[] = []

  if (mentor.groupId !== undefined && mentor.groupId !== null && String(mentor.groupId).trim()) {
    ids.push(String(mentor.groupId).trim())
  }

  if (mentor.mcpGroupId !== undefined && mentor.mcpGroupId !== null && String(mentor.mcpGroupId).trim()) {
    ids.push(String(mentor.mcpGroupId).trim())
  }

  if (Array.isArray(mentor.groupIds)) {
    for (const gid of mentor.groupIds) {
      if (gid !== undefined && gid !== null && String(gid).trim()) {
        ids.push(String(gid).trim())
      }
    }
  } else if (typeof mentor.groupIds === 'string' && mentor.groupIds.trim()) {
    mentor.groupIds
        .split(',')
        .map((gid) => gid.trim())
        .filter(Boolean)
        .forEach((gid) => ids.push(gid))
  }

  return Array.from(new Set(ids))
}

onMounted(async () => {
  const kw = String(route.query.keyword || route.query.name || '').trim()

  try {
    if (!kw) {
      message.value = 'Warning: Please enter mentor name, email, or group ID.'
      return
    }

    if (role === 'consultant') {
      /**
       * 修改点：
       * Faculty Consultant 全局搜索 mentor。
       */
      results.value = await searchAllMentors(kw)
    } else if (role === 'coordinator') {
      const orgId = String(route.query.orgId || '').trim()

      if (!orgId) {
        message.value = 'Please select a department first.'
        return
      }

      /**
       * 修改点：
       * Coordinator 在 department 范围搜索 mentor。
       */
      results.value = await getMentorsByOrg(orgId, kw)
    } else {
      message.value = 'Authorization warning: You do not have permission to search mentor information.'
    }
  } catch (err: any) {
    if (err.message?.includes('401')) {
      message.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403')) {
      message.value = 'Authorization warning: You cannot view mentor information outside your scope.'
    } else {
      message.value = 'Search failed: ' + (err.message || 'Unknown error')
    }
  } finally {
    isLoading.value = false
  }
})

function showMembers(groupId: string | undefined) {
  message.value = ''

  const gid = String(groupId ?? '').trim()

  if (!gid) {
    message.value = 'Warning: Group ID is missing.'
    return
  }

  /**
   * 修改点：
   * 传 groupId，不传 mentorId。
   */
  router.push(`/group-members/${encodeURIComponent(gid)}`)
}

function searchAgain() {
  router.push('/search-mentor')
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  vertical-align: top;
}

th {
  background: #f3f4f6;
}

.actions {
  margin-top: 20px;
}

.actions button {
  margin-right: 10px;
}

.error {
  margin-top: 14px;
  color: #dc2626;
}

.empty {
  color: #6b7280;
}

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}

.group-link {
  background: transparent;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  margin-right: 10px;
  font-weight: 600;
  text-decoration: underline;
}

.muted {
  color: #6b7280;
}
</style>
