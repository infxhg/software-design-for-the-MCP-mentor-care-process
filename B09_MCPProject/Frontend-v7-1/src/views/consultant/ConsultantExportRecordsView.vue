<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Export Records</h1>
        <p class="desc">Export interview records by filter.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-grid">
        <div class="form-item">
          <label>Academic Year</label>
          <input v-model.trim="filter.academicYear" placeholder="e.g. 2025-2026" />
        </div>

        <div class="form-item">
          <label>Department</label>
          <input v-model.trim="filter.department" placeholder="e.g. DCS" />
        </div>

        <div class="form-item">
          <label>Major</label>
          <input v-model.trim="filter.major" placeholder="e.g. CST" />
        </div>

        <div class="form-item">
          <label>Mentor Name</label>
          <input v-model.trim="filter.mentorName" placeholder="Optional" />
        </div>

        <div class="form-item">
          <label>Student Name</label>
          <input v-model.trim="filter.studentName" placeholder="Optional" />
        </div>

        <div class="form-item">
          <label>Student ID</label>
          <input v-model.trim="filter.studentId" placeholder="Optional" />
        </div>

        <div class="form-item">
          <label>Group ID</label>
          <input v-model.trim="filter.groupId" placeholder="Optional" />
        </div>
      </div>

      <p class="hint">
        If Student ID or Group ID is filled, the page will try the specific export endpoint first.
      </p>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <div class="actions">
        <button :disabled="exporting" @click="exportRecords">
          {{ exporting ? 'Exporting...' : 'Export Word' }}
        </button>
        <button class="secondary" :disabled="exporting" @click="reset">
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const filter = reactive({
  academicYear: '',
  department: '',
  major: '',
  mentorName: '',
  studentName: '',
  studentId: '',
  groupId: '',
})

const exporting = ref(false)
const message = ref('')
const isError = ref(false)

async function exportRecords() {
  exporting.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    const mentoringApi: any = await import('../../api/mentoring')

    let blob: Blob | null = null

    if (filter.studentId && mentoringApi.exportStudentRecords) {
      blob = await mentoringApi.exportStudentRecords(filter.studentId)
    } else if (filter.studentId && consultantApi.exportStudentRecords) {
      blob = await consultantApi.exportStudentRecords(filter.studentId)
    } else if (filter.groupId && mentoringApi.exportGroupRecords) {
      blob = await mentoringApi.exportGroupRecords(filter.groupId)
    } else if (filter.groupId && consultantApi.exportGroupRecords) {
      blob = await consultantApi.exportGroupRecords(filter.groupId)
    } else if (consultantApi.exportRecordsByFilter) {
      blob = await consultantApi.exportRecordsByFilter({
        academicYear: filter.academicYear || undefined,
        academicYears: filter.academicYear ? [filter.academicYear] : [],
        department: filter.department || undefined,
        major: filter.major || undefined,
        mentorName: filter.mentorName || undefined,
        studentName: filter.studentName || undefined,
      })
    } else {
      throw new Error('Export API is not available.')
    }

    if (!(blob instanceof Blob)) {
      blob = new Blob([blob as any], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    }

    downloadBlob(blob, `mcs-records-${Date.now()}.docx`)
    showSuccess('Export started.')
  } catch (err: any) {
    showError(err.message || 'Failed to export records.')
  } finally {
    exporting.value = false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function reset() {
  Object.assign(filter, {
    academicYear: '',
    department: '',
    major: '',
    mentorName: '',
    studentName: '',
    studentId: '',
    groupId: '',
  })
  clearMessage()
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
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: 16px;
  max-width: 900px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
input {
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
.hint,
.message {
  margin-top: 14px;
}
.hint {
  color: #6b7280;
}
.message {
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
