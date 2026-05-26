<template>
  <section class="page">
    <h1>Designate MCP Coordinators</h1>
    <p class="muted">
      Import coordinator list by Excel, or manually bind a coordinator to a department/unit.
    </p>

    <div class="card">
      <h2>Import Coordinator Excel</h2>
      <input type="file" accept=".xlsx,.xls" @change="onFileChange" />
      <button class="primary" :disabled="!file || loading" @click="importFile">
        {{ loading ? 'Importing...' : 'Import Coordinators' }}
      </button>
    </div>

    <div class="card">
      <h2>Manual Designate / Update</h2>
      <label>
        Department Unit ID
        <input v-model.trim="unitId" placeholder="e.g. org_dcs" />
      </label>
      <label>
        Coordinator User ID
        <input v-model.trim="payload.coordinatorId" placeholder="coordinator sys_user.id" />
      </label>
      <label>
        Email
        <input v-model.trim="payload.email" type="email" placeholder="optional" />
      </label>
      <label>
        Real Name
        <input v-model.trim="payload.realName" placeholder="optional" />
      </label>

      <div class="actions">
        <button class="primary" :disabled="!unitId" @click="createOrReplace">Designate</button>
        <button :disabled="!unitId" @click="update">Update</button>
        <button class="danger" :disabled="!unitId" @click="remove">Remove</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>

    <div class="card">
      <h2>Organization Units</h2>
      <button @click="loadUnits">Refresh Units</button>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Parent ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in units" :key="u.id" @click="unitId = u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.type }}</td>
            <td>{{ u.parentId || '-' }}</td>
          </tr>
          <tr v-if="units.length === 0">
            <td colspan="4" class="empty">No units.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="note">
      Note: this page calls /api/mentoring/units/{unitId}/coordinator based on the previous confirmation that the backend uses units.
      If Network shows 404, the backend OpenAPI or route still needs to be synchronized.
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  designateCoordinator,
  importCoordinatorList,
  removeCoordinator,
  updateCoordinator,
} from '../../api/consultant'
import { getOrgTree } from '../../api/org'
import type { OrgUnit } from '../../api/admin'

const file = ref<File | null>(null)
const unitId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const units = ref<OrgUnit[]>([])

const payload = reactive({
  coordinatorId: '',
  email: '',
  realName: '',
})

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
}

async function importFile() {
  if (!file.value) return
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    await importCoordinatorList(file.value)
    success.value = 'Coordinator list imported successfully.'
  } catch (e: any) {
    error.value = e.message || 'Import failed.'
  } finally {
    loading.value = false
  }
}

function cleanPayload() {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

async function createOrReplace() {
  error.value = ''
  success.value = ''
  try {
    await designateCoordinator(unitId.value, cleanPayload())
    success.value = 'Coordinator designated successfully.'
  } catch (e: any) {
    error.value = e.message || 'Designate failed.'
  }
}

async function update() {
  error.value = ''
  success.value = ''
  try {
    await updateCoordinator(unitId.value, cleanPayload())
    success.value = 'Coordinator updated successfully.'
  } catch (e: any) {
    error.value = e.message || 'Update failed.'
  }
}

async function remove() {
  if (!window.confirm('Remove coordinator from this unit?')) return
  error.value = ''
  success.value = ''
  try {
    await removeCoordinator(unitId.value)
    success.value = 'Coordinator removed successfully.'
  } catch (e: any) {
    error.value = e.message || 'Remove failed.'
  }
}

async function loadUnits() {
  try {
    units.value = await getOrgTree()
  } catch (e: any) {
    error.value = e.message || 'Failed to load organization units.'
  }
}

onMounted(loadUnits)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-weight: 600; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
button { width: fit-content; padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.danger { color: #b42318; border-color: #f3b8b2; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: #f8fafc; }
.error { color: #b42318; }
.success { color: #087443; }
.empty { text-align: center; color: #777; }
.muted, .note { color: #666; }
.note { margin-top: 16px; font-size: 13px; }
</style>
