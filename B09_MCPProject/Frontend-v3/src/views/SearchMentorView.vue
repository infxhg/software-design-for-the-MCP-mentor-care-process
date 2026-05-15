<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>

    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by mentor name, email, or group ID.
    </p>

    <div class="form">
      <!-- 修改点：
        Coordinator 不能用全局 mentor search。
        所以 Coordinator 需要提供 orgUnitId。
        Faculty Consultant 不显示这个输入框。
      -->
      <div v-if="role === 'coordinator'" class="form-item">
        <label>Org Unit ID</label>
        <input
            v-model="orgUnitId"
            type="text"
            placeholder="Enter org unit ID, e.g. org_dcs or group_a1"
        />

        <p class="hint">
          For MCP Coordinator: enter department ID or group ID if the keyword is not a group ID.
        </p>
      </div>

      <div class="form-item">
        <label>Search Keyword (name, email, or group ID)</label>
        <input
            v-model="keyword"
            type="text"
            placeholder="Enter mentor name, email, or group ID"
            @keyup.enter="searchMentor"
        />
      </div>

      <div class="buttons">
        <button @click="searchMentor" :disabled="isLoading">
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>
    </div>

    <div v-if="results.length > 0" class="results-section">
      <h2>Search Results ({{ results.length }} found)</h2>

      <table>
        <thead>
        <tr>
          <th>Mentor ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Office</th>
          <th>Department / Org</th>
          <th>Group ID</th>
          <th>Operation</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="mentor in results" :key="mentor.mentorId">
          <td>{{ mentor.mentorId }}</td>
          <td>{{ mentor.mentorName }}</td>
          <td>{{ mentor.email }}</td>
          <td>{{ mentor.office || 'N/A' }}</td>
          <td>{{ mentor.departmentName || 'N/A' }}</td>

          <td>
            <template v-if="getDisplayGroupIds(mentor).length > 0">
              <button
                  v-for="gid in getDisplayGroupIds(mentor)"
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
                v-if="getDisplayGroupIds(mentor).length === 1"
                @click="showMembers(getDisplayGroupIds(mentor)[0])"
            >
              Show Members
            </button>

            <span v-else-if="getDisplayGroupIds(mentor).length > 1" class="muted">
                Click group ID
              </span>

            <span v-else class="muted">
                No group ID
              </span>
          </td>
        </tr>
        </tbody>
      </table>

      <div class="actions">
        <button class="secondary" @click="searchAgain">Search Again</button>
      </div>

      <p v-if="actionMsg" class="error">{{ actionMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRole } from '../types'
import { getMentorsByOrg, searchAllMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const router = useRouter()
const role = getRole()

const orgUnitId = ref('')
const keyword = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const actionMsg = ref('')

const results = ref<MentorFromApi[]>([])

/**
 * 修改点：
 * 记录本次是否通过 group ID 查询。
 *
 * 用途：
 * 如果后端 response 没返回 groupId，但本次搜索条件本身就是 group_a1，
 * 前端可以临时把 group_a1 显示为 Group ID，并支持点击进入 group members。
 */
const searchedGroupId = ref('')

/**
 * 修改点：
 * keyword 支持 name / email / group ID。
 * 不能做太严格的格式限制，否则 email 和 group ID 会被误拦。
 */
function validateKeyword(input: string): string {
  if (!input) {
    return 'Warning: Please enter mentor name, email, or group ID.'
  }

  if (input.length > 100) {
    return 'Warning: Search keyword is too long.'
  }

  if (/[<>"'`;]/.test(input)) {
    return 'Warning: Search keyword contains invalid characters.'
  }

  return ''
}

/**
 * 修改点：
 * Coordinator 使用 orgUnitId 查询时，校验 orgUnitId。
 * 允许 org_dcs、group_a1、2024-2025-Y2 这类格式。
 */
function validateOrgUnitId(input: string): string {
  if (!input) {
    return 'Warning: Please enter org unit ID first.'
  }

  if (!/^[A-Za-z0-9_-]{2,50}$/.test(input)) {
    return 'Warning: Invalid org unit ID format.'
  }

  return ''
}

/**
 * 修改点：
 * 判断 keyword 是否是完整 group ID。
 * 当前数据库里的 group ID 类似 group_a1、group_b1。
 */
function looksLikeGroupId(value: string): boolean {
  return /^group_[A-Za-z0-9_-]+$/i.test(value.trim())
}

/**
 * 修改点：
 * 后端可能返回 groupId、mcpGroupId、groupIds。
 * 这里统一整理成 string[]。
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

/**
 * 修改点：
 * 优先显示后端返回的 groupId。
 *
 * 如果后端没返回 groupId，但这次搜索本身是 group_a1，
 * 就临时显示 searchedGroupId。
 *
 * 注意：
 * 这只是前端兼容。真正符合文档的做法是后端在 mentor search response 里返回 groupId/groupIds。
 */
function getDisplayGroupIds(mentor: MentorFromApi): string[] {
  const backendGroupIds = getMentorGroupIds(mentor)

  if (backendGroupIds.length > 0) {
    return backendGroupIds
  }

  if (searchedGroupId.value) {
    return [searchedGroupId.value]
  }

  return []
}

async function searchMentor() {
  message.value = ''
  isError.value = false
  actionMsg.value = ''
  results.value = []
  searchedGroupId.value = ''

  const kw = keyword.value.trim()
  const keywordError = validateKeyword(kw)

  if (keywordError) {
    message.value = keywordError
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    let list: MentorFromApi[]

    if (role === 'consultant') {
      /**
       * 修改点：
       * Faculty Consultant 永远使用全局搜索接口：
       * GET /api/org/mentors/search?keyword=xxx
       *
       * 不能因为 keyword 是 group_a1 就调用：
       * GET /api/org/mentors/group_a1
       *
       * 因为 /org/mentors/{orgUnitId} 是 Coordinator 视角接口，
       * Faculty Consultant 调用会触发 403。
       */
      if (looksLikeGroupId(kw)) {
        searchedGroupId.value = kw
      }

      list = await searchAllMentors(kw)
    } else if (role === 'coordinator') {
      /**
       * 修改点：
       * MCP Coordinator 不能调用全局 searchAllMentors。
       *
       * 如果 keyword 是 group_a1：
       *   GET /api/org/mentors/group_a1
       *
       * 如果 keyword 是 mentor name/email：
       *   需要输入 orgUnitId，例如 org_dcs
       *   GET /api/org/mentors/org_dcs?keyword=test_mentor_01
       */
      const keywordIsGroupId = looksLikeGroupId(kw)
      const orgId = keywordIsGroupId ? kw : orgUnitId.value.trim()

      const orgError = validateOrgUnitId(orgId)

      if (orgError) {
        message.value = orgError
        isError.value = true
        return
      }

      if (looksLikeGroupId(orgId)) {
        searchedGroupId.value = orgId
      }

      list = await getMentorsByOrg(orgId, keywordIsGroupId ? undefined : kw)
    } else {
      message.value = 'Authorization warning: You do not have permission to search mentor information.'
      isError.value = true
      return
    }

    if (list.length === 0) {
      message.value = 'No matching mentor information is found.'
      isError.value = true
      return
    }

    results.value = list
  } catch (err: any) {
    if (err.message?.includes('401')) {
      message.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403') || err.message?.includes("don't have the permission")) {
      message.value = 'Authorization warning: You cannot view mentor information outside your scope.'
    } else {
      message.value = 'Search failed: ' + (err.message || 'Unknown error')
    }

    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function showMembers(groupId: string) {
  actionMsg.value = ''

  const gid = String(groupId).trim()

  if (!gid) {
    actionMsg.value = 'Warning: Group ID is missing.'
    return
  }

  /**
   * 修改点：
   * 这里必须传 groupId，不能传 mentorId。
   */
  router.push(`/group-members/${encodeURIComponent(gid)}`)
}

function searchAgain() {
  results.value = []
  keyword.value = ''
  orgUnitId.value = ''
  message.value = ''
  isError.value = false
  actionMsg.value = ''
  searchedGroupId.value = ''
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
  max-width: 500px;
  margin-top: 24px;
}

.form-item {
  margin-top: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

input,
select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
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

.hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
}

.results-section {
  margin-top: 28px;
}

.results-section h2 {
  margin-bottom: 14px;
  font-size: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 11px 12px;
  border: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
  vertical-align: top;
}

th {
  background: #f3f4f6;
  font-weight: 600;
}

tbody tr:hover {
  background: #f9fafb;
}

.actions {
  margin-top: 20px;
}

.actions button {
  margin-right: 10px;
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
