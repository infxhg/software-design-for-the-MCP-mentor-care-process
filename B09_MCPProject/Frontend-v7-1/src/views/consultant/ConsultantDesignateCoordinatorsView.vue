<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Designate MCP Coordinators</h1>
        <p class="desc">Assign an MCP coordinator to each department manually or via Excel.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <!-- Manual designate -->
    <section class="section">
      <h2>Add Manually</h2>

      <div class="form">
        <div class="form-item">
          <label>Coordinator Name</label>
          <input v-model="coordinatorName" type="text" placeholder="Enter name" />
        </div>

        <div class="form-item">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="name@bnbu.edu.cn" />
        </div>

        <div class="form-item">
          <label>Department</label>
          <select v-model="department">
            <option value="">-- Choose a department --</option>
            <option v-for="d in departmentList" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="buttons">
          <button :disabled="isLoading" @click="addManually">
            {{ isLoading ? 'Adding...' : 'Add' }}
          </button>
        </div>

        <p v-if="manualMsg" class="message" :class="{ error: isManualError }">
          {{ manualMsg }}
        </p>
      </div>
    </section>

    <!-- Excel import -->
    <section class="section">
      <h2>Or Batch Import</h2>

      <div class="form-item">
        <label>Excel File</label>
        <input type="file" accept=".xlsx,.xls" @change="onFileChange" />
        <small v-if="file">Selected: {{ file.name }}</small>
      </div>

      <p class="format-hint">
        Expected columns: Coordinator Name, Email, Department
      </p>

      <div class="buttons">
        <button :disabled="isImporting" @click="importFile">
          {{ isImporting ? 'Importing...' : 'Import' }}
        </button>
      </div>

      <p v-if="importMsg" class="message" :class="{ error: isImportError }">
        {{ importMsg }}
      </p>
    </section>

    <!-- Current designations -->
    <section class="section">
      <h2>Current Designations</h2>

      <table v-if="departments.length > 0">
        <thead>
        <tr>
          <th>Department</th>
          <th>Coordinator Name</th>
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
            <button
                v-if="d.coordinatorName"
                class="danger"
                :disabled="removingId === d.departmentId"
                @click="removeCoord(d.departmentId)"
            >
              {{ removingId === d.departmentId ? '...' : 'Delete' }}
            </button>
            <span v-else class="muted">N/A</span>
          </td>
        </tr>
        </tbody>
      </table>

      <p v-else class="empty">No departments configured yet.</p>
    </section>

    <button class="secondary" @click="goBack">Back</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listDepartments,
  designateCoordinator,
  removeCoordinator,
  importCoordinatorList,
} from '../../api/consultant'
import type { DepartmentSummary } from '../../api/consultant'

const router = useRouter()

const coordinatorName = ref('')
const email = ref('')
const department = ref('')
const departments = ref<DepartmentSummary[]>([])
const departmentList = ref<string[]>([])

const file = ref<File | null>(null)

const manualMsg = ref('')
const isManualError = ref(false)
const isLoading = ref(false)

const importMsg = ref('')
const isImportError = ref(false)
const isImporting = ref(false)

const removingId = ref('')

onMounted(loadDepartments)

async function loadDepartments() {
  try {
    departments.value = await listDepartments()
    departmentList.value = Array.from(new Set(departments.value.map((d) => d.departmentId)))
  } catch {
    // ignore
  }
}

async function addManually() {
  manualMsg.value = ''
  isManualError.value = false

  if (!coordinatorName.value.trim()) {
    manualMsg.value = 'Warning: Coordinator name cannot be empty.'
    isManualError.value = true
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) {
    manualMsg.value = 'Warning: Invalid email format.'
    isManualError.value = true
    return
  }
  if (!department.value) {
    manualMsg.value = 'Warning: Please select a department.'
    isManualError.value = true
    return
  }

  isLoading.value = true
  try {
    await designateCoordinator({
      coordinatorName: coordinatorName.value.trim(),
      email: email.value.trim(),
      department: department.value,
    })
    manualMsg.value = `Coordinator designated to ${department.value}.`
    coordinatorName.value = ''
    email.value = ''
    department.value = ''
    await loadDepartments()
  } catch (err: any) {
    manualMsg.value = err.message || 'Failed to designate.'
    isManualError.value = true
  } finally {
    isLoading.value = false
  }
}

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] || null
  importMsg.value = ''
}

async function importFile() {
  importMsg.value = ''
  isImportError.value = false

  if (!file.value) {
    importMsg.value = 'Warning: Please choose a file first.'
    isImportError.value = true
    return
  }

  isImporting.value = true
  try {
    const res = await importCoordinatorList(file.value)
    importMsg.value = `Imported ${res.imported} coordinator(s).`
    file.value = null
    await loadDepartments()
  } catch (err: any) {
    importMsg.value = err.message || 'Import failed.'
    isImportError.value = true
  } finally {
    isImporting.value = false
  }
}

async function removeCoord(deptId: string) {
  if (!confirm('Remove the coordinator from this department?')) return

  removingId.value = deptId
  try {
    await removeCoordinator(deptId)
    await loadDepartments()
  } catch (err: any) {
    alert(err.message || 'Failed to remove.')
  } finally {
    removingId.value = ''
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.section { margin-top: 26px; padding-top: 18px; border-top: 1px solid #e5e7eb; }
.section h2 { font-size: 17px; margin-bottom: 14px; }

.form { max-width: 500px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input, select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
small { display: block; margin-top: 6px; color: #6b7280; }
.format-hint {
  margin-top: 8px; padding: 10px; background: #f3f4f6;
  border-radius: 6px; color: #4b5563; font-size: 13px;
}

table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.buttons { margin-top: 16px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.empty { color: #6b7280; padding: 16px 0; }
.muted { color: #9ca3af; }
</style>
