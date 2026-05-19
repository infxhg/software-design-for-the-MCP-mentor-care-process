<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Supporting Staff Management</h1>
        <p class="desc">Manage supporting staff accounts and their permissions.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="actions-row">
      <button @click="goAdd">Add</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="staff.length > 0">
      <thead>
      <tr>
        <th>Staff ID</th>
        <th>Name</th>
        <th>Account ID</th>
        <th>View Log</th>
        <th>Reply Feedback</th>
        <th>Action</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="s in staff" :key="s.staffId">
        <td>{{ s.staffId }}</td>
        <td>{{ s.name }}</td>
        <td>{{ s.accountId }}</td>
        <td>{{ s.canViewLog ? '✓' : '-' }}</td>
        <td>{{ s.canReplyFeedback ? '✓' : '-' }}</td>
        <td>
          <button class="link-btn" @click="goEdit(s.staffId!)">Edit</button>
          <button
              class="danger"
              :disabled="deletingId === s.staffId"
              @click="remove(s.staffId!)"
          >
            {{ deletingId === s.staffId ? '...' : 'Delete' }}
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No supporting staff configured yet.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listSupportingStaff, deleteSupportingStaff } from '../../api/admin'
import type { SupportingStaffInfo } from '../../api/admin'

const router = useRouter()

const staff = ref<SupportingStaffInfo[]>([])
const isLoading = ref(true)
const message = ref('')
const isError = ref(false)
const deletingId = ref('')

onMounted(load)

async function load() {
  isLoading.value = true
  try {
    staff.value = await listSupportingStaff()
  } catch (err: any) {
    message.value = err.message || 'Failed to load staff.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goAdd() { router.push('/admin/supporting-staff/add') }
function goEdit(id: string) {
  router.push(`/admin/supporting-staff/edit/${encodeURIComponent(id)}`)
}

async function remove(staffId: string) {
  if (!confirm('Delete this supporting staff record?')) return

  deletingId.value = staffId
  try {
    await deleteSupportingStaff(staffId)
    await load()
    message.value = 'Staff deleted.'
  } catch (err: any) {
    message.value = err.message || 'Failed to delete.'
    isError.value = true
  } finally {
    deletingId.value = ''
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.actions-row { margin: 20px 0; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 11px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.link-btn {
  background: transparent; color: #2563eb;
  border: none; padding: 0 6px 0 0; cursor: pointer;
  font-weight: 600; text-decoration: underline; margin-right: 8px;
}
.empty, .loading { color: #6b7280; padding: 18px 0; }
.buttons { margin-top: 18px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
