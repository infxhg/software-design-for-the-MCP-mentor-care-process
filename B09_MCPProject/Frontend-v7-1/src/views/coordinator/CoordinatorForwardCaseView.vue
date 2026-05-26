<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Coordinator Cases</h1>
        <p>Review special cases assigned to you and forward them to a Faculty Consultant.</p>
      </div>

      <button class="secondary-btn" type="button" :disabled="isLoading" @click="loadPageData">
        Refresh
      </button>
    </header>

    <section class="summary-grid">
      <div class="summary-card">
        <span>Total</span>
        <strong>{{ totalCount }}</strong>
      </div>

      <div class="summary-card">
        <span>Waiting</span>
        <strong>{{ waitingCount }}</strong>
      </div>

      <div class="summary-card">
        <span>Forwarded</span>
        <strong>{{ forwardedCount }}</strong>
      </div>

      <div class="summary-card">
        <span>Closed</span>
        <strong>{{ closedCount }}</strong>
      </div>
    </section>

    <p v-if="caseMessage" class="message" :class="{ error: isCaseError }">
      {{ caseMessage }}
    </p>

    <section class="content-card">
      <div v-if="isLoading" class="empty-state">
        Loading coordinator cases...
      </div>

      <div v-else-if="cases.length === 0" class="empty-state">
        No cases assigned to this coordinator.
      </div>

      <div v-else class="case-list">
        <article v-for="item in cases" :key="getCaseId(item)" class="case-card">
          <div class="case-top">
            <div>
              <h2>Case #{{ getCaseId(item) }}</h2>
              <p class="meta">
                Student ID: <strong>{{ item.studentId || '-' }}</strong>
              </p>
            </div>

            <span class="status-pill" :class="statusClass(item.status)">
              {{ getStatusLabel(item.status) }}
            </span>
          </div>

          <p class="description">
            {{ item.description || 'No description provided.' }}
          </p>

          <dl class="case-info">
            <div>
              <dt>Submitter</dt>
              <dd>{{ item.submitterId || item.creatorId || '-' }}</dd>
            </div>

            <div>
              <dt>Coordinator</dt>
              <dd>{{ item.coordinatorId || item.targetCoordinatorId || '-' }}</dd>
            </div>

            <div>
              <dt>Consultant</dt>
              <dd>{{ item.consultantId || item.targetConsultantId || '-' }}</dd>
            </div>

            <div>
              <dt>Created</dt>
              <dd>{{ formatTime(item.createTime || item.createdAt) }}</dd>
            </div>
          </dl>

          <div class="forward-row">
            <label>
              Forward to Faculty Consultant
              <select
                v-model="selectedConsultants[getCaseId(item)]"
                :disabled="!canForward(item) || isSubmitting"
              >
                <option value="">Select consultant</option>
                <option
                  v-for="consultant in consultants"
                  :key="consultant.id"
                  :value="consultant.id"
                >
                  {{ getConsultantName(consultant) }}
                </option>
              </select>
            </label>

            <label>
              Or enter consultant ID manually
              <input
                v-model="manualConsultants[getCaseId(item)]"
                type="text"
                placeholder="Faculty consultant user ID"
                :disabled="!canForward(item) || isSubmitting"
              />
            </label>

            <button
              class="primary-btn"
              type="button"
              :disabled="!canForward(item) || isSubmitting"
              @click="handleForward(item)"
            >
              Forward
            </button>

            <button
              class="danger-btn"
              type="button"
              :disabled="!canForward(item) || isSubmitting"
              @click="handleReject(item)"
            >
              Reject
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { del, get, put, unwrap } from '../../api/request'
import { listConsultants, type AdminAccount } from '../../api/admin'

type AnyRecord = Record<string, any>
type NormalizedCaseStatus = 'WAITING' | 'FORWARDED' | 'CLOSED' | 'REJECTED' | 'UNKNOWN'

interface LocalCaseItem {
  id?: string | number
  caseId?: string | number
  specialCaseId?: string | number
  studentId?: string
  description?: string
  status?: string
  submitterId?: string
  creatorId?: string
  coordinatorId?: string
  targetCoordinatorId?: string
  consultantId?: string
  targetConsultantId?: string
  createTime?: string
  createdAt?: string
  [key: string]: any
}

const cases = ref<LocalCaseItem[]>([])
const consultants = ref<AdminAccount[]>([])
const selectedConsultants = ref<Record<string, string>>({})
const manualConsultants = ref<Record<string, string>>({})

const isLoading = ref(false)
const isSubmitting = ref(false)
const caseMessage = ref('')
const isCaseError = ref(false)

const totalCount = computed(() => cases.value.length)

const waitingCount = computed(
  () => cases.value.filter((item) => normalizeCaseStatus(item.status) === 'WAITING').length,
)

const forwardedCount = computed(
  () => cases.value.filter((item) => normalizeCaseStatus(item.status) === 'FORWARDED').length,
)

const closedCount = computed(
  () =>
    cases.value.filter((item) => {
      const status = normalizeCaseStatus(item.status)
      return status === 'CLOSED' || status === 'REJECTED'
    }).length,
)

onMounted(() => {
  loadPageData()
})

async function loadPageData(): Promise<void> {
  caseMessage.value = ''
  isCaseError.value = false
  isLoading.value = true

  try {
    const [caseList, consultantList] = await Promise.all([
      listCoordinatorCases(),
      loadConsultantsSafely(),
    ])

    cases.value = caseList
    consultants.value = consultantList

    if (caseList.length === 0) {
      caseMessage.value = 'No cases assigned to this coordinator.'
      isCaseError.value = false
    }

    if (caseList.length > 0 && consultantList.length === 0) {
      caseMessage.value =
        'Cases loaded, but no Faculty Consultant list was returned. You can enter a consultant ID manually.'
      isCaseError.value = false
    }
  } catch (error: any) {
    cases.value = []
    isCaseError.value = true
    caseMessage.value = buildCaseErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

async function listCoordinatorCases(): Promise<LocalCaseItem[]> {
  const res = await get<unknown>('/api/mentoring/cases/coordinator')
  const data = unwrap(res)

  return asArray(data).map((item) => normalizeCase(item))
}

async function loadConsultantsSafely(): Promise<AdminAccount[]> {
  try {
    return await listConsultants()
  } catch {
    return []
  }
}

function normalizeCase(raw: AnyRecord): LocalCaseItem {
  return {
    ...raw,
    id: raw.id ?? raw.caseId ?? raw.specialCaseId,
    caseId: raw.caseId ?? raw.id ?? raw.specialCaseId,
    studentId: raw.studentId ?? raw.student?.studentId ?? raw.student?.id,
    description: raw.description ?? raw.reason ?? raw.content ?? '',
    status: raw.status ?? raw.caseStatus,
    submitterId: raw.submitterId ?? raw.creatorId ?? raw.mentorId,
    creatorId: raw.creatorId ?? raw.submitterId ?? raw.mentorId,
    coordinatorId: raw.coordinatorId ?? raw.targetCoordinatorId,
    targetCoordinatorId: raw.targetCoordinatorId ?? raw.coordinatorId,
    consultantId: raw.consultantId ?? raw.targetConsultantId,
    targetConsultantId: raw.targetConsultantId ?? raw.consultantId,
    createTime: raw.createTime ?? raw.createdAt,
    createdAt: raw.createdAt ?? raw.createTime,
  }
}

function asArray(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[]

  const obj = value as AnyRecord | null | undefined
  if (!obj || typeof obj !== 'object') return []

  if (Array.isArray(obj.records)) return obj.records
  if (Array.isArray(obj.list)) return obj.list
  if (Array.isArray(obj.content)) return obj.content
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.data)) return obj.data

  return []
}

function getCaseId(item: LocalCaseItem): string {
  return String(item.caseId || item.id || item.specialCaseId || '')
}

function normalizeCaseStatus(status: unknown): NormalizedCaseStatus {
  const value = String(status || '').trim().toUpperCase()

  if (value === 'AT_COORDINATOR' || value === 'WAITING' || value === 'PENDING') {
    return 'WAITING'
  }

  if (value === 'AT_CONSULTANT' || value === 'FORWARDED') {
    return 'FORWARDED'
  }

  if (value === 'CLOSED') {
    return 'CLOSED'
  }

  if (value === 'REJECTED') {
    return 'REJECTED'
  }

  return 'UNKNOWN'
}

function getStatusLabel(status: unknown): string {
  const normalized = normalizeCaseStatus(status)

  const labels: Record<NormalizedCaseStatus, string> = {
    WAITING: 'Waiting',
    FORWARDED: 'Forwarded',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
    UNKNOWN: 'Unknown',
  }

  return labels[normalized]
}

function statusClass(status: unknown): string {
  return `status-${normalizeCaseStatus(status).toLowerCase()}`
}

function canForward(item: LocalCaseItem): boolean {
  return Boolean(getCaseId(item)) && normalizeCaseStatus(item.status) === 'WAITING'
}

function getConsultantName(consultant: AdminAccount): string {
  const name = consultant.realName || consultant.username || consultant.email || consultant.id

  if (consultant.email) {
    return `${name} (${consultant.email})`
  }

  return `${name} (${consultant.id})`
}

function getSelectedConsultantId(caseId: string): string {
  return String(
    selectedConsultants.value[caseId] ||
      manualConsultants.value[caseId] ||
      '',
  ).trim()
}

function formatTime(value?: string | null): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString()
}

function buildCaseErrorMessage(error: any): string {
  const message = String(error?.message || error || 'Unknown error')

  if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
    return 'Session expired or unauthorized. Please login again.'
  }

  if (message.includes('403') || message.toLowerCase().includes('permission')) {
    return 'Authorization warning: You do not have permission to view coordinator cases.'
  }

  if (message.includes('404')) {
    return 'Coordinator cases endpoint was not found. Please check backend route /api/mentoring/cases/coordinator.'
  }

  return `Failed to load coordinator cases: ${message}`
}

async function forwardCase(caseId: string, targetConsultantId: string): Promise<void> {
  const res = await put<unknown>(
    `/api/mentoring/cases/${encodeURIComponent(caseId)}/forward`,
    {
      targetConsultantId,
    },
  )

  unwrap(res)
}

async function rejectCase(caseId: string): Promise<void> {
  const endpoints = [
    `/api/mentoring/cases/${encodeURIComponent(caseId)}/reject`,
    `/api/mentoring/cases/${encodeURIComponent(caseId)}`,
  ]

  let lastError: unknown = null

  for (const endpoint of endpoints) {
    try {
      if (endpoint.endsWith('/reject')) {
        const res = await put<unknown>(endpoint, {})
        unwrap(res)
      } else {
        const res = await del<unknown>(endpoint)
        unwrap(res)
      }

      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to reject case.')
}

async function handleForward(item: LocalCaseItem): Promise<void> {
  const caseId = getCaseId(item)
  const targetConsultantId = getSelectedConsultantId(caseId)

  caseMessage.value = ''
  isCaseError.value = false

  if (!caseId) {
    caseMessage.value = 'Warning: Case ID is missing.'
    isCaseError.value = true
    return
  }

  if (!targetConsultantId) {
    caseMessage.value = 'Warning: Please select a Faculty Consultant or enter a consultant ID.'
    isCaseError.value = true
    return
  }

  isSubmitting.value = true

  try {
    await forwardCase(caseId, targetConsultantId)

    selectedConsultants.value[caseId] = ''
    manualConsultants.value[caseId] = ''

    await loadPageData()

    caseMessage.value = 'Case forwarded successfully.'
    isCaseError.value = false
  } catch (error: any) {
    isCaseError.value = true
    caseMessage.value = `Failed to forward case: ${error?.message || 'Unknown error'}`
  } finally {
    isSubmitting.value = false
  }
}

async function handleReject(item: LocalCaseItem): Promise<void> {
  const caseId = getCaseId(item)

  caseMessage.value = ''
  isCaseError.value = false

  if (!caseId) {
    caseMessage.value = 'Warning: Case ID is missing.'
    isCaseError.value = true
    return
  }

  isSubmitting.value = true

  try {
    await rejectCase(caseId)

    await loadPageData()

    caseMessage.value = 'Case rejected successfully.'
    isCaseError.value = false
  } catch (error: any) {
    isCaseError.value = true
    caseMessage.value = `Failed to reject case: ${error?.message || 'Unknown error'}`
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #1f2937;
}

.page-header p {
  margin: 8px 0 0;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.summary-card span {
  display: block;
  color: #6b7280;
  font-size: 14px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  color: #111827;
}

.content-card {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
}

.case-list {
  display: grid;
  gap: 16px;
}

.case-card {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
}

.case-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.case-top h2 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.meta {
  margin: 6px 0 0;
  color: #6b7280;
}

.description {
  margin: 16px 0;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.case-info {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 16px;
}

.case-info div {
  padding: 12px;
  border-radius: 10px;
  background: #ffffff;
}

.case-info dt {
  font-size: 12px;
  color: #6b7280;
}

.case-info dd {
  margin: 4px 0 0;
  color: #111827;
  word-break: break-word;
}

.forward-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: end;
}

.forward-row label {
  display: block;
  color: #374151;
  font-weight: 600;
}

.forward-row select,
.forward-row input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: #ffffff;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.secondary-btn {
  background: #e5e7eb;
  color: #111827;
}

.danger-btn {
  background: #fee2e2;
  color: #b91c1c;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.danger-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.message {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #047857;
}

.message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.empty-state {
  padding: 36px 16px;
  text-align: center;
  color: #6b7280;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  background: #e5e7eb;
  color: #374151;
  white-space: nowrap;
}

.status-waiting {
  background: #fef3c7;
  color: #92400e;
}

.status-forwarded {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-closed {
  background: #dcfce7;
  color: #166534;
}

.status-rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.status-unknown {
  background: #e5e7eb;
  color: #374151;
}

@media (max-width: 980px) {
  .summary-grid,
  .case-info {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forward-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .summary-grid,
  .case-info {
    grid-template-columns: 1fr;
  }
}
</style>
