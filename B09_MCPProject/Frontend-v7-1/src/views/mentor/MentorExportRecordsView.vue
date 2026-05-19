<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Export Records</h1>
        <p class="desc">Export interview records of students in your mentoring group.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <section class="section">
      <h2>Select Scope of Export</h2>

      <div class="radio-group">
        <label>
          <input type="radio" value="all" v-model="scope" />
          <span>All students in my group</span>
        </label>
        <label>
          <input type="radio" value="selected" v-model="scope" />
          <span>Chosen student</span>
        </label>
      </div>

      <div v-if="scope === 'selected'" class="student-select">
        <label>Select student</label>
        <select v-model="selectedStudentId">
          <option value="">-- Choose a student --</option>
          <option
              v-for="s in studentList"
              :key="s.studentId"
              :value="s.studentId"
          >
            {{ s.name }} ({{ s.studentId }})
          </option>
        </select>
      </div>
    </section>

    <section class="section">
      <p class="format-info">
        <strong>Export Format:</strong> Microsoft Word (.docx)
      </p>
    </section>

    <div class="buttons">
      <button :disabled="isLoading" @click="exportRecords">
        {{ isLoading ? 'Exporting...' : 'Export' }}
      </button>
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type ExportScope = 'all' | 'selected'

const scope = ref<ExportScope>('all')
const selectedStudentId = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

/**
 * Mock student list — should be replaced with a call to backend that
 * returns the current mentor's students.
 */
const studentList = ref<Array<{ studentId: string; name: string }>>([
  { studentId: '123456789', name: 'Bnbuer' },
  { studentId: '987654321', name: 'Uicer' },
  { studentId: '210000001', name: 'Sugar' },
])

async function exportRecords() {
  message.value = ''
  isError.value = false

  if (scope.value === 'selected' && !selectedStudentId.value) {
    message.value = 'Warning: Please select a student.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    /**
     * 后端接口尚未到位。先模拟生成一个空的 docx blob，
     * 让用户能体验到完整的"点击 → 下载"流程。
     *
     * 真实接口大概长这样：
     *   POST /api/mentor/export-records
     *   body: { scope, studentId? }
     *   response: blob (docx)
     */
    await new Promise((r) => setTimeout(r, 400))

    const filename =
        scope.value === 'all'
            ? 'mentor-records-all.docx'
            : `mentor-records-${selectedStudentId.value}.docx`

    const content = generateMockWordContent()
    const blob = new Blob([content], { type: 'application/msword' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    message.value = 'Export completed. Your file is being downloaded.'
    isError.value = false
  } catch (err: any) {
    message.value = 'Export failed: ' + (err.message || 'Unknown error')
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function generateMockWordContent(): string {
  const scopeLabel =
      scope.value === 'all'
          ? 'All students in my group'
          : `Student ${selectedStudentId.value}`

  return [
    '===== Mentor Interview Record Export =====',
    `Scope: ${scopeLabel}`,
    `Exported at: ${new Date().toLocaleString()}`,
    '',
    '--- Sample Record ---',
    'Student Name: Bnbuer',
    'Interview record: 1/1/2026',
    'Problem statements: Study difficulty.',
    'Interview summary: Give student advice on study method.',
    'Follow-up actions: Fix the next interview time.',
  ].join('\n')
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.section { margin-top: 24px; }
.section h2 { font-size: 17px; margin-bottom: 14px; }

.radio-group { display: flex; flex-direction: column; gap: 10px; }
.radio-group label { font-weight: normal; cursor: pointer; }
.radio-group input { margin-right: 6px; }

.student-select { margin-top: 18px; max-width: 360px; }
.student-select label { display: block; font-weight: 600; margin-bottom: 6px; }
select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

.format-info { color: #6b7280; }

.buttons { margin-top: 24px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
