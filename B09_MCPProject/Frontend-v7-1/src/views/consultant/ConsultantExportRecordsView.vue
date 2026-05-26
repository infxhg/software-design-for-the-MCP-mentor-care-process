<template>
  <section class="page">
    <h1>Export Interview Records</h1>
    <p class="muted">Export Word files by student, group, or filter.</p>

    <div class="card">
      <h2>Quick Export (same format as Mentor)</h2>
      <label>
        Student ID
        <input v-model.trim="studentId" placeholder="9-digit student ID" />
      </label>
      <button class="primary" :disabled="loadingStudent || !studentId" @click="exportByStudent">
        {{ loadingStudent ? 'Exporting...' : 'Export Student Word' }}
      </button>

      <label class="mt">
        Group ID
        <input v-model.trim="groupId" placeholder="e.g. 2024-2025-Y1" />
      </label>
      <button class="primary" :disabled="loadingGroup || !groupId" @click="exportByGroup">
        {{ loadingGroup ? 'Exporting...' : 'Export Group Word' }}
      </button>
    </div>

    <form class="card" @submit.prevent="exportFile">
      <h2>Filter Export</h2>
      <label>Student ID <input v-model.trim="filter.studentId" /></label>
      <label>Student Keyword <input v-model.trim="filter.studentKeyword" placeholder="ID / name / email" /></label>
      <label>Mentor Keyword <input v-model.trim="filter.mentorKeyword" placeholder="name / username" /></label>
      <label>Academic Year From <input v-model.trim="filter.academicYearFrom" placeholder="2024" /></label>
      <label>Academic Year To <input v-model.trim="filter.academicYearTo" placeholder="2025" /></label>
      <label>Date From <input v-model.trim="filter.dateFrom" type="date" /></label>
      <label>Date To <input v-model.trim="filter.dateTo" type="date" /></label>
      <label>Faculty <input v-model.trim="filter.faculty" /></label>
      <label>Department <input v-model.trim="filter.department" /></label>
      <label>Major <input v-model.trim="filter.major" /></label>

      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="loading">{{ loading ? 'Exporting...' : 'Export Filtered Word' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  downloadExportedFile,
  exportConsultantRecords,
  exportGroupRecords,
  exportStudentRecords,
} from '../../api/mentoring'

const loading = ref(false)
const loadingStudent = ref(false)
const loadingGroup = ref(false)
const error = ref('')
const studentId = ref('')
const groupId = ref('')

const filter = reactive({
  studentId: '',
  studentKeyword: '',
  mentorKeyword: '',
  academicYearFrom: '',
  academicYearTo: '',
  dateFrom: '',
  dateTo: '',
  faculty: '',
  department: '',
  major: '',
})

async function exportByStudent() {
  loadingStudent.value = true
  error.value = ''
  try {
    const blob = await exportStudentRecords(studentId.value.trim())
    downloadExportedFile(blob, `student-records-${studentId.value.trim()}.docx`)
  } catch (e: any) {
    error.value = e.message || 'Student export failed.'
  } finally {
    loadingStudent.value = false
  }
}

async function exportByGroup() {
  loadingGroup.value = true
  error.value = ''
  try {
    const blob = await exportGroupRecords(groupId.value.trim())
    downloadExportedFile(blob, `group-records-${groupId.value.trim()}.docx`)
  } catch (e: any) {
    error.value = e.message || 'Group export failed.'
  } finally {
    loadingGroup.value = false
  }
}

async function exportFile() {
  loading.value = true
  error.value = ''
  try {
    const blob = await exportConsultantRecords(filter)
    downloadExportedFile(blob, `consultant-records-${Date.now()}.docx`)
  } catch (e: any) {
    error.value = e.message || 'Export failed.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 24px; }
.card { display: grid; gap: 14px; margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.card h2 { margin: 0; font-size: 18px; }
label { display: grid; gap: 6px; font-weight: 600; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { width: fit-content; padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
.muted { color: #666; }
.mt { margin-top: 8px; }
</style>
