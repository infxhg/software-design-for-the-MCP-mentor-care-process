<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>

    <!--
      修改点 (v6 task 3 & 4)：
      移除 group ID 搜索条件，文案改成 name / email。
    -->
    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by mentor name or email.
    </p>

    <div class="form">
      <!--
        修改点 (v6 task 4)：
        Coordinator 仍然需要先输入自己所在系的 org unit ID
        (走 GET /api/org/mentors/{orgUnitId}?keyword=xxx 接口)，
        但搜索条件与 Faculty 一致：只剩 Name / Email。
      -->
      <div v-if="role === 'coordinator'" class="form-item">
        <label>Department Org Unit ID</label>
        <input
            v-model="orgUnitId"
            type="text"
            placeholder="Enter department org unit ID, e.g. org_dcs"
        />

        <p class="hint">
          For MCP Coordinator: search is scoped to this department only.
        </p>
      </div>

      <!--
        修改点 (v6 task 3 & 4)：
        Faculty Consultant 和 Coordinator 共用同一个 "Search By" 下拉，
        只保留 Mentor Name / Mentor Email 两种选项 (移除 Group ID)。
      -->
      <div v-if="role === 'consultant' || role === 'coordinator'" class="form-item">
        <label>Search By</label>
        <select v-model="searchField">
          <option value="name">Mentor Name</option>
          <option value="email">Mentor Email</option>
        </select>

        <p class="hint" v-if="role === 'consultant'">
          Faculty Consultant: search globally across all faculties.
          Backend performs fuzzy matching against the selected field.
        </p>
        <p class="hint" v-else>
          MCP Coordinator: search inside your department.
          Backend performs fuzzy matching against the selected field.
        </p>
      </div>

      <div class="form-item">
        <label>{{ keywordLabel }}</label>
        <input
            v-model="keyword"
            type="text"
            :placeholder="keywordPlaceholder"
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

          <!--
            修改点 (v6 task 3 & 4)：
            Group ID 列保留 (需求文档要求结果里展示 group ID)，
            但只显示后端返回的 groupId / groupIds / mcpGroupId。
            前端不再用本次搜索关键字反推 group ID，
            因为用户已经不能按 group ID 搜了。
          -->
          <td>
            <template v-if="getMentorGroupIds(mentor).length > 0">
              <button
                  v-for="gid in getMentorGroupIds(mentor)"
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
                v-if="getMentorGroupIds(mentor).length === 1"
                @click="showMembers(getMentorGroupIds(mentor)[0])"
            >
              Show Members
            </button>

            <span v-else-if="getMentorGroupIds(mentor).length > 1" class="muted">
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRole } from '../types'
import { getMentorsByOrg, searchAllMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const router = useRouter()
const role = getRole()

/**
 * 修改点 (v6 task 3 & 4)：
 * 搜索字段只剩 'name' / 'email'，删除 'groupId'。
 * Faculty Consultant 和 Coordinator 共用这个下拉。
 */
type SearchField = 'name' | 'email'
const searchField = ref<SearchField>('name')

const orgUnitId = ref('')
const keyword = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const actionMsg = ref('')

const results = ref<MentorFromApi[]>([])

/**
 * 修改点 (v6 task 3 & 4)：
 * keyword 输入框的 label / placeholder 跟随 searchField 变化。
 */
const keywordLabel = computed(() => {
  switch (searchField.value) {
    case 'name':
      return 'Mentor Name'
    case 'email':
      return 'Mentor Email'
    default:
      return 'Search Keyword'
  }
})

const keywordPlaceholder = computed(() => {
  switch (searchField.value) {
    case 'name':
      return 'Enter mentor name, e.g. Zhang San'
    case 'email':
      return 'Enter mentor email, e.g. zhangsan@bnbu.edu.cn'
    default:
      return ''
  }
})

/**
 * 修改点 (v6 task 3 & 4)：
 * 按 searchField 做不同的格式校验，删除 groupId 分支。
 *   - name  : 只防特殊字符，长度 1–100
 *   - email : 必须像邮箱片段 (字母/数字/._%+-/@)
 */
function validateKeyword(input: string): string {
  if (!input) {
    return 'Warning: Please enter a search keyword.'
  }

  if (input.length > 100) {
    return 'Warning: Search keyword is too long.'
  }

  if (/[<>"'`;]/.test(input)) {
    return 'Warning: Search keyword contains invalid characters.'
  }

  if (searchField.value === 'email') {
    const looksLikeEmailFragment = /^[A-Za-z0-9._%+\-@]+$/.test(input)
    if (!looksLikeEmailFragment) {
      return 'Warning: Email keyword should only contain letters, digits, dots, "@" and "_+-".'
    }
  }
  // name 模式不再加额外限制

  return ''
}

/**
 * Coordinator 使用 orgUnitId 时的校验。
 * 允许 org_dcs、2024-2025-Y2 之类的格式。
 */
function validateOrgUnitId(input: string): string {
  if (!input) {
    return 'Warning: Please enter your department org unit ID first.'
  }

  if (!/^[A-Za-z0-9_-]{2,50}$/.test(input)) {
    return 'Warning: Invalid org unit ID format.'
  }

  return ''
}

/**
 * 后端可能返回 groupId、mcpGroupId、groupIds (单个 / 数组 / 逗号分隔字符串)。
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

async function searchMentor() {
  message.value = ''
  isError.value = false
  actionMsg.value = ''
  results.value = []

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
       * 修改点 (v6 task 3)：
       * Faculty Consultant 全局走 GET /api/org/mentors/search?keyword=xxx。
       * 不再有 groupId 模式，只剩 name / email。
       * 两种 mode 都打到同一个接口，后端按字段做模糊匹配。
       */
      list = await searchAllMentors(kw)
    } else if (role === 'coordinator') {
      /**
       * 修改点 (v6 task 4)：
       * Coordinator 走 GET /api/org/mentors/{orgUnitId}?keyword=xxx
       * (按系搜导师接口)。orgUnitId 是 Coordinator 所在系的 ID，
       * 由用户在表单上明确填写。
       * 同样不再支持 group ID 搜索。
       */
      const orgId = orgUnitId.value.trim()
      const orgError = validateOrgUnitId(orgId)

      if (orgError) {
        message.value = orgError
        isError.value = true
        return
      }

      list = await getMentorsByOrg(orgId, kw)
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

  router.push(`/group-members/${encodeURIComponent(gid)}`)
}

function searchAgain() {
  results.value = []
  keyword.value = ''
  orgUnitId.value = ''
  message.value = ''
  isError.value = false
  actionMsg.value = ''
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
