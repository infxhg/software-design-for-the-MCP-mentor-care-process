<template>
  <div class="page-card">
    <div v-if="isLoading" class="loading">Loading student info...</div>

    <div v-else-if="student">
      <div class="header">
        <div>
          <h1>Edit Interview Record</h1>
          <p class="desc">Only Mentor can add, modify, delete, save, or cancel interview records.</p>
        </div>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div v-if="!canEdit" class="warning-box">
        Authorization warning: You are not allowed to edit this interview record.
      </div>

      <div v-else>
        <div class="student-info">
          <p><strong>Student ID:</strong> {{ student.username || studentId }}</p>
          <p><strong>Name:</strong> {{ student.realName || student.username }}</p>
          <p><strong>Email:</strong> {{ student.email || 'N/A' }}</p>
        </div>

        <button @click="addRecord">Add Record</button>

        <div v-if="records.length === 0" class="empty">
          No interview records. Click Add Record to create one.
        </div>

        <div v-for="(record, index) in records" :key="record.recordId || index" class="record-form">
          <h3>Record {{ index + 1 }}</h3>

          <div class="form-grid">
            <div>
              <label>Date</label>
              <input v-model="record.interviewDate" type="date" />
            </div>
            <div>
              <label>Time</label>
              <input v-model="record.interviewTime" type="time" />
            </div>
          </div>

          <div class="form-item">
            <label>Problem Statement</label>
            <textarea v-model="record.problemStatement" maxlength="200" placeholder="Maximum 200 characters"></textarea>
            <small>{{ (record.problemStatement || '').length }}/200</small>
          </div>

          <div class="form-item">
            <label>Interview Summary</label>
            <textarea v-model="record.interviewSummary" maxlength="300" placeholder="Maximum 300 characters"></textarea>
            <small>{{ (record.interviewSummary || '').length }}/300</small>
          </div>

          <div class="form-item">
            <label>Follow-up Action</label>
            <textarea v-model="record.followupAction" maxlength="200" placeholder="Maximum 200 characters"></textarea>
            <small>{{ (record.followupAction || '').length }}/200</small>
          </div>

          <button class="danger" @click="deleteRecord(index)">Delete</button>
        </div>

        <div class="actions">
          <button @click="saveRecords">Save</button>
          <button class="secondary" @click="cancelEdit">Cancel</button>
        </div>

        <p v-if="message" class="message" :class="{ error: isMsgError }">
          {{ message }}
        </p>
      </div>
    </div>

    <div v-else>
      <h1>Student Not Found</h1>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get } from '../api/request'
import { getRecordsByStudent, saveRecord } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'

const route = useRoute()
const router = useRouter()
const studentId = route.params.studentId as string

const student = ref<any>(null)
const records = ref<McpRecord[]>([])
const originalRecords = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')
const message = ref('')
const isMsgError = ref(false)

const canEdit = computed(() => getRole() === 'mentor')

onMounted(async () => {
  try {
    // Try to load by username first, then by user ID
    let userRes = await get(`/user/userInfo?username=${encodeURIComponent(studentId)}`)
    if (userRes.code !== 200 || !userRes.data) {
      // studentId might be a UUID, try internal lookup
      errorMsg.value = 'Student not found.'
      isLoading.value = false
      return
    }

    const userInfo = userRes.data
    student.value = userInfo.user || userInfo

    // Fetch existing records
    const userId = student.value.id
    if (userId) {
      try {
        const fetched = await getRecordsByStudent(userId)
        records.value = fetched.map((r) => ({ ...r }))
        originalRecords.value = fetched.map((r) => ({ ...r }))
      } catch { /* no records or no permission */ }
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load student.'
  } finally {
    isLoading.value = false
  }
})

function addRecord() {
  records.value.push({
    recordId: undefined,
    studentId: student.value?.id || studentId,
    interviewDate: '',
    interviewTime: '',
    problemStatement: '',
    interviewSummary: '',
    followupAction: '',
  })
}

function deleteRecord(index: number) {
  records.value.splice(index, 1)
}

function validateRecords(): boolean {
  for (const r of records.value) {
    if (!r.interviewDate || !r.problemStatement?.trim() || !r.interviewSummary?.trim() || !r.followupAction?.trim()) {
      message.value = 'Validation warning: Required fields cannot be empty.'
      isMsgError.value = true
      return false
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.interviewDate)) {
      message.value = 'Validation warning: Invalid date format.'
      isMsgError.value = true
      return false
    }
    if (r.problemStatement.length > 200) {
      message.value = 'Length limit warning: Problem statement is too long.'
      isMsgError.value = true
      return false
    }
    if (r.interviewSummary.length > 300) {
      message.value = 'Length limit warning: Interview summary is too long.'
      isMsgError.value = true
      return false
    }
    if (r.followupAction.length > 200) {
      message.value = 'Length limit warning: Follow-up action is too long.'
      isMsgError.value = true
      return false
    }
  }
  return true
}

async function saveRecords() {
  message.value = ''
  isMsgError.value = false

  if (!validateRecords()) return

  try {
    for (const r of records.value) {
      r.studentId = student.value?.id || studentId
      await saveRecord(r)
    }
    message.value = 'Interview records saved successfully.'
    isMsgError.value = false
    originalRecords.value = records.value.map((r) => ({ ...r }))
  } catch (err: any) {
    message.value = 'Save failed: ' + (err.message || 'Unknown error')
    isMsgError.value = true
  }
}

function cancelEdit() {
  records.value = originalRecords.value.map((r) => ({ ...r }))
  message.value = 'Unsaved changes have been discarded.'
  isMsgError.value = false
}

function goBack() {
  router.push('/search-student')
}
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.student-info { margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; }
.record-form { margin-top: 20px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 10px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.form-item { margin-top: 14px; }
label { display: block; margin-bottom: 6px; font-weight: 600; }
input, textarea {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
textarea { min-height: 80px; }
small { color: #6b7280; }
button { margin-top: 14px; margin-right: 10px; }
.actions { margin-top: 24px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.empty { margin-top: 20px; color: #6b7280; }
.warning-box { margin-top: 20px; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; }
.loading { color: #6b7280; padding: 40px; text-align: center; }
</style>
