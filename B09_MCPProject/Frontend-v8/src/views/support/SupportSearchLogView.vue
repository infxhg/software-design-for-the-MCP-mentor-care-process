<template>
  <div class="page">
    <section class="card">
      <div class="top-row">
        <div>
          <h1>{{ logScope === 'faculty' ? 'Search Student Log (Faculty)' : 'Search Student Log' }}</h1>
          <p>
            {{
              logScope === 'faculty'
                  ? 'Enter a student ID to view activity logs within your faculty scope.'
                  : 'Please enter ID or Name to access caring logs.'
            }}
          </p>
        </div>

        <button class="secondary-btn" type="button" @click="goHome">
          Home
        </button>
      </div>

      <form class="search-form" @submit.prevent="handleSearch">
        <label>
          Enter ID or Name
          <div class="search-row">
            <input
                v-model="keyword"
                type="text"
                placeholder="Enter user ID, username, or name"
                autocomplete="off"
            />

            <button class="primary-btn" type="submit" :disabled="isLoading">
              Search
            </button>
          </div>
        </label>
      </form>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <div v-if="isLoading" class="empty-state">
        Searching logs...
      </div>

      <table v-else-if="results.length > 0" class="result-table">
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Matched Logs</th>
          <th>Action</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="item in results" :key="`${item.userId}-${item.username}`">
          <td>{{ item.userId || '-' }}</td>
          <td>{{ item.name || item.username || '-' }}</td>
          <td>{{ item.role || '-' }}</td>
          <td>{{ item.matchedLogs }}</td>
          <td>
            <button class="link-btn" type="button" @click="viewLog(item)">
              View Log
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <button class="secondary-btn back-btn" type="button" @click="goBack">
        Back
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchFacultyLogUsers,
  searchLogUsers,
  type LogUserSearchResult,
} from '../../api/support'

const route = useRoute()
const router = useRouter()

const logScope = computed(() => (route.meta.logScope === 'faculty' ? 'faculty' : 'support'))
const logBasePath = computed(() =>
    logScope.value === 'faculty' ? '/consultant' : '/support',
)

const keyword = ref('')
const results = ref<LogUserSearchResult[]>([])
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

async function handleSearch(): Promise<void> {
  const q = keyword.value.trim()

  message.value = ''
  isError.value = false
  results.value = []

  if (!q) {
    message.value = 'Please enter ID or Name.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    // 修复点: 只传 query，避免后端因为 userId 和 username 同时存在而触发强制 AND 查询
    const list =
        logScope.value === 'faculty'
            ? await searchFacultyLogUsers(q)
            : await searchLogUsers({ query: q })

    results.value = list

    if (list.length === 0) {
      // 修改点: 空结果和 403 无权限都统一显示这条提示, 并以红色呈现
      message.value = 'No matching user or No permission to find.'
      isError.value = true
    }
  } catch (error: any) {
    results.value = []

    // 修改点: 后端返回 403 (you don't have the permission to access!) 时,
    // 不再显示原始英文报错, 改为和"没找到"一致的用户友好提示, 红色显示
    // 优先用 error.status 判断 (request.ts 后续可能附加), 回退到消息文本匹配
    const status = Number((error as any)?.status)
    const msg = String(error?.message || '')
    const isForbidden =
        status === 403 || /permission|forbidden|无权|权限/i.test(msg)

    if (isForbidden) {
      message.value = 'No matching user or No permission to find.'
    } else {
      message.value = `Failed to search logs: ${msg || 'Unknown error'}`
    }
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function viewLog(item: LogUserSearchResult): void {
  // 修复点: 修正了路由跳转地址，匹配 index.ts 中配置的 `/support/log/:userId`
  const targetId = item.userId || item.username || item.logSearchKey || 'unknown'

  router.push({
    path: `${logBasePath.value}/log/${encodeURIComponent(targetId)}`,
    query: {
      username: item.username,
      name: item.name,
      role: item.role,
      key: item.logSearchKey,
    },
  })
}

function goHome(): void {
  router.push('/main')
}

function goBack(): void {
  router.back()
}
</script>

<style scoped>
.page {
  padding: 24px;
}

.card {
  min-height: 280px;
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
}

p {
  margin: 14px 0 0;
  color: #64748b;
}

.search-form {
  margin-top: 28px;
}

label {
  display: grid;
  gap: 8px;
  color: #111827;
  font-weight: 700;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(260px, 640px) auto;
  gap: 10px;
  align-items: center;
}

input {
  height: 38px;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  font: inherit;
}

button {
  min-height: 36px;
  padding: 8px 18px;
  border: 0;
  border-radius: 5px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.primary-btn {
  background: #2563eb;
  color: #ffffff;
}

.secondary-btn {
  background: #6b7280;
  color: #ffffff;
}

.back-btn {
  margin-top: 16px;
}

.link-btn {
  min-height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #2563eb;
  text-decoration: underline;
}

.message {
  margin: 14px 0 0;
  color: #047857;
}

.message.error {
  color: #dc2626;
}

.empty-state {
  margin-top: 18px;
  color: #64748b;
}

.result-table {
  width: 720px;
  max-width: 100%;
  margin-top: 18px;
  border-collapse: collapse;
  font-size: 14px;
}

.result-table th,
.result-table td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.result-table th {
  background: #f3f4f6;
  color: #111827;
}

@media (max-width: 760px) {
  .top-row {
    flex-direction: column;
  }

  .search-row {
    grid-template-columns: 1fr;
  }

  .result-table {
    width: 100%;
  }
}
</style>