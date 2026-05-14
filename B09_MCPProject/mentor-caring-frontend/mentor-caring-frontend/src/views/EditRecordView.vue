<template>
  <div class="page-card">
    <div v-if="student">
      <div class="header">
        <div>
          <h1>Edit Interview Record</h1>
          <p class="desc">Only Mentor can add, modify, delete, save, or cancel interview records.</p>
        </div>

        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div v-if="!canEdit" class="warning">
        Authorization warning: You are not allowed to edit this interview record.
      </div>

      <div v-else>
        <div class="student-info">
          <p><strong>Student ID:</strong> {{ student.studentId }}</p>
          <p><strong>Name:</strong> {{ student.name }}</p>
          <p><strong>Group ID:</strong> {{ student.groupId }}</p>
        </div>

        <button @click="addRecord">Add Record</button>

        <div v-if="records.length === 0" class="empty">
          No interview records. Click Add Record to create one.
        </div>

        <div v-for="(record, index) in records" :key="record.recordId" class="record-form">
          <h3>Record {{ index + 1 }}</h3>

          <div class="form-grid">
            <div>
              <label>Date</label>
              <input v-model="record.date" type="date" />
            </div>

            <div>
              <label>Time</label>
              <input v-model="record.time" type="time" />
            </div>
          </div>

          <div class="form-item">
            <label>Problem Statement</label>
            <textarea v-model="record.problemStatement" maxlength="200"></textarea>
          </div>

          <div class="form-item">
            <label>Interview Summary</label>
            <textarea v-model="record.interviewSummary" maxlength="300"></textarea>
          </div>

          <div class="form-item">
            <label>Follow-up Action</label>
            <textarea v-model="record.followupAction" maxlength="200"></textarea>
          </div>

          <button class="danger" @click="deleteRecord(index)">Delete</button>
        </div>

        <div class="actions">
          <button @click="saveRecords">Save</button>
          <button class="secondary" @click="cancelEdit">Cancel</button>
        </div>

        <p v-if="message" class="message" :class="{ error: isError }">
          {{ message }}
        </p>
      </div>
    </div>

    <div v-else>
      <h1>Student Not Found</h1>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  currentUser,
  findStudentById,
  generateRecordId,
  getRole,
  type InterviewRecord,
} from '../data/mockData'

const route = useRoute()
const router = useRouter()

const studentId = route.params.studentId as string
const student = findStudentById(studentId)

const canEdit = computed(() => {
  if (!student) {
    return false
  }

  return getRole() === 'mentor' && student.mentorId === currentUser.mentorId
})

const originalRecords = ref<InterviewRecord[]>(
  student ? JSON.parse(JSON.stringify(student.records)) : [],
)

const records = ref<InterviewRecord[]>(
  student ? JSON.parse(JSON.stringify(student.records)) : [],
)

const message = ref('')
const isError = ref(false)

function addRecord() {
  records.value.push({
    recordId: generateRecordId(),
    date: '',
    time: '',
    problemStatement: '',
    interviewSummary: '',
    followupAction: '',
  })
}

function deleteRecord(index: number) {
  records.value.splice(index, 1)
}

function validateRecords(): boolean {
  for (const record of records.value) {
    if (
      !record.date ||
      !record.time ||
      !record.problemStatement.trim() ||
      !record.interviewSummary.trim() ||
      !record.followupAction.trim()
    ) {
      message.value = 'Validation warning: Required fields cannot be empty.'
      isError.value = true
      return false
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      message.value = 'Validation warning: Invalid date format.'
      isError.value = true
      return false
    }

    if (!/^\d{2}:\d{2}$/.test(record.time)) {
      message.value = 'Validation warning: Invalid time format.'
      isError.value = true
      return false
    }

    if (
      record.problemStatement.length > 200 ||
      record.interviewSummary.length > 300 ||
      record.followupAction.length > 200
    ) {
      message.value = 'Length limit warning: Text is too long.'
      isError.value = true
      return false
    }
  }

  return true
}

function saveRecords() {
  if (!student) {
    return
  }

  message.value = ''
  isError.value = false

  if (!validateRecords()) {
    return
  }

  student.records = JSON.parse(JSON.stringify(records.value))
  originalRecords.value = JSON.parse(JSON.stringify(records.value))

  message.value = 'Interview records saved successfully.'
  isError.value = false
}

function cancelEdit() {
  records.value = JSON.parse(JSON.stringify(originalRecords.value))
  message.value = 'Unsaved changes have been discarded.'
  isError.value = false
}

function goBack() {
  if (student) {
    router.push(`/students/${student.studentId}`)
  } else {
    router.push('/students/search')
  }
}
</script>

<style scoped>
.page-card {
  background: white;
  padding: 28px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.desc {
  color: #6b7280;
}

.warning {
  margin-top: 20px;
  padding: 14px;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
}

.student-info {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.record-form {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  margin-top: 14px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

input,
textarea {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

textarea {
  min-height: 80px;
}

button {
  padding: 9px 16px;
  margin-top: 14px;
  margin-right: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button.secondary {
  background: #6b7280;
}

button.danger {
  background: #dc2626;
}

.actions {
  margin-top: 24px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #dc2626;
}

.empty {
  margin-top: 20px;
  color: #6b7280;
}
</style>
