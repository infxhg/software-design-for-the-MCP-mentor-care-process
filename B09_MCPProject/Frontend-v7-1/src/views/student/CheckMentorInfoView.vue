<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>My Mentor Information</h1>
        <p class="desc">View your assigned mentor's basic information.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else-if="mentor" class="mentor-info">
      <div class="info-grid">
        <div><strong>Mentor Name</strong><p>{{ mentor.name }}</p></div>
        <div><strong>Office</strong><p>{{ mentor.office || 'N/A' }}</p></div>
        <div><strong>Email</strong><p>{{ mentor.email || 'N/A' }}</p></div>
        <div><strong>Department</strong><p>{{ mentor.department || 'N/A' }}</p></div>
        <div><strong>Group ID</strong><p>{{ mentor.groupId || 'N/A' }}</p></div>
      </div>
    </div>

    <div v-else class="empty">
      <p>No mentor information found for your group.</p>
      <p class="hint">If you are not in any mentoring group yet, please contact your faculty consultant.</p>
    </div>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface MentorBriefInfo {
  name: string
  office: string
  email: string
  department: string
  groupId: string
}

const mentor = ref<MentorBriefInfo | null>(null)
const isLoading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  /**
   * 后端接口尚未到位时使用 mock。
   * 真实场景：GET /api/student/my-mentor
   *   returns { name, office, email, department, groupId } | null
   */
  try {
    await new Promise((r) => setTimeout(r, 200))
    mentor.value = {
      name: 'Mary Lee',
      office: 'T3-601',
      email: 'marylee@bnbu.edu.cn',
      department: 'DCS',
      groupId: '2024-2025-Y2',
    }
  } catch (err: any) {
    errorMsg.value = 'Failed to load mentor info: ' + (err.message || 'Unknown error')
  } finally {
    isLoading.value = false
  }
})

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.info-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px; margin-top: 24px;
}
.info-grid div {
  padding: 16px; background: #f9fafb; border-radius: 8px;
}
.info-grid p { margin-bottom: 0; word-break: break-all; }

.empty { margin-top: 24px; color: #6b7280; }
.hint { color: #9ca3af; }

.buttons { margin-top: 24px; }
.message, .error { margin-top: 14px; }
.error { color: #dc2626; }
.loading { color: #6b7280; padding: 30px; text-align: center; }
</style>
