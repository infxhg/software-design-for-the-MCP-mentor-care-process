<template>
  <div class="coordinator-cases-page">
    <header class="page-header">
      <div>
        <h1>Coordinator Cases</h1>
        <p>Review special cases and forward pending cases to a Faculty Consultant.</p>
      </div>
      <div class="header-actions">
        <button class="secondary" type="button" @click="loadCases">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <button class="secondary" type="button" @click="goHome">Home</button>
      </div>
    </header>

    <p v-if="message" class="notice" :class="{ error: isError }">{{ message }}</p>

    <section class="summary-grid">
      <div class="summary-card"><span>Total</span><strong>{{ cases.length }}</strong></div>
      <div class="summary-card"><span>Waiting</span><strong>{{ pendingCount }}</strong></div>
      <div class="summary-card"><span>Forwarded</span><strong>{{ forwardedCount }}</strong></div>
      <div class="summary-card"><span>Closed</span><strong>{{ closedCount }}</strong></div>
    </section>

    <section class="content-card">
      <aside class="case-list">
        <div class="list-toolbar">
          <h2>Cases</h2>
          <select v-model="statusFilter">
            <option value="ALL">All</option>
            <option value="AT_COORDINATOR">Waiting for Coordinator</option>
            <option value="AT_CONSULTANT">Forwarded to Consultant</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div v-if="loading" class="empty-state">Loading cases...</div>
        <div v-else-if="filteredCases.length === 0" class="empty-state">No cases.</div>

        <button
          v-for="item in filteredCases"
          v-else
          :key="item.caseId"
          type="button"
          class="case-item"
          :class="{ active: selectedCase?.caseId === item.caseId }"
          @click="selectCase(item)"
        >
          <div>
            <strong>{{ item.studentId || 'Unknown student' }}</strong>
            <span>{{ item.caseId }}</span>
          </div>
          <em :class="statusClass(item.status)">{{ statusLabel(item.status) }}</em>
        </button>
      </aside>

      <main class="case-detail">
        <div v-if="!selectedCase" class="empty-state large">Select a case to review.</div>

        <template v-else>
          <div class="detail-header">
            <div>
              <h2>Case Detail</h2>
              <p>{{ selectedCase.caseId }}</p>
            </div>
            <span :class="['status-pill', statusClass(selectedCase.status)]">
              {{ statusLabel(selectedCase.status) }}
            </span>
          </div>

          <div class="info-grid">
            <div><span>Student</span><strong>{{ selectedCase.studentId || '-' }}</strong></div>
            <div><span>Submitted By</span><strong>{{ selectedCase.submitterId || '-' }}</strong></div>
            <div><span>Coordinator</span><strong>{{ selectedCase.coordinatorId || '-' }}</strong></div>
            <div><span>Faculty Consultant</span><strong>{{ selectedCase.consultantId || '-' }}</strong></div>
          </div>

          <div class="description-box">
            <span>Description</span>
            <p>{{ selectedCase.description || '-' }}</p>
          </div>

          <section class="forward-panel">
            <h3>Forward to Faculty Consultant</h3>

            <p v-if="!isForwardable(selectedCase)" class="muted">
              This case is not waiting for coordinator action, so it cannot be forwarded again.
            </p>

            <template v-else>
              <label for="consultantId">Faculty Consultant ID</label>
              <input
                id="consultantId"
                v-model.trim="targetConsultantId"
                placeholder="Example: test_faculty_01"
                @keydown.enter.prevent="forwardSelectedCase"
              />

              <div class="quick-row">
                <button
                  v-for="id in consultantExamples"
                  :key="id"
                  type="button"
                  class="chip"
                  @click="targetConsultantId = id"
                >
                  {{ id }}
                </button>
              </div>

              <button
                type="button"
                :disabled="submitting || !targetConsultantId"
                @click="forwardSelectedCase"
              >
                {{ submitting ? 'Forwarding...' : 'Forward to Consultant' }}
              </button>
            </template>
          </section>
        </template>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  forwardCaseToConsultant,
  listCoordinatorCases,
  type CaseItem,
} from '../../api/mentoring'

const router = useRouter()

const cases = ref<CaseItem[]>([])
const selectedCase = ref<CaseItem | null>(null)
const statusFilter = ref('ALL')
const targetConsultantId = ref('')
const loading = ref(false)
const submitting = ref(false)
const message = ref('')
const isError = ref(false)

const consultantExamples = ['test_faculty_01', 'test_faculty_02']

const filteredCases = computed(() => {
  if (statusFilter.value === 'ALL') return cases.value
  return cases.value.filter((item) => normalizeStatus(item.status) === statusFilter.value)
})

const pendingCount = computed(() => cases.value.filter((item) => normalizeStatus(item.status) === 'AT_COORDINATOR').length)
const forwardedCount = computed(() => cases.value.filter((item) => normalizeStatus(item.status) === 'AT_CONSULTANT').length)
const closedCount = computed(() => cases.value.filter((item) => normalizeStatus(item.status) === 'CLOSED').length)

onMounted(loadCases)

async function loadCases() {
  clearMessage()
  loading.value = true

  try {
    const list = await listCoordinatorCases()
    cases.value = list.map(normalizeCase).sort(sortCases)

    if (cases.value.length > 0) {
      selectedCase.value = cases.value.find((item) => normalizeStatus(item.status) === 'AT_COORDINATOR') || cases.value[0]
    } else {
      selectedCase.value = null
    }
  } catch (err: any) {
    cases.value = []
    selectedCase.value = null
    showError(err?.message || 'Failed to load coordinator cases.')
  } finally {
    loading.value = false
  }
}

function selectCase(item: CaseItem) {
  selectedCase.value = item
  targetConsultantId.value = ''
  clearMessage()
}

async function forwardSelectedCase() {
  clearMessage()

  if (!selectedCase.value) {
    showError('Please select a case first.')
    return
  }

  if (!isForwardable(selectedCase.value)) {
    showError('Only cases waiting for coordinator action can be forwarded.')
    return
  }

  if (!targetConsultantId.value) {
    showError('Please enter a Faculty Consultant ID.')
    return
  }

  submitting.value = true

  try {
    await forwardCaseToConsultant({
      caseId: selectedCase.value.caseId,
      targetConsultantId: targetConsultantId.value,
      consultantId: targetConsultantId.value,
    })

    showSuccess('Case forwarded successfully.')
    targetConsultantId.value = ''
    await loadCases()
  } catch (err: any) {
    showError(toFriendlyError(err))
  } finally {
    submitting.value = false
  }
}

function normalizeCase(raw: any): CaseItem {
  const caseId = String(raw?.caseId || raw?.id || '')
  return {
    ...raw,
    caseId,
    id: raw?.id || caseId,
    studentId: String(raw?.studentId || ''),
    submitterId: raw?.submitterId || raw?.mentorId || raw?.createdBy || '',
    coordinatorId: raw?.coordinatorId || '',
    consultantId: raw?.consultantId || raw?.targetConsultantId || '',
    description: raw?.description || raw?.caseDescription || '',
    status: normalizeStatus(raw?.status),
  }
}

function normalizeStatus(status?: string): string {
  const value = String(status || '').trim().toUpperCase()

  if (value === 'PENDING_COORDINATOR') return 'AT_COORDINATOR'
  if (value === 'FORWARDED_TO_CONSULTANT') return 'AT_CONSULTANT'
  if (value === 'FORWARDED') return 'AT_CONSULTANT'
  if (value === 'REJECTED') return 'AT_COORDINATOR'
  if (!value) return 'AT_COORDINATOR'

  return value
}

function statusLabel(status?: string): string {
  const value = normalizeStatus(status)
  if (value === 'AT_COORDINATOR') return 'Waiting for Coordinator'
  if (value === 'AT_CONSULTANT') return 'Forwarded to Consultant'
  if (value === 'CLOSED') return 'Closed'
  return value
}

function statusClass(status?: string): string {
  const value = normalizeStatus(status)
  if (value === 'AT_COORDINATOR') return 'pending'
  if (value === 'AT_CONSULTANT') return 'forwarded'
  if (value === 'CLOSED') return 'closed'
  return 'pending'
}

function isForwardable(item: CaseItem): boolean {
  return normalizeStatus(item.status) === 'AT_COORDINATOR'
}

function sortCases(a: CaseItem, b: CaseItem): number {
  const weight: Record<string, number> = {
    AT_COORDINATOR: 0,
    AT_CONSULTANT: 1,
    CLOSED: 2,
  }

  const statusDiff = (weight[normalizeStatus(a.status)] ?? 9) - (weight[normalizeStatus(b.status)] ?? 9)
  if (statusDiff !== 0) return statusDiff

  return String(b.createTime || '').localeCompare(String(a.createTime || ''))
}

function toFriendlyError(err: any): string {
  const text = String(err?.message || err || '')

  if (/permission|forbidden|403|access/i.test(text)) {
    return 'The backend rejected this request. Please check that this account is an MCP Coordinator.'
  }

  if (/not found|不存在|does not exist/i.test(text)) {
    return 'Case or Faculty Consultant was not found. Please check the Faculty Consultant ID.'
  }

  return text || 'Failed to forward case.'
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
.coordinator-cases-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header,
.header-actions,
.list-toolbar,
.detail-header,
.quick-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header,
.list-toolbar,
.detail-header {
  justify-content: space-between;
}

.page-header {
  margin-bottom: 22px;
}

h1,
h2,
h3 {
  margin: 0;
  color: #111827;
}

.page-header p,
.detail-header p,
.muted {
  color: #6b7280;
}

.notice {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
}

.notice.error {
  background: #fef2f2;
  color: #dc2626;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.summary-card {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}

.summary-card span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 13px;
}

.summary-card strong {
  color: #111827;
  font-size: 24px;
}

.content-card {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.case-list {
  display: grid;
  align-content: start;
  gap: 10px;
}

.list-toolbar {
  margin-bottom: 4px;
}

select,
input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 11px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  background: #ffffff;
  outline: none;
}

.case-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.case-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.case-item strong,
.case-item span {
  display: block;
}

.case-item span {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.case-item em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.status-pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
}

.pending {
  background: #fef3c7;
  color: #92400e;
}

.forwarded {
  background: #eff6ff;
  color: #1d4ed8;
}

.closed {
  background: #f3f4f6;
  color: #4b5563;
}

.case-detail {
  min-height: 430px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.empty-state {
  padding: 24px;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  color: #6b7280;
  text-align: center;
}

.empty-state.large {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.info-grid div,
.description-box {
  padding: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

.info-grid span,
.description-box span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 13px;
}

.info-grid strong {
  word-break: break-word;
}

.description-box {
  margin-top: 12px;
}

.description-box p {
  margin: 0;
  line-height: 1.55;
}

.forward-panel {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}

.forward-panel h3 {
  margin-bottom: 12px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 700;
}

.quick-row {
  flex-wrap: wrap;
  margin: 10px 0 14px;
}

button {
  border: none;
  border-radius: 9px;
  padding: 9px 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button.secondary,
button.chip {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 900px) {
  .summary-grid,
  .content-card,
  .info-grid {
    grid-template-columns: 1fr;
  }

  .page-header,
  .detail-header,
  .list-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
