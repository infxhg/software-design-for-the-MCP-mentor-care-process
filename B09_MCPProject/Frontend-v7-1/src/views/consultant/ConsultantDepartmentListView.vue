<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Department List</h1>
        <p class="desc">Faculty: <strong>{{ faculty || '-' }}</strong></p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="departments.length > 0">
      <thead>
      <tr>
        <th>Department Name</th>
        <th>Current Coordinator</th>
        <th>Email</th>
        <th>Action</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="d in departments" :key="d.departmentId">
        <td>{{ d.departmentName }} ({{ d.departmentId }})</td>
        <td>{{ d.coordinatorName || '-' }}</td>
        <td>{{ d.coordinatorEmail || '-' }}</td>
        <td>
          <button @click="manage(d.departmentId)">Manage</button>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No departments configured.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listDepartments } from '../../api/consultant'
import type { DepartmentSummary } from '../../api/consultant'

const router = useRouter()

const departments = ref<DepartmentSummary[]>([])
const faculty = ref<string>('')
const isLoading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    departments.value = await listDepartments()
    /**
     * Heuristic: pick the faculty of the first department. In real impl,
     * the backend should return faculty info bound to the consultant's
     * own faculty via JWT.
     */
    if (departments.value.length > 0) {
      faculty.value = departments.value[0].faculty
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load departments.'
  } finally {
    isLoading.value = false
  }
})

function manage(deptId: string) {
  router.push(`/consultant/departments/${encodeURIComponent(deptId)}`)
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
table { width: 100%; border-collapse: collapse; margin-top: 22px; }
th, td { padding: 11px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.buttons { margin-top: 18px; }
.empty, .loading { color: #6b7280; padding: 18px 0; }
.error { color: #dc2626; margin-top: 14px; }
</style>
