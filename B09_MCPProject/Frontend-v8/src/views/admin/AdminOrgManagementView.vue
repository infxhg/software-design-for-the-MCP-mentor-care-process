<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Organization Management</h1>
        <p class="desc">Manage faculties, departments, and majors.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="actions-row">
      <router-link to="/admin/organization/manual" class="action-btn">
        Manual Setup
      </router-link>
      <router-link to="/admin/organization/excel" class="action-btn secondary">
        Excel File Import
      </router-link>
      <button class="action-btn light" :disabled="isLoading" @click="load">
        {{ isLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p class="hint">
      Delete is blocked by the backend when a unit still has child nodes. Delete majors before departments,
      and departments before faculties.
    </p>

    <h2>Current Organization Tree</h2>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else-if="units.length === 0" class="empty">
      No organization data. Use Manual Setup or Excel Import to add entries.
    </div>

    <div v-else class="org-tree">
      <div v-for="faculty in faculties" :key="faculty.id" class="unit-card faculty">
        <div class="unit-header">
          <h3>📂 {{ faculty.name }}</h3>
          <div class="meta">
            <span>{{ faculty.id }}</span>
            <button class="danger" @click="removeUnit(faculty)">Delete</button>
          </div>
        </div>

        <div v-for="dept in childrenOf(faculty.id)" :key="dept.id" class="unit-card dept">
          <div class="unit-header">
            <h4>↳ {{ dept.name }}</h4>
            <div class="meta">
              <span>{{ dept.id }}</span>
              <button class="danger" @click="removeUnit(dept)">Delete</button>
            </div>
          </div>

          <ul class="major-list">
            <li v-for="major in childrenOf(dept.id)" :key="major.id">
              <span>{{ major.name }}</span>
              <small>{{ major.id }}</small>
              <button class="danger small" @click="removeUnit(major)">Delete</button>
            </li>
            <li v-if="childrenOf(dept.id).length === 0" class="empty-inline">
              No majors.
            </li>
          </ul>
        </div>

        <div v-if="childrenOf(faculty.id).length === 0" class="empty-inline">
          No departments.
        </div>
      </div>

      <div v-if="orphanUnits.length" class="unit-card">
        <h3>Other Units</h3>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Parent ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="unit in orphanUnits" :key="unit.id">
              <td>{{ unit.id }}</td>
              <td>{{ unit.name }}</td>
              <td>{{ unit.type || unit.unitType }}</td>
              <td>{{ unit.parentId || '-' }}</td>
              <td><button class="danger" @click="removeUnit(unit)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteOrgUnit, listOrgUnits, type OrgUnit } from '../../api/admin'

const router = useRouter()

const units = ref<OrgUnit[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

function isType(unit: OrgUnit, type: string): boolean {
  return String(unit.type || unit.unitType || '').toUpperCase() === type.toUpperCase()
}

function sortUnits(rows: OrgUnit[]): OrgUnit[] {
  return [...rows].sort((a, b) => {
    const order = Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    if (order !== 0) return order
    return String(a.name || a.id).localeCompare(String(b.name || b.id))
  })
}

const faculties = computed(() => sortUnits(units.value.filter((unit) => isType(unit, 'FACULTY'))))

const knownIds = computed(() => new Set(units.value.map((unit) => unit.id)))

const orphanUnits = computed(() =>
  sortUnits(
    units.value.filter((unit) => {
      if (isType(unit, 'FACULTY')) return false
      if (!unit.parentId) return true
      return !knownIds.value.has(String(unit.parentId))
    }),
  ),
)

function childrenOf(parentId?: string | null): OrgUnit[] {
  if (!parentId) return []
  return sortUnits(units.value.filter((unit) => String(unit.parentId || '') === String(parentId)))
}

async function load() {
  isLoading.value = true
  errorMsg.value = ''

  try {
    units.value = await listOrgUnits()
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load organization tree.'
  } finally {
    isLoading.value = false
  }
}

async function removeUnit(unit: OrgUnit) {
  if (!unit.id) return

  const ok = window.confirm(
    `Delete "${unit.name}" (${unit.id})?\n\nThe backend will reject this if the unit still has child nodes.`,
  )
  if (!ok) return

  try {
    await deleteOrgUnit(unit.id)
    await load()
  } catch (err: any) {
    errorMsg.value = err.message || 'Delete failed. Delete child nodes first.'
  }
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}

onMounted(load)
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.actions-row { display: flex; flex-wrap: wrap; gap: 12px; margin: 22px 0; }
.action-btn {
  display: inline-block;
  padding: 10px 18px;
  background: #2563eb;
  color: white;
  border: 1px solid #2563eb;
  border-radius: 6px;
  text-decoration: none;
  cursor: pointer;
}
.action-btn.secondary { background: #6b7280; border-color: #6b7280; }
.action-btn.light { background: #fff; color: #111827; border-color: #d1d5db; }
.action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.hint { margin: 12px 0; color: #6b7280; }
h2 { margin-top: 24px; font-size: 18px; }
.org-tree { margin-top: 16px; }
.unit-card {
  padding: 14px 18px;
  margin-bottom: 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.faculty { background: #f9fafb; }
.dept { margin: 10px 0 10px 20px; }
.unit-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.unit-header h3, .unit-header h4 { margin: 0; }
.meta { display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 12px; }
.major-list { margin: 10px 0 0 22px; padding: 0; }
.major-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}
.major-list small { color: #6b7280; }
.empty, .loading { color: #6b7280; padding: 20px 0; }
.empty-inline { color: #6b7280; font-style: italic; }
.table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
th { background: #f8fafc; }
.buttons { margin-top: 22px; }
button { padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }
.danger { color: #b42318; border-color: #f3b8b2; background: #fff; }
.small { padding: 3px 8px; font-size: 12px; }
.error { color: #dc2626; margin-top: 14px; }
</style>
