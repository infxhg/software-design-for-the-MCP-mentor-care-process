<template>
  <section class="page">
    <h1>Designate MCP Coordinators</h1>
    <p class="muted">
      Import coordinator list by Excel, or manually bind a coordinator to a department.
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
      <p class="hint">
        API:
        <code>POST /api/org/departments/{departmentUnitId}/coordinator</code>
        with body <code>{ "coordinatorUserId": "coord_new_111" }</code>
      </p>
      <label>
        Department Unit ID
        <input v-model.trim="unitId" placeholder="department org unit UUID" />
      </label>
      <label>
        Coordinator User ID
        <input
          v-model.trim="payload.coordinatorUserId"
          placeholder="e.g. coord_new_111"
        />
      </label>

      <div class="actions">
        <button class="primary" :disabled="!canSubmit" @click="createOrReplace">Designate</button>
        <button class="secondary" :disabled="!canSubmit" @click="update">Update</button>
        <button class="danger" :disabled="!unitId" @click="remove">Remove</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>

    <div class="card">
      <h2>Departments (click a row to fill Department Unit ID)</h2>
      <button class="secondary" type="button" @click="loadDepartments">Refresh Departments</button>
      <table class="table">
        <thead>
          <tr>
            <th>Department Unit ID</th>
            <th>Name</th>
            <th>Faculty</th>
            <th>Current Coordinator</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in departments"
            :key="d.departmentId"
            :class="{ selected: unitId === d.departmentId }"
            @click="selectDepartment(d)"
          >
            <td>{{ d.departmentId }}</td>
            <td>{{ d.departmentName }}</td>
            <td>{{ d.faculty || '-' }}</td>
            <td>{{ d.coordinatorName || '-' }}</td>
          </tr>
          <tr v-if="departments.length === 0">
            <td colspan="4" class="empty">No departments.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  designateCoordinator,
  importCoordinatorList,
  listDepartments,
  removeCoordinator,
  updateCoordinator,
  type DepartmentSummary,
} from '../../api/consultant'

const file = ref<File | null>(null)
const unitId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const departments = ref<DepartmentSummary[]>([])

const payload = reactive({
  coordinatorUserId: '',
})

const canSubmit = computed(
  () => Boolean(unitId.value.trim() && payload.coordinatorUserId.trim()),
)

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
}

function selectDepartment(row: DepartmentSummary) {
  unitId.value = row.departmentId
}

async function importFile() {
  if (!file.value) return
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    await importCoordinatorList(file.value)
    success.value = 'Coordinator list imported successfully.'
    await loadDepartments()
  } catch (e: any) {
    error.value = e.message || 'Import failed.'
  } finally {
    loading.value = false
  }
}

async function createOrReplace() {
  error.value = ''
  success.value = ''
  try {
    await designateCoordinator(unitId.value, {
      coordinatorUserId: payload.coordinatorUserId.trim(),
    })
    success.value = 'Coordinator designated successfully.'
    await loadDepartments()
  } catch (e: any) {
    error.value = e.message || 'Designate failed.'
  }
}

async function update() {
  error.value = ''
  success.value = ''
  try {
    await updateCoordinator(unitId.value, {
      coordinatorUserId: payload.coordinatorUserId.trim(),
    })
    success.value = 'Coordinator updated successfully.'
    await loadDepartments()
  } catch (e: any) {
    error.value = e.message || 'Update failed.'
  }
}

async function remove() {
  if (!window.confirm('Remove coordinator from this department?')) return
  error.value = ''
  success.value = ''
  try {
    await removeCoordinator(unitId.value)
    success.value = 'Coordinator removed successfully.'
    await loadDepartments()
  } catch (e: any) {
    error.value = e.message || 'Remove failed.'
  }
}

async function loadDepartments() {
  try {
    departments.value = await listDepartments()
  } catch (e: any) {
    error.value = e.message || 'Failed to load departments.'
  }
}

onMounted(loadDepartments)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-weight: 600; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
button {
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f1f5f9;
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
button:hover:not(:disabled) { background: #e2e8f0; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
  font-weight: 600;
}
.secondary { background: #f1f5f9; color: #1f2937; }
.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
  font-weight: 600;
}
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: #f8fafc; }
tbody tr.selected { background: #eff6ff; }
.error { color: #b42318; }
.success { color: #087443; }
.empty { text-align: center; color: #777; }
.muted, .hint { color: #666; font-size: 14px; }
.hint code { font-size: 12px; }
</style>
