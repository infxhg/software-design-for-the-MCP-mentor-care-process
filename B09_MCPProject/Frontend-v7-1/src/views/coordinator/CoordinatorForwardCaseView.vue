<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Forward Cases</h1>
        <p class="desc">Review special cases and forward them to a Faculty Consultant.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </p>

    <p v-if="loading" class="empty">Loading...</p>

    <div class="layout" v-if="cases.length > 0">
      <aside class="case-list">
        <button
          v-for="item in cases"
          :key="item.id"
          class="case-item"
          :class="{ active: selectedCase?.id === item.id }"
          @click="selectedCase = item"
        >
          <strong>{{ item.studentName || item.studentId || 'Unknown student' }}</strong>
          <span>{{ item.status || 'pending' }}</span>
        </button>
      </aside>

      <section v-if="selectedCase" class="detail">
        <h2>Case Detail</h2>
        <p><strong>Student:</strong> {{ selectedCase.studentName || selectedCase.studentId || '-' }}</p>
        <p><strong>Mentor:</strong> {{ selectedCase.mentorName || selectedCase.mentorId || '-' }}</p>
        <p><strong>Status:</strong> {{ selectedCase.status || '-' }}</p>
        <p><strong>Description:</strong></p>
        <p class="box">{{ selectedCase.caseDescription || selectedCase.description || '-' }}</p>

        <div class="form-item">
          <label>Faculty Consultant</label>
          <select v-if="consultants.length > 0" v-model="consultantId">
            <option value="">-- Select Consultant --</option>
            <option v-for="user in consultants" :key="user.id" :value="user.id">
              {{ user.name }}{{ user.email ? ` (${user.email})` : '' }}
            </option>
          </select>
          <input
            v-else
            v-model.trim="consultantId"
            placeholder="Enter Faculty Consultant ID or email"
          />
          <p v-if="consultants.length === 0" class="hint">
            Consultant receiver-list API is not available yet, so manual ID input is allowed.
          </p>
        </div>

        <button :disabled="submitting || !consultantId" @click="forwardCase">
          {{ submitting ? 'Forwarding...' : 'Forward to Consultant' }}
        </button>
      </section>
    </div>

    <p v-else-if="!loading" class="empty">
      No forwarded cases.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const cases = ref<any[]>([])
const selectedCase = ref<any | null>(null)
const consultants = ref<{ id: string; name: string; email?: string }[]>([])
const consultantId = ref('')
const loading = ref(false)
const submitting = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(async () => {
  await Promise.all([loadCases(), loadConsultants()])
})

async function loadCases() {
  loading.value = true
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.listForwardedCasesForCoordinator ||
      mentoringApi.listForwardedCasesForCoordinator ||
      mentoringApi.listCoordinatorCases ||
      mentoringApi.getCoordinatorCases

    if (!fn) {
      throw new Error('Coordinator case list API is not available.')
    }

    const data = await fn()
    cases.value = normalizeCases(data)
    selectedCase.value = cases.value[0] || null
  } catch (err: any) {
    showError(err.message || 'Failed to load cases.')
  } finally {
    loading.value = false
  }
}

async function loadConsultants() {
  try {
    const communicationApi: any = await import('../../api/communication')
    const adminApi: any = await import('../../api/admin')

    const fn =
      communicationApi.getAvailableReceivers ||
      communicationApi.listAvailableReceivers ||
      adminApi.listConsultants

    if (!fn) return

    const data = fn === communicationApi.getAvailableReceivers ? await fn('case') : await fn()
    consultants.value = normalizeUsers(data)
  } catch {
    consultants.value = []
  }
}

async function forwardCase() {
  if (!selectedCase.value) return
  if (!consultantId.value) {
    showError('Please select or enter consultant ID.')
    return
  }

  submitting.value = true
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.forwardCaseToConsultant ||
      mentoringApi.forwardCaseToConsultant ||
      mentoringApi.forwardSpecialCaseToConsultant

    if (!fn) {
      throw new Error('Forward-to-consultant API is not available.')
    }

    await fn({
      caseId: selectedCase.value.id,
      consultantId: consultantId.value,
      forwardToId: consultantId.value,
    })

    showSuccess('Case forwarded successfully.')
    consultantId.value = ''
    await loadCases()
  } catch (err: any) {
    showError(err.message || 'Failed to forward case.')
  } finally {
    submitting.value = false
  }
}

function normalizeCases(data: any) {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list
    .map((item: any) => ({
      ...item,
      id: String(item.caseId ?? item.id ?? ''),
      caseDescription: item.caseDescription ?? item.description,
    }))
    .filter((item: any) => item.id)
}

function normalizeUsers(data: any) {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list
    .map((item: any) => ({
      id: String(item.id ?? item.userId ?? item.consultantId ?? item.email ?? ''),
      name: item.name ?? item.consultantName ?? item.username ?? item.email,
      email: item.email,
    }))
    .filter((item: any) => item.id)
}

function goHome() {
  router.push('/main')
}

function clearMessage() {
  message.value = ''
  isError.value = false
}

function showSuccess(text: string) {
  message.value = text
  isError.value = false
}

function showError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  margin-top: 22px;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.case-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  background: #f9fafb;
  color: #111827;
  border: 1px solid #e5e7eb;
}
.case-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.detail {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}
.box {
  white-space: pre-wrap;
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
}
.form-item {
  margin: 16px 0;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
input,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.hint,
.empty {
  color: #6b7280;
}
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
