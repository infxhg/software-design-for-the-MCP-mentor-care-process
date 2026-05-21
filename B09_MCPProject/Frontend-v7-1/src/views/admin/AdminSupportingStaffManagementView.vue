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
button { margin-right: 8px; padding: 6px 10px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.danger { color: #b42318; border-color: #f3b8b2; }
.error { margin: 12px 0; color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
