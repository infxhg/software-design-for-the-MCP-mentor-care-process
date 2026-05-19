<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>MCP Group List</h1>
        <p class="desc">Browse all mentoring groups in your faculty.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="groups.length > 0">
      <thead>
      <tr>
        <th>Group ID</th>
        <th>Current Mentor</th>
        <th>Students</th>
        <th>Major</th>
        <th>Action</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="g in groups" :key="g.groupId">
        <td>{{ g.groupId }}</td>
        <td>{{ g.mentorName }}</td>
        <td>{{ g.studentCount || 0 }}</td>
        <td>{{ g.major || 'N/A' }}</td>
        <td>
          <button class="link-btn" @click="viewDetail(g.groupId)">View detail</button>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No groups available.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listGroups } from '../../api/consultant'
import type { GroupSummary } from '../../api/consultant'

const router = useRouter()

const groups = ref<GroupSummary[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    groups.value = await listGroups()
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load groups.'
  } finally {
    isLoading.value = false
  }
})

function viewDetail(groupId: string) {
  router.push(`/consultant/groups/${encodeURIComponent(groupId)}`)
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

table { width: 100%; border-collapse: collapse; margin-top: 22px; }
th, td { padding: 11px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.link-btn {
  background: transparent; color: #2563eb;
  border: none; cursor: pointer; padding: 0;
  font-weight: 600; text-decoration: underline;
}

.buttons { margin-top: 18px; }
.empty, .loading { color: #6b7280; padding: 18px 0; }
.error { color: #dc2626; margin-top: 14px; }
</style>
