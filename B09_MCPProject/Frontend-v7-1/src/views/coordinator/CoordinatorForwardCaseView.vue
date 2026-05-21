<template>
  <section class="page">
    <h1>Coordinator Cases</h1>

    <p v-if="error" class="error">{{ error }}</p>
    <button @click="load">Refresh</button>

    <table class="table">
      <thead>
        <tr>
          <th>Case ID</th>
          <th>Student ID</th>
          <th>Description</th>
          <th>Status</th>
          <th>Target Consultant</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cases" :key="c.caseId">
          <td>{{ c.caseId }}</td>
          <td>{{ c.studentId }}</td>
          <td>{{ c.description }}</td>
          <td>{{ c.status || '-' }}</td>
          <td>
            <select v-model="targetConsultants[c.caseId]">
              <option value="">Select FC</option>
              <option v-for="fc in consultants" :key="fc.id" :value="fc.id">
                {{ fc.realName || fc.username }} / {{ fc.email }}
              </option>
            </select>
          </td>
          <td>
            <button class="primary" @click="forward(c.caseId)">Forward</button>
            <button @click="reject(c.caseId)">Reject</button>
          </td>
        </tr>
        <tr v-if="cases.length === 0">
          <td colspan="6" class="empty">No cases.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { listConsultants, type AdminAccount } from '../../api/admin'
import {
  forwardCaseToConsultant,
  listCoordinatorCases,
  rejectCase,
  type CaseItem,
} from '../../api/mentoring'

const cases = ref<CaseItem[]>([])
const consultants = ref<AdminAccount[]>([])
const targetConsultants = reactive<Record<string, string>>({})
const error = ref('')

async function load() {
  error.value = ''
  try {
    const [caseList, fcList] = await Promise.all([listCoordinatorCases(), listConsultants()])
    cases.value = caseList
    consultants.value = fcList
  } catch (e: any) {
    error.value = e.message || 'Failed to load cases.'
  }
}

async function forward(caseId: string) {
  const targetConsultantId = targetConsultants[caseId]
  if (!targetConsultantId) {
    alert('Please select a Faculty Consultant.')
    return
  }

  try {
    await forwardCaseToConsultant({ caseId, targetConsultantId })
    await load()
  } catch (e: any) {
    alert(e.message || 'Forward failed.')
  }
}

async function reject(caseId: string) {
  if (!window.confirm('Reject this case?')) return
  try {
    await rejectCase(caseId)
    await load()
  } catch (e: any) {
    alert(e.message || 'Reject failed.')
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #fff; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; vertical-align: top; }
th { background: #f8fafc; }
select { padding: 7px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { margin-right: 6px; padding: 7px 10px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
