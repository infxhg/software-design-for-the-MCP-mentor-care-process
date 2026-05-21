<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Coordinator Cases</h1>
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
          :key="item.caseId"
          class="case-item"
          :class="{ active: selectedCase?.caseId === item.caseId }"
          @click="selectedCase = item"
        >
          <strong>{{ item.studentId || 'Unknown student' }}</strong>
          <span>{{ item.status || 'pending' }}</span>
        </button>
      </aside>

      <section v-if="selectedCase" class="detail">
        <h2>Case Detail</h2>
        <p><strong>Case ID:</strong> {{ selectedCase.caseId }}</p>
        <p><strong>Student:</strong> {{ selectedCase.studentId || '-' }}</p>
        <p><strong>Submitter:</strong> {{ selectedCase.submitterId || '-' }}</p>
        <p><strong>Status:</strong> {{ selectedCase.status || '-' }}</p>
        <p><strong>Description:</strong></p>
        <p class="box">{{ selectedCase.description || '-' }}</p>

        <div class="form-item">
          <label>Target Consultant ID</label>
          <input
            v-model.trim="consultantId"
            placeholder="Enter target Faculty Consultant sys_user.id"
          />
          <p class="hint">
            The uploaded OpenAPI does not provide a coordinator-accessible consultant list.
            Use the targetConsultantId from backend/database/user list.
          </p>
        </div>

        <button :disabled="submitting || !consultantId" @click="forwardCase">
          {{ submitting ? 'Forwarding...' : 'Forward to Consultant' }}
        </button>
      </section>
    </div>

    <p v-else-if="!loading" class="empty">
      No cases.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  forwardCaseToConsultant,
  listCoordinatorCases,
  type CaseItem,
} from '../../api/mentoring'

const router = useRouter()

const cases = ref<CaseItem[]>([])
const selectedCase = ref<CaseItem | null>(null)
const consultantId = ref('')
const loading = ref(false)
const submitting = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(loadCases)

async function loadCases() {
  loading.value = true
  clearMessage()

  try {
    cases.value = await listCoordinatorCases()
    selectedCase.value = cases.value[0] || null
  } catch (err: any) {
    showError(toFriendlyError(err, 'Failed to load coordinator cases.'))
  } finally {
    loading.value = false
  }
}

async function forwardCase() {
  if (!selectedCase.value) return

  submitting.value = true
  clearMessage()

  try {
    await forwardCaseToConsultant({
      caseId: selectedCase.value.caseId,
      targetConsultantId: consultantId.value,
    })

    showSuccess('Case forwarded successfully.')
    consultantId.value = ''
    await loadCases()
  } catch (err: any) {
    showError(toFriendlyError(err, 'Failed to forward case.'))
  } finally {
    submitting.value = false
  }
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/permission|forbidden|403|access/i.test(text)) {
    return `${fallback} Backend says this token has no permission. Confirm /api/user/userInfo roles include MCP/COORDINATOR and login again.`
  }
  return text || fallback
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
  padding: 12px;
  border-radius: 8px;
}
.case-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.detail {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
}
.box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 8px;
}
.form-item {
  margin-top: 16px;
}
input,
select {
  width: 100%;
  padding: 9px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.hint,
.empty {
  color: #6b7280;
}
.message {
  margin-top: 14px;
  color: #166534;
}
.error {
  color: #dc2626;
}
</style>
