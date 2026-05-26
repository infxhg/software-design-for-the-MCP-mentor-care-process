<template>
  <section class="page">
    <div class="header">
      <div>
        <h1>Faculty Consultant Management</h1>
        <p>Manage Faculty Consultant accounts.</p>
      </div>
      <div>
        <button :disabled="loading" @click="load">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <button class="primary" @click="goAdd">Add Consultant</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading...</p>

    <table v-if="!loading" class="table">
      <thead>
        <tr>
          <th>Consultant ID</th>
          <th>Name</th>
          <th>Username</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
          <th class="actions">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in consultants" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.realName || item.name || '-' }}</td>
          <td>{{ item.username || '-' }}</td>
          <td>{{ item.email || '-' }}</td>
          <td>{{ item.phone || '-' }}</td>
          <td>{{ statusText(item.status) }}</td>
          <td class="actions">
            <button @click="goEdit(item.id)">Change</button>
            <button
              class="danger"
              :disabled="deletingId === item.id"
              @click="remove(item.id)"
            >
              {{ deletingId === item.id ? 'Deleting...' : 'Delete' }}
            </button>
          </td>
        </tr>
        <tr v-if="consultants.length === 0">
          <td colspan="7" class="empty">No faculty consultants.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteConsultant, listConsultants, type AdminAccount } from '../../api/admin'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const consultants = ref<AdminAccount[]>([])

function statusText(status: unknown): string {
  const value = Number(status)
  if (value === 1) return 'Active'
  if (value === 0) return 'Disabled'
  return String(status ?? '-')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    consultants.value = await listConsultants()
  } catch (e: any) {
    error.value = e.message || 'Failed to load consultants.'
  } finally {
    loading.value = false
  }
}

function goAdd() {
  router.push('/admin/consultants/add')
}

function goEdit(id: string) {
  if (!id) return
  router.push(`/admin/consultants/edit/${encodeURIComponent(id)}`)
}

async function remove(id: string) {
  if (!id) return
  if (!window.confirm('Delete this faculty consultant?')) return

  deletingId.value = id
  try {
    await deleteConsultant(id)
    await load()
  } catch (e: any) {
    alert(e.message || 'Delete failed.')
  } finally {
    deletingId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
h1 { margin: 0 0 6px; }
p { margin: 0; color: #666; }
.table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
th { background: #f8fafc; }
.actions { white-space: nowrap; }
button { margin-right: 8px; padding: 6px 10px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.danger { color: #b42318; border-color: #f3b8b2; }
.error { margin: 12px 0; color: #b42318; }
.muted { margin: 12px 0; color: #6b7280; }
.empty { text-align: center; color: #777; }
</style>
