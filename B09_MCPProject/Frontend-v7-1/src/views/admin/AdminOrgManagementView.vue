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
    </div>

    <h2>Current Organization Tree</h2>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else-if="tree.length === 0" class="empty">
      No organization data. Use Manual Setup or Excel Import to add entries.
    </div>

    <div v-else class="org-tree">
      <div v-for="(faculty, fIdx) in groupedTree" :key="fIdx" class="faculty">
        <h3>📂 {{ faculty.name }}</h3>
        <ul>
          <li v-for="(dept, dIdx) in faculty.departments" :key="dIdx">
            <strong>{{ dept.name }}</strong>
            <ul>
              <li v-for="(major, mIdx) in dept.majors" :key="mIdx">
                {{ major }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getOrgTree } from '../../api/admin'
import type { OrgEntry } from '../../api/admin'

const router = useRouter()

const tree = ref<OrgEntry[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

/**
 * Group entries by faculty → department → major for tree rendering.
 */
const groupedTree = computed(() => {
  const facMap = new Map<string, Map<string, string[]>>()

  for (const e of tree.value) {
    if (!facMap.has(e.faculty)) facMap.set(e.faculty, new Map())
    const depMap = facMap.get(e.faculty)!
    if (!depMap.has(e.department)) depMap.set(e.department, [])
    depMap.get(e.department)!.push(e.major)
  }

  return Array.from(facMap.entries()).map(([fac, depMap]) => ({
    name: fac,
    departments: Array.from(depMap.entries()).map(([dep, majors]) => ({
      name: dep,
      majors,
    })),
  }))
})

onMounted(async () => {
  try {
    tree.value = await getOrgTree()
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load organization tree.'
  } finally {
    isLoading.value = false
  }
})

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.actions-row { display: flex; gap: 12px; margin: 22px 0; }
.action-btn {
  display: inline-block; padding: 10px 18px;
  background: #2563eb; color: white;
  border-radius: 6px; text-decoration: none;
}
.action-btn.secondary { background: #6b7280; }

h2 { margin-top: 24px; font-size: 18px; }

.org-tree { margin-top: 16px; }
.faculty {
  padding: 14px 18px; margin-bottom: 14px;
  background: #f9fafb; border-radius: 8px;
}
.faculty h3 { margin: 0 0 10px 0; font-size: 16px; }
.faculty ul { margin: 6px 0 0 18px; padding: 0; }
.faculty ul ul { margin-left: 18px; color: #6b7280; }

.empty, .loading { color: #6b7280; padding: 20px 0; }
.buttons { margin-top: 22px; }
.error { color: #dc2626; margin-top: 14px; }
</style>
