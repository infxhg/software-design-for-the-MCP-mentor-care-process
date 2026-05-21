<template>
  <section class="page">
    <h1>Export Records</h1>

    <div class="card">
      <h2>Export by Student</h2>
      <input v-model.trim="studentId" placeholder="Student ID" />
      <button class="primary" :disabled="!studentId || loading" @click="exportStudent">
        Export Student Records
      </button>
    </div>

    <div class="card">
      <h2>Export by Group</h2>
      <input v-model.trim="groupId" placeholder="Group ID" />
      <button class="primary" :disabled="!groupId || loading" @click="exportGroup">
        Export Group Records
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { downloadExportedFile, exportGroupRecords, exportStudentRecords } from '../../api/mentoring'

const studentId = ref('')
const groupId = ref('')
const loading = ref(false)
const error = ref('')

async function exportStudent() {
  loading.value = true
  error.value = ''
  try {
    const blob = await exportStudentRecords(studentId.value)
    downloadExportedFile(blob, `student-${studentId.value}-records.docx`)
  } catch (e: any) {
    error.value = e.message || 'Export failed.'
  } finally {
    loading.value = false
  }
}

async function exportGroup() {
  loading.value = true
  error.value = ''
  try {
    const blob = await exportGroupRecords(groupId.value)
    downloadExportedFile(blob, `group-${groupId.value}-records.docx`)
  } catch (e: any) {
    error.value = e.message || 'Export failed.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 760px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { width: fit-content; padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
</style>
