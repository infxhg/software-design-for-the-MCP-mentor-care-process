<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>

    <!--
      修改点 (v10)：
      后端 /api/org/mentors/search 对 keyword 做全字段模糊匹配
      （name / email / groupId / mentorId 等都会命中），所以前端
      不再需要 "Search By" 下拉。用户在一个输入框里输任意片段即可。
    -->
    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by
      entering a mentor name, email, or group ID — the backend does fuzzy matching
      across all of these fields.
    </p>

    <div class="form">
      <div class="form-item">
        <label>Search Keyword</label>
        <input
            v-model="keyword"
            type="text"
            placeholder="Enter mentor name, email, or group ID (e.g. Zhang San / zhangsan@bnbu.edu.cn / 2024-2025-Y1)"
            @keyup.enter="searchMentor"
        />

        <p class="hint" v-if="role === 'consultant'">
          Faculty Consultant: search globally across all faculties.
        </p>
        <p class="hint" v-else-if="role === 'coordinator'">
          MCP Coordinator: search inside your department.
        </p>
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
          <!--
            修改点 (v10)：
            去掉了最右边的 Operation 列。Group ID 列里每个 group label
            本身就是可点击的按钮，等价于原 Operation 列的 "Show Members"。
          -->
          <th>Group ID</th>
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
            修改点 (v8)：
            Group ID 列展示 mentor.groupIds[]（学年标识形式），点击时用同
            位置的 mentor.groupKeys[]（UUID 唯一标识）跳转，
            把学年标识通过 query 串带过去用于目标页展示。
            getMentorGroups() 已把这两个数组配对成 { label, key } 列表。
          -->
          <td>
            <template v-if="getMentorGroups(mentor).length > 0">
              <button
                  v-for="g in getMentorGroups(mentor)"
                  :key="g.key + '__' + g.label"
                  class="group-link"
                  @click="showMembers(g)"
              >
                {{ g.label }}
              </button>
            </template>

            <span v-else class="muted">N/A</span>
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getRole } from '../types'
import { searchAllMentors, searchMyDeptMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const router = useRouter()
const role = getRole()

/**
 * 修改点 (v10)：
 * 去掉 SearchField 类型和 searchField state——后端做全字段模糊匹配，
 * 前端不再让用户挑搜哪个字段，用户在单个 keyword 输入框里输入任意片段
 * （name/email/groupId）都能命中。
 */

const keyword = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const actionMsg = ref('')

const results = ref<MentorFromApi[]>([])

/**
 * 修改点 (v8)：
 * sessionStorage 持久化搜索状态。
 *
 * 解决用户反馈问题：
 *   在搜索结果页点击 group ID 进入 /group-members/* 查看完，
 *   再点 Back 回到 /search-mentor 时页面是空的（state 丢失）。
 *
 * 修改点 (v10)：持久化的字段从 (searchField, keyword, results) 简化为
 * (keyword, results)。
 *
 * sessionStorage 是 per-tab，关闭 tab 自动清，不会污染下次会话。
 */
const SEARCH_STATE_KEY = 'search-mentor-state'

interface PersistedState {
  keyword: string
  results: MentorFromApi[]
}

function persistState() {
  try {
    const payload: PersistedState = {
      keyword: keyword.value,
      results: results.value,
    }
    sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage 不可用时静默忽略
  }
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(SEARCH_STATE_KEY)
  } catch {
    // ignore
  }
}

function restoreState(): boolean {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (typeof parsed.keyword === 'string') keyword.value = parsed.keyword
    if (Array.isArray(parsed.results)) results.value = parsed.results as MentorFromApi[]
    return Array.isArray(parsed.results) && parsed.results.length > 0
  } catch {
    return false
  }
}

onMounted(() => {
  restoreState()
})

// results 一旦变化就同步 sessionStorage
watch(
    results,
    () => {
      if (results.value.length > 0) persistState()
    },
    { deep: false },
)

/**
 * 修改点 (v10)：
 * 由于不再区分 name/email/groupId 三种模式，校验放宽成"通用关键字"：
 *   - 不为空
 *   - 长度 1–100
 *   - 不含明显的注入危险字符 <>"'`;
 * 不再按 field 做不同的字符集校验。
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

  return ''
}

/**
 * 修改点 (v8)：
 * 后端 /api/org/mentors/search 返回的 mentor 同时带：
 *   - groupIds  : 学年标识形式 (展示给用户)
 *   - groupKeys : UUID 唯一标识形式 (做接口/精确定位)
 * 两数组按下标一一配对。本函数把它们组装成 { label, key } 列表。
 *
 * 兼容降级：
 *   - 如果只有单数 groupId（旧数据），用 label = key = groupId 兜底
 *   - 如果只有 mcpGroupId（更早期数据），同样用它兜底
 *   - 如果 groupIds 是 CSV 字符串，按逗号拆开
 *
 * 修改点 (v8.1 BUG FIX)：
 * 1) 去重键改成只看 label —— 同一个学年标识不能在表里重复出现。
 *    之前去重键是 label+key，导致 mentor 同时返回 groupIds[]
 *    (带 groupKeys[]) 和单数 groupId (无对应 groupKey 只能回退成 label)
 *    时，{label:"2024-2025-Y1",key:"cc...aa01"} 和
 *    {label:"2024-2025-Y1",key:"2024-2025-Y1"} 被当成两条不同记录，
 *    页面上出现重复按钮。
 * 2) 单数 groupId / mcpGroupId 只在 groupIds[] 完全缺失时才走兜底。
 *    新 API 的 mentor.groupId 永远等于 mentor.groupIds[0]，
 *    在 groupIds[] 已经被处理过的情况下再处理一次毫无意义，反而会
 *    丢失对应的 groupKey（导致跳转用错 key）。
 */
interface MentorGroupRef {
  label: string
  key: string
}

function getMentorGroups(mentor: MentorFromApi): MentorGroupRef[] {
  const result: MentorGroupRef[] = []
  // 修改点 (v8.1 BUG FIX)：只按 label 去重
  const seenLabels = new Set<string>()

  function push(label: string, key: string) {
    const lbl = label.trim()
    const k = (key || label).trim()
    if (!lbl) return
    if (seenLabels.has(lbl)) return
    seenLabels.add(lbl)
    result.push({ label: lbl, key: k })
  }

  // 主路径：groupIds[] + groupKeys[] 按下标配对
  const hasGroupIdsArray = Array.isArray(mentor.groupIds) && mentor.groupIds.length > 0
  const hasGroupIdsString =
      !hasGroupIdsArray && typeof mentor.groupIds === 'string' && mentor.groupIds.trim().length > 0

  if (hasGroupIdsArray) {
    const groupIdsArr = mentor.groupIds as string[]
    const keys = Array.isArray(mentor.groupKeys) ? mentor.groupKeys : []
    groupIdsArr.forEach((label, idx) => {
      const lbl = String(label ?? '').trim()
      if (!lbl) return
      const k = String(keys[idx] ?? '').trim() || lbl
      push(lbl, k)
    })
  } else if (hasGroupIdsString) {
    // 兼容：groupIds 也可能是 CSV 字符串
    ;(mentor.groupIds as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((lbl) => push(lbl, lbl))
  } else {
    /**
     * 修改点 (v8.1 BUG FIX)：
     * 只有当 groupIds 这种新格式完全缺失时，才走单数兜底字段。
     * 否则单数 groupId 只是 groupIds[0] 的别名，再 push 一次会重复
     * （且因为它没法关联到对应的 groupKey，会引入错误的 key）。
     */
    if (mentor.groupId !== undefined && mentor.groupId !== null && String(mentor.groupId).trim()) {
      const lbl = String(mentor.groupId).trim()
      const k = (mentor as any).groupKey
          ? String((mentor as any).groupKey).trim()
          : lbl
      push(lbl, k)
    }

    if (
        mentor.mcpGroupId !== undefined &&
        mentor.mcpGroupId !== null &&
        String(mentor.mcpGroupId).trim()
    ) {
      const lbl = String(mentor.mcpGroupId).trim()
      push(lbl, lbl)
    }
  }

  return result
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
       * 修改点 (v10)：
       * Faculty Consultant 直接走 GET /api/org/mentors/search?keyword=xxx。
       * 后端在 keyword 上做全字段模糊匹配（name / email / groupId / mentorId
       * 都参与命中），返回中包含 groupIds + groupKeys 用于结果展示。
       */
      list = await searchAllMentors(kw)
    } else if (role === 'coordinator') {
      /**
       * 修改点 (v7)：
       * Coordinator 改走 GET /api/org/my-dept/mentors?keyword=xxx。
       * 后端从 JWT token 中拿到 coordinator 的所属系，
       * 不再要求前端传 orgUnitId，结果天然限制在本系。
       */
      list = await searchMyDeptMentors(kw)
    } else {
      message.value = 'Authorization warning: You do not have permission to search mentor information.'
      isError.value = true
      return
    }

    if (list.length === 0) {
      // 空结果时不写 sessionStorage，避免下次进来直接显示 "0 found" 困扰
      clearPersistedState()
      message.value = 'No matching mentor information is found.'
      isError.value = true
      return
    }

    results.value = list
    // results 的 watch 会自动 persistState()
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

/**
 * 修改点 (v8)：
 * 跳转到 group-members 页面时：
 *   - URL path 用 groupKey (UUID 唯一标识)，让目标页接口可以精确定位组；
 *   - 学年标识形式通过 query 串 ?gid=xxx 带过去，目标页 heading 展示这个。
 * 如果 mentor 没带 groupKey（旧数据），key 会回退成 label 本身，URL 退化
 * 为原来的形态，与旧链路兼容。
 */
function showMembers(g: MentorGroupRef) {
  actionMsg.value = ''

  const key = g.key.trim()
  const label = g.label.trim()

  if (!key) {
    actionMsg.value = 'Warning: Group ID is missing.'
    return
  }

  router.push({
    path: '/group-members/' + encodeURIComponent(key),
    query: key !== label ? { gid: label } : undefined,
  })
}

function searchAgain() {
  results.value = []
  keyword.value = ''
  message.value = ''
  isError.value = false
  actionMsg.value = ''
  // 用户显式清空 → 同步清掉缓存
  clearPersistedState()
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

.optional {
  font-weight: 400;
  color: #9ca3af;
  font-size: 12px;
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
