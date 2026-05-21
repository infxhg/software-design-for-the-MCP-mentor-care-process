<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Forward Special Case</h1>
        <p class="desc">Forward a student special case to an MCP Coordinator.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Student</label>
        <select v-model="form.studentId">
          <option value="">-- Select Student --</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name }} ({{ student.id }})
          </option>
        </select>
      </div>

      <div class="form-item">
        <label>MCP Coordinator</label>
        <select v-if="coordinators.length > 0" v-model="form.forwardToId">
          <option value="">-- Select Coordinator --</option>
          <option v-for="user in coordinators" :key="user.id" :value="user.id">
            {{ user.name }}{{ user.email ? ` (${user.email})` : '' }}
          </option>
        </select>
        <input
          v-else
          v-model.trim="form.forwardToId"
          placeholder="Enter Coordinator ID or email"
        />
        <p v-if="coordinators.length === 0" class="hint">
          Receiver-list API is not available yet, so this page allows manual coordinator ID input.
        </p>
      </div>

      <div class="form-item">
        <label>Case Description</label>
        <textarea
          v-model.trim="form.caseDescription"
          rows="6"
          maxlength="1000"
          placeholder="Describe the case..."
        />
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <div class="actions">
        <button :disabled="submitting" @click="submitCase">
          {{ submitting ? 'Submitting...' : 'Forward Case' }}
        </button>
        <button class="secondary" :disabled="submitting" @click="resetForm">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const students = ref<{ id: string; name: string; raw?: any }[]>([])
const coordinators = ref<{ id: string; name: string; email?: string; raw?: any }[]>([])

const form = reactive({
  studentId: '',
  forwardToId: '',
  caseDescription: '',
})

const submitting = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(async () => {
  await Promise.all([loadStudents(), loadCoordinators()])
})

async function loadStudents() {
  try {
    const mentoringApi: any = await import('../../api/mentoring')
    const orgApi: any = await import('../../api/org')

    const fn =
      mentoringApi.getMentorStudents ||
      mentoringApi.getMyStudents ||
      mentoringApi.getMyGroupStudents ||
      orgApi.getAllStudents ||
      orgApi.searchAllStudents

    if (!fn) return

    const data = fn === orgApi.searchAllStudents ? await fn('') : await fn()
    students.value = normalizeUsers(data, 'student')
  } catch {
    students.value = []
  }
}

async function loadCoordinators() {
  try {
    const communicationApi: any = await import('../../api/communication')
    const fn =
      communicationApi.getAvailableReceivers ||
      communicationApi.listAvailableReceivers

    if (!fn) return

    const data = await fn('case')
    coordinators.value = normalizeUsers(data, 'coordinator')
  } catch {
    coordinators.value = []
  }
}

async function submitCase() {
  clearMessage()

  if (!form.studentId) {
    showError('Please select a student.')
    return
  }

  if (!form.forwardToId) {
    showError('Please select or enter a coordinator.')
    return
  }

  if (!form.caseDescription) {
    showError('Please enter case description.')
    return
  }

  submitting.value = true

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.forwardCaseToCoordinator ||
      mentoringApi.forwardCaseToCoordinator ||
      mentoringApi.createSpecialCase ||
      mentoringApi.createCase

    if (!fn) {
      throw new Error('Special case API is not available.')
    }

    await fn({
      studentId: form.studentId,
      forwardToId: form.forwardToId,
      coordinatorId: form.forwardToId,
      caseDescription: form.caseDescription,
      description: form.caseDescription,
    })

    showSuccess('Case forwarded successfully.')
    resetForm(false)
  } catch (err: any) {
    showError(err.message || 'Failed to forward case.')
  } finally {
    submitting.value = false
  }
}

function normalizeUsers(data: any, type: 'student' | 'coordinator') {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list
    .map((item: any) => {
      const id = String(
        item.id ??
          item.userId ??
          item.studentId ??
          item.coordinatorId ??
          item.email ??
          '',
      )
      return {
        id,
        name:
          item.name ??
          item.studentName ??
          item.coordinatorName ??
          item.username ??
          id,
        email: item.email,
        raw: item,
      }
    })
    .filter((item: any) => item.id)
}

function resetForm(clearMsg = true) {
  form.studentId = ''
  form.forwardToId = ''
  form.caseDescription = ''
  if (clearMsg) clearMessage()
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
.form {
  margin-top: 22px;
  max-width: 780px;
}
.form-item {
  margin-top: 16px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
input,
select,
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.hint {
  color: #6b7280;
  font-size: 13px;
  margin-top: 6px;
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
