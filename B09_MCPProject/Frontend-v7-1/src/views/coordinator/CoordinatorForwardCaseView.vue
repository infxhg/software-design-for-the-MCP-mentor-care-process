<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Forward Cases</h1>
        <p class="desc">Review cases forwarded by mentors and forward them to faculty consultants.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <section class="section">
      <h2>Received Cases (From Mentors)</h2>

      <div v-if="isLoading" class="loading">Loading...</div>

      <div v-else-if="cases.length === 0" class="empty">
        No forwarded cases at the moment.
      </div>

      <div v-else>
        <div
            v-for="c in cases"
            :key="c.caseId"
            class="case-card"
            :class="{ selected: selectedCaseId === c.caseId }"
            @click="selectCase(c.caseId)"
        >
          <p>
            <strong>Case:</strong> {{ truncate(c.description, 60) }}
            <span class="badge">{{ c.studentName }} ({{ c.studentId }})</span>
          </p>
          <p class="meta">From: {{ c.fromMentorName }} | Status: {{ c.status }}</p>
        </div>
      </div>
    </section>

    <section v-if="selectedCase" class="section">
      <h2>Case Details</h2>
      <div class="detail-box">
        <p><strong>From Mentor:</strong> {{ selectedCase.fromMentorName }}</p>
        <p><strong>Student:</strong> {{ selectedCase.studentName }} ({{ selectedCase.studentId }})</p>
        <p><strong>Description:</strong></p>
        <p class="description-text">{{ selectedCase.description }}</p>
      </div>

      <div class="form-item">
        <label>Forward To (Faculty Consultant)</label>
        <select v-model="consultantId">
          <option value="">-- Select Faculty Consultant --</option>
          <option
              v-for="c in consultantList"
              :key="c.id"
              :value="c.id"
          >
            {{ c.name }} ({{ c.faculty }})
          </option>
        </select>
      </div>

      <div class="buttons">
        <button :disabled="isForwarding" @click="forward">
          {{ isForwarding ? 'Forwarding...' : 'Forward' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listForwardedCasesForCoordinator,
  forwardCaseToConsultant,
} from '../../api/communication'

const router = useRouter()

const cases = ref<Array<{
  caseId: string
  fromMentorName: string
  studentId: string
  studentName: string
  description: string
  status: string
}>>([])

const isLoading = ref(true)
const selectedCaseId = ref('')
const consultantId = ref('')
const message = ref('')
const isError = ref(false)
const isForwarding = ref(false)

const consultantList = ref([
  { id: 'C001', name: 'Prof. Amy', faculty: 'FST' },
  { id: 'C002', name: 'Prof. John', faculty: 'DCC' },
])

const selectedCase = computed(() =>
    cases.value.find((c) => c.caseId === selectedCaseId.value),
)

onMounted(async () => {
  try {
    cases.value = await listForwardedCasesForCoordinator()
  } catch (err: any) {
    message.value = 'Failed to load cases: ' + (err.message || 'Unknown error')
    isError.value = true
  } finally {
    isLoading.value = false
  }
})

function selectCase(caseId: string) {
  selectedCaseId.value = caseId
  message.value = ''
  isError.value = false
}

function truncate(text: string, n: number): string {
  return text.length > n ? text.substring(0, n) + '...' : text
}

async function forward() {
  message.value = ''
  isError.value = false

  if (!consultantId.value) {
    message.value = 'Warning: Please select a faculty consultant.'
    isError.value = true
    return
  }

  isForwarding.value = true
  try {
    await forwardCaseToConsultant({
      caseId: selectedCaseId.value,
      consultantId: consultantId.value,
    })
    message.value = 'Case forwarded successfully. Email notification has been sent.'

    // Update local cases status
    const c = cases.value.find((c) => c.caseId === selectedCaseId.value)
    if (c) c.status = 'forwarded_to_consultant'

    // Clear selection so we don't immediately allow another forward
    selectedCaseId.value = ''
    consultantId.value = ''
  } catch (err: any) {
    message.value = err.message || 'Failed to forward case.'
    isError.value = true
  } finally {
    isForwarding.value = false
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.section { margin-top: 26px; padding-top: 18px; border-top: 1px solid #e5e7eb; }
.section h2 { font-size: 18px; margin-bottom: 14px; }

.case-card {
  padding: 14px; margin-bottom: 10px;
  border: 1px solid #e5e7eb; border-radius: 8px;
  background: white; cursor: pointer;
}
.case-card:hover { background: #f9fafb; }
.case-card.selected { border-color: #2563eb; background: #eff6ff; }

.badge {
  display: inline-block; padding: 2px 8px;
  background: #fef3c7; color: #92400e;
  border-radius: 999px; font-size: 12px; margin-left: 8px;
}
.meta { color: #6b7280; font-size: 13px; }

.detail-box {
  padding: 16px; background: #f9fafb; border-radius: 8px;
}
.description-text {
  margin-top: 8px; padding: 10px;
  background: white; border-radius: 6px; border: 1px solid #e5e7eb;
}

.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px; max-width: 400px;
}

.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.loading, .empty { color: #6b7280; padding: 16px 0; }
</style>
