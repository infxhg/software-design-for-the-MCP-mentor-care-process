<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Faculty Consultant Management</h1>
        <p class="desc">Add, change, or delete faculty consultants.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="actions-row">
      <button @click="goAdd">Add</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="consultants.length > 0">
      <thead>
      <tr>
        <th>Consultant ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Faculty</th>
        <th>Action</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="c in consultants" :key="c.consultantId">
        <td>{{ c.consultantId }}</td>
        <td>{{ c.name }}</td>
        <td>{{ c.email }}</td>
        <td>{{ c.faculty }}</td>
        <td>
          <button class="link-btn" @click="goEdit(c.consultantId!)">Change</button>
          <button
              class="danger"
              :disabled="deletingId === c.consultantId"
              @click="remove(c.consultantId!)"
          >
            {{ deletingId === c.consultantId ? '...' : 'Delete' }}
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No consultants configured yet.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listConsultants, deleteConsultant } from '../../api/admin'
import type { ConsultantInfo } from '../../api/admin'

const router = useRouter()

const consultants = ref<ConsultantInfo[]>([])
const isLoading = ref(true)
const message = ref('')
const isError = ref(false)
const deletingId = ref('')

onMounted(load)

async function load() {
  isLoading.value = true
  try {
    consultants.value = await listConsultants()
  } catch (err: any) {
    message.value = err.message || 'Failed to load consultants.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goAdd() { router.push('/admin/consultants/add') }
function goEdit(id: string) {
  router.push(`/admin/consultants/edit/${encodeURIComponent(id)}`)
}

async function remove(consultantId: string) {
  if (!confirm('Delete this consultant?')) return

  deletingId.value = consultantId
  try {
    await deleteConsultant(consultantId)
    await load()
    message.value = 'Consultant deleted.'
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
