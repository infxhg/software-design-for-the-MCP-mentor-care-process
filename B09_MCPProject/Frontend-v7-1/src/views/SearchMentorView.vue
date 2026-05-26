<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>

    <!--
      修改点 (v6 task 3 & 4)：
      移除 group ID 搜索条件，文案改成 name / email。
    -->
    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by mentor name, email, or group ID.
    </p>

    <div class="form">
      <!--
        修改点 (v7)：
        Coordinator 不再需要手动输入 Department Org Unit ID。
        后端通过 JWT 自动识别 coordinator 所在系，
        前端只保留 "Search By" 下拉 + keyword 输入框。
      -->

      <!--
        修改点 (v8)：
        Faculty Consultant 按 Group ID 搜索改走与 name / email 一致的接口
        GET /api/org/mentors/search?keyword=xxx，后端在 keyword 上做多字段
        模糊匹配（名字 / 邮箱 / groupId 都命中），并在返回中同时给出
        groupIds (展示用) 和 groupKeys (唯一标识 UUID)。
        因此不再需要 Major ID 这个用于歧义消解的辅助输入。
      -->
      <div v-if="role === 'consultant' || role === 'coordinator'" class="form-item">
        <label>Search By</label>
        <select v-model="searchField">
          <option value="name">Mentor Name</option>
          <option value="email">Mentor Email</option>
          <!-- 修改点 (v8)：Faculty Consultant 可按 Group ID 搜索（走和 name/email 一样的接口） -->
          <option v-if="role === 'consultant'" value="groupId">Group ID</option>
        </select>

        <p class="hint" v-if="role === 'consultant'">
          Faculty Consultant: search globally across all faculties.
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

          <td>
            <button
                v-if="getMentorGroups(mentor).length === 1"
                @click="showMembers(getMentorGroups(mentor)[0]!)"
            >
              Show Members
            </button>

            <span v-else-if="getMentorGroups(mentor).length > 1" class="muted">
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getRole } from '../types'
import { searchAllMentors, searchMyDeptMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const router = useRouter()
const role = getRole()

/**
 * 修改点 (NEW)：
 * 搜索字段在 name / email 之外，为 Faculty Consultant 增加 'groupId'。
 * 修改点 (v8)：
 * groupId 模式不再走 findMentorByGroupId（/api/mentoring/groups/search）；
 * 改成与 name / email 完全一致的 searchAllMentors(kw)
 * → GET /api/org/mentors/search?keyword=xxx
 * 后端在 keyword 上做多字段模糊匹配（名字/邮箱/groupId），并返回
 * { groupIds: ["2024-2025-Y1", ...], groupKeys: ["cc...", ...] } 配对结构。
 */
type SearchField = 'name' | 'email' | 'groupId'
const searchField = ref<SearchField>('name')

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
 * 思路：搜索成功后把 (searchField / keyword / results) 写进 sessionStorage；
 * 组件 mounted 时如发现 sessionStorage 有缓存就恢复。
 * 用户主动点 "Search Again" 时清空 sessionStorage。
 * 注：sessionStorage 是 per-tab，关闭 tab 自动清，不会污染下次会话。
 */
const SEARCH_STATE_KEY = 'search-mentor-state'

interface PersistedState {
  searchField: SearchField
  keyword: string
  results: MentorFromApi[]
}

function persistState() {
  try {
    const payload: PersistedState = {
      searchField: searchField.value,
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
    if (parsed.searchField) searchField.value = parsed.searchField
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

// results 一旦变化就同步 sessionStorage（包括清空到 0 也保留快照，避免抖动）
watch(
    results,
    () => {
      if (results.value.length > 0) persistState()
    },
    { deep: false },
)

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
    case 'groupId':
      return 'Group ID'
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
    case 'groupId':
      return 'Enter group ID, e.g. 2024-2025-Y1 or group_a1'
    default:
      return ''
  }
})

/**
 * 修改点 (v6 task 3 & 4)：
 * 按 searchField 做不同的格式校验。
 *   - name    : 只防特殊字符，长度 1–100
 *   - email   : 必须像邮箱片段
 *   - groupId : 只允许字母/数字/连字符/下划线
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

  if (searchField.value === 'groupId') {
    const looksLikeGroupId = /^[A-Za-z0-9_-]+$/.test(input)
    if (!looksLikeGroupId) {
      return 'Warning: Group ID should only contain letters, digits, "-" and "_".'
    }
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
       * 修改点 (v8)：
       * Faculty Consultant 三种模式 (name / email / groupId) 都走同一个接口：
       *   GET /api/org/mentors/search?keyword=xxx
       * 后端在 keyword 上做多字段模糊匹配，对 groupId 模式按 mentor 名下
       * groupIds[] 命中。返回中包含 groupIds + groupKeys 用于结果展示。
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
