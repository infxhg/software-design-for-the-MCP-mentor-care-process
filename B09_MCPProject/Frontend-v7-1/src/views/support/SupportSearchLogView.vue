<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Search Student Log</h1>
        <p class="desc">Please enter ID or Name to access caring logs.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Enter ID or Name</label>
        <div class="search-row">
          <input
              v-model="query"
              type="text"
              placeholder="e.g. 123456789 or Bnbuer"
              @keyup.enter="search"
          />
          <button :disabled="isLoading" @click="search">
            {{ isLoading ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

      <table v-if="results.length > 0">
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Action</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="r in results" :key="r.userId">
          <td>{{ r.userId }}</td>
          <td>{{ r.name }}</td>
          <td>{{ r.role }}</td>
          <td>
            <button class="link-btn" @click="viewLog(r.userId)">View Log</button>
          </td>
        </tr>
        </tbody>
      </table>

      <div class="buttons">
        <button class="secondary" @click="goBack">Back</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const query = ref('')
const results = ref<Array<{ userId: string; name: string; role: string }>>([])
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

async function search() {
  message.value = ''
  isError.value = false
  results.value = []

  const q = query.value.trim()
  if (!q) {
    message.value = 'Warning: Please enter an ID or name.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    /**
     * 后端接口尚未到位，此处用 mock 数据演示流程。
     * 真实接口约定：GET /api/support/search-log?query=xxx
     *   → [{ userId, name, role }, ...]
     */
    await new Promise((r) => setTimeout(r, 300))

    const allMock = [
      { userId: '123456789', name: 'Bnbuer', role: 'student' },
      { userId: '987654321', name: 'Uicer', role: 'student' },
      { userId: '210000001', name: 'Sugar', role: 'student' },
    ]
    const lower = q.toLowerCase()
    results.value = allMock.filter(
        (r) => r.userId.includes(q) || r.name.toLowerCase().includes(lower),
    )

    if (results.value.length === 0) {
      message.value = 'No matching student found.'
      isError.value = true
    }
  } catch (err: any) {
    message.value = err.message || 'Search failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function viewLog(userId: string) {
  router.push(`/support/log/${encodeURIComponent(userId)}`)
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 700px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
.search-row { display: flex; gap: 10px; }
.search-row input {
  flex: 1; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

table { width: 100%; border-collapse: collapse; margin-top: 18px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.link-btn {
  background: transparent; color: #2563eb;
  border: none; cursor: pointer; font-weight: 600;
  text-decoration: underline; padding: 0;
}

.buttons { margin-top: 18px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
