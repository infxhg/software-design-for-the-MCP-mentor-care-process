<template>
  <section class="page">
    <h1>Forward Special Case</h1>

    <form class="card" @submit.prevent="submit">
      <label>
        Student ID
        <input v-model.trim="form.studentId" required />
      </label>
      <label>
        Target Coordinator ID
        <input v-model.trim="form.targetCoordinatorId" required />
      </label>
      <label>
        Case Description
        <textarea v-model.trim="form.description" rows="6" maxlength="1000" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="saving">{{ saving ? 'Submitting...' : 'Submit Case' }}</button>
    </form>

    <div class="card">
      <h2>My Submitted Cases</h2>
      <button @click="loadCases">Refresh</button>
      <table class="table">
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Student ID</th>
            <th>Coordinator</th>
            <th>Status</th>
            <th>Create Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cases" :key="c.caseId">
            <td>{{ c.caseId }}</td>
            <td>{{ c.studentId }}</td>
            <td>{{ c.coordinatorId || '-' }}</td>
            <td>{{ c.status || '-' }}</td>
            <td>{{ c.createTime || '-' }}</td>
          </tr>
          <tr v-if="cases.length === 0">
            <td colspan="5" class="empty">No cases.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { createSpecialCase, listMySubmittedCases, type CaseItem } from '../../api/mentoring'

const form = reactive({
  studentId: '',
  targetCoordinatorId: '',
  description: '',
})
const cases = ref<CaseItem[]>([])
const saving = ref(false)
const error = ref('')

async function loadCases() {
  try {
    cases.value = await listMySubmittedCases()
  } catch (e: any) {
    error.value = e.message || 'Failed to load cases.'
  }
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await createSpecialCase(form)
    form.studentId = ''
    form.targetCoordinatorId = ''
    form.description = ''
    await loadCases()
    alert('Case submitted.')
  } catch (e: any) {
    error.value = e.message || 'Submit failed.'
  } finally {
    saving.value = false
  }
}

onMounted(loadCases)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-weight: 600; }
input, textarea { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { width: fit-content; padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
