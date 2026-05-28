<template>
  <section class="page-card">
    <div class="header">
      <div>
        <h1>Forward Special Case</h1>
        <p class="desc">
          Submit a student special case to the MCP Coordinator. The system records the case;
          email integration is not required for the B09 front-end test.
        </p>
      </div>
      <button class="refresh-btn" type="button" @click="loadCases">Refresh Cases</button>
    </div>

    <form class="card" @submit.prevent="submit">
      <div class="form-grid">
        <label>
          Student ID <span class="required">*</span>
          <input
            v-model.trim="form.studentId"
            placeholder="9-digit Student ID, e.g. 330026143"
            @blur="checkStudent"
          />
        </label>

        <label>
          Target Coordinator ID <span class="required">*</span>
          <input
            v-model.trim="form.targetCoordinatorId"
            placeholder="e.g. test_coord_01"
          />
        </label>
      </div>

      <div v-if="studentInfo" class="student-box">
        <strong>Selected Student:</strong>
        {{ studentInfo.studentId || studentInfo.id || form.studentId }}
        ·         {{ studentInfo.realName || studentInfo.name || studentInfo.studentName || studentInfo.username || 'N/A' }}
      </div>

      <label>
        Case Description <span class="required">*</span>
        <textarea
          v-model.trim="form.description"
          rows="6"
          maxlength="1000"
          placeholder="Describe why MCP Coordinator intervention is needed."
        />
        <small>{{ form.description.length }}/1000</small>
      </label>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

      <div class="actions">
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? 'Submitting...' : 'Submit Case' }}
        </button>
      </div>
    </form>

    <section class="card">
      <div class="bar">
        <h2>My Submitted Cases</h2>
        <button class="refresh-btn" type="button" :disabled="loadingCases" @click="loadCases">
          {{ loadingCases ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Student ID</th>
            <th>Coordinator</th>
            <th>Status</th>
            <th>Description</th>
            <th>Create Time</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="c in cases" :key="c.caseId || c.id">
            <td>{{ c.caseId || c.id }}</td>
            <td>{{ c.studentId || '-' }}</td>
            <td>{{ c.coordinatorId || c.targetCoordinatorId || '-' }}</td>
            <td>{{ c.status || '-' }}</td>
            <td>{{ c.description || '-' }}</td>
            <td>{{ formatDateTime(c.createTime) }}</td>
          </tr>

          <tr v-if="cases.length === 0">
            <td colspan="6" class="empty">No cases.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createSpecialCase,
  listMySubmittedCases,
  lookupStudent,
  getStrictStudentIdValidationMessage,
  type CaseItem,
} from '../../api/mentoring'
import type { StudentFromApi } from '../../api/org'

const form = reactive({
  studentId: '',
  targetCoordinatorId: '',
  description: '',
})

const cases = ref<CaseItem[]>([])
const studentInfo = ref<StudentFromApi | null>(null)

const saving = ref(false)
const checkingStudent = ref(false)
const loadingCases = ref(false)

const message = ref('')
const isError = ref(false)

onMounted(loadCases)

function validateForm(): string {
  const studentIdError = getStrictStudentIdValidationMessage(form.studentId)
  if (studentIdError) return studentIdError
  if (!form.targetCoordinatorId) return 'Target Coordinator ID is required.'
  if (!form.description.trim()) return 'Case description is required.'
  if (form.description.trim().length > 1000) return 'Case description cannot exceed 1000 characters.'
  return ''
}

async function checkStudent(): Promise<boolean> {
  studentInfo.value = null
  const sid = form.studentId.trim()
  const studentIdError = getStrictStudentIdValidationMessage(sid)
  if (studentIdError) {
    showError(studentIdError)
    return false
  }

  checkingStudent.value = true
  clearMessage()

  try {
    const result = await lookupStudent(sid)
    if (!result) {
      showError('Student not found or not in your mentoring groups.')
      return false
    }
    studentInfo.value = result
    return true
  } catch (err: any) {
    showError(toFriendlyError(err, 'Failed to check student.'))
    return false
  } finally {
    checkingStudent.value = false
  }
}

async function loadCases() {
  loadingCases.value = true
  clearMessage()

  try {
    cases.value = await listMySubmittedCases()
  } catch (err: any) {
    showError(toFriendlyError(err, 'Failed to load cases.'))
  } finally {
    loadingCases.value = false
  }
}

async function submit() {
  const validation = validateForm()
  if (validation) {
    showError(validation)
    return
  }

  saving.value = true
  clearMessage()

  try {
    const checked = await checkStudent()
    if (!checked) return

    await createSpecialCase({
      studentId: form.studentId.trim(),
      targetCoordinatorId: form.targetCoordinatorId.trim(),
      description: form.description.trim(),
    })

    form.studentId = ''
    form.targetCoordinatorId = ''
    form.description = ''
    studentInfo.value = null

    await loadCases()
    message.value = 'Case submitted successfully.'
    isError.value = false
  } catch (err: any) {
    showError(toFriendlyError(err, 'Submit failed.'))
  } finally {
    saving.value = false
  }
}

function formatDateTime(value: unknown): string {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Authorization warning: you are not allowed to submit or view this case.'
  }
  return text || fallback
}

function clearMessage() {
  message.value = ''
  isError.value = false
}

function showError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header,
.actions,
.bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header,
.bar {
  justify-content: space-between;
}

.desc,
.empty,
small {
  color: #6b7280;
}

.card {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
textarea {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-sizing: border-box;
}

textarea {
  resize: vertical;
}

button {
  width: fit-content;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.refresh-btn {
  min-width: 88px;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #111827;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.refresh-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.student-box {
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
}

.message {
  color: #047857;
}

.error,
.required {
  color: #b42318;
}

@media (max-width: 760px) {
  .header,
  .actions,
  .bar {
    align-items: stretch;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
