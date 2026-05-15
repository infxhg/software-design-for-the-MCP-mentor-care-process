<template>
  <div class="page-card">
    <h1>Search Student's Info</h1>

    <p class="desc">
      Mentors and MCP Coordinators can search student information by student ID.
    </p>

    <div class="form">
      <label>Student ID</label>
      <input v-model="studentId" type="text" placeholder="Example: S001" />

      <div class="buttons">
        <button @click="searchStudent">Search</button>
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>
    </div>

    <div class="test-box">
      <h3>Test Data</h3>
      <p><strong>S001</strong>: valid student inside mentor/coordinator scope</p>
      <p><strong>S002</strong>: valid student outside mentor/coordinator scope</p>
      <p><strong>S999</strong>: non-existing student</p>
      <p><strong>ABC</strong>: invalid student ID format</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { findStudentById, getRole, hasStudentAccess } from '../data/mockData'

const router = useRouter()

const studentId = ref('')
const message = ref('')
const isError = ref(false)

function searchStudent() {
  message.value = ''
  isError.value = false

  const input = studentId.value.trim().toUpperCase()

  if (!input) {
    message.value = 'Warning: Student ID cannot be empty.'
    isError.value = true
    return
  }

  if (!/^S\d{3}$/.test(input)) {
    message.value = 'Warning: Invalid student ID format. Example format: S001.'
    isError.value = true
    return
  }

  const student = findStudentById(input)

  if (!student) {
    message.value = 'No matching student record is found.'
    isError.value = true
    return
  }

  const role = getRole()

  if (!hasStudentAccess(student, role)) {
    message.value = 'Authorization warning: You do not have permission to view this student.'
    isError.value = true
    return
  }

  router.push(`/student-detail/${student.studentId}`)
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.form {
  max-width: 420px;
  margin-top: 24px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.buttons {
  margin-top: 16px;
}

.buttons button {
  margin-right: 10px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #dc2626;
}

.test-box {
  margin-top: 30px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  color: #374151;
}
</style>
