<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Export Records</h1>
        <p class="desc">
          Export interview records by academic year, department/major, mentor, or student.
          Different majors are written to separate files.
        </p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Academic Year(s)</label>
        <div class="checkbox-group">
          <label
              v-for="year in availableYears"
              :key="year"
              class="check-label"
          >
            <input type="checkbox" :value="year" v-model="academicYears" />
            <span>{{ year }}</span>
          </label>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-item">
          <label>Department</label>
          <select v-model="department">
            <option value="">-- Any --</option>
            <option v-for="d in departmentOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="form-item">
          <label>Major</label>
          <select v-model="major">
            <option value="">-- Any --</option>
            <option v-for="m in majorOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <div class="form-item">
          <label>Mentor Name</label>
          <input
              v-model="mentorName"
              type="text"
              placeholder="e.g. Mary Lee (optional)"
          />
        </div>

        <div class="form-item">
          <label>Student Name</label>
          <input
              v-model="studentName"
              type="text"
              placeholder="e.g. Bnbuer (optional)"
          />
        </div>
      </div>

      <div class="buttons">
        <button :disabled="isLoading" @click="doExport">
          {{ isLoading ? 'Exporting...' : 'Export to Word' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { exportRecordsByFilter } from '../../api/consultant'

const router = useRouter()

const availableYears = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']

const academicYears = ref<string[]>([])
const department = ref('')
const major = ref('')
const mentorName = ref('')
const studentName = ref('')

const departmentOptions = ['DCS', 'DS', 'AI', 'DM']
const majorOptions = ['CST', 'AI', 'DS', 'EE']

const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

async function doExport() {
  message.value = ''
  isError.value = false

  if (academicYears.value.length === 0) {
    message.value = 'Warning: Please choose at least one academic year.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    const blob = await exportRecordsByFilter({
      academicYears: academicYears.value,
      department: department.value || undefined,
      major: major.value || undefined,
      mentorName: mentorName.value.trim() || undefined,
      studentName: studentName.value.trim() || undefined,
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mcs-records-${Date.now()}.docx`
    a.click()
    URL.revokeObjectURL(url)

    message.value = 'Export completed. Your file is being downloaded.'
  } catch (err: any) {
    message.value = err.message || 'Export failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 760px; margin-top: 22px; }

.form-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }

input, select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-family: inherit;
}

.checkbox-group { display: flex; flex-wrap: wrap; gap: 14px; }
.check-label { font-weight: normal; cursor: pointer; }
.check-label input { margin-right: 4px; }

.buttons { margin-top: 22px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
