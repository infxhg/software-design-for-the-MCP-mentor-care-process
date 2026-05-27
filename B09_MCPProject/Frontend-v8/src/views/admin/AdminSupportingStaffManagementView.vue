<template>
  <section class="page">
    <div class="header">
      <div>
        <h1>Supporting Staff Management</h1>
        <p>Manage Supporting Staff accounts.</p>
      </div>
      <button class="primary" @click="router.push('/admin/supporting-staff/add')">Add Staff</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading">Loading...</p>

    <table v-if="!loading" class="table">
      <thead>
        <tr>
          <th>Staff ID</th>
          <th>Name</th>
          <th>Username</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
          <th class="actions">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in staff" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.realName || '-' }}</td>
          <td>{{ item.username || '-' }}</td>
          <td>{{ item.email || '-' }}</td>
          <td>{{ item.phone || '-' }}</td>
          <td>{{ item.status === 1 ? 'Active' : item.status }}</td>
          <td class="actions">
            <button @click="router.push(`/admin/supporting-staff/edit/${encodeURIComponent(item.id)}`)">Change</button>
            <button class="danger" @click="remove(item.id)">Delete</button>
          </td>
        </tr>
        <tr v-if="staff.length === 0">
          <td colspan="7" class="empty">No supporting staff.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteSupportingStaff,
  listSupportingStaff,
  type AdminAccount,
} from '../../api/admin'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const staff = ref<AdminAccount[]>([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    staff.value = await listSupportingStaff()
  } catch (e: any) {
    error.value = e.message || 'Failed to load supporting staff.'
  } finally {
    loading.value = false
  }
}

async function remove(id: string) {
  if (!window.confirm('Delete this supporting staff?')) return
  try {
    await deleteSupportingStaff(id)
    await load()
  } catch (e: any) {
    alert(e.message || 'Delete failed. If this is 404, backend still needs DELETE supporting-staff.')
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
/* 修改点：统一按钮样式 — 详见 AdminConsultantManagementView，同样规则。 */
button {
  margin-right: 8px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f1f5f9;
  color: #1f2937;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color .15s ease, opacity .15s ease;
}
button:hover:not(:disabled) { background: #e2e8f0; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
  font-weight: 600;
}
.primary:hover:not(:disabled) { background: #1a5fd0; border-color: #1a5fd0; }
.secondary {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1f2937;
}
.secondary:hover:not(:disabled) { background: #e2e8f0; }
.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
  font-weight: 600;
}
.danger:hover:not(:disabled) { background: #b91c1c; border-color: #b91c1c; }
.error { margin: 12px 0; color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
