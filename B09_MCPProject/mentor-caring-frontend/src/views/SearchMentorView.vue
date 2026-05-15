<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>
    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by mentor name,
      email, or group ID.
    </p>

    <div class="form">
      <div class="form-item">
        <label>Mentor Name</label>
        <input v-model="mentorName" type="text" placeholder="Example: Dr. Smith" />
      </div>

      <div class="form-item">
        <label>Mentor Email</label>
        <input v-model="mentorEmail" type="text" placeholder="Example: smith@university.edu" />
      </div>

      <div class="form-item">
        <label>Group ID</label>
        <input v-model="groupId" type="text" placeholder="Example: G001" />
      </div>

      <div class="buttons">
        <button @click="searchMentor">Search</button>
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>
    </div>

    <div class="test-box">
      <h3>Test Data</h3>
      <p><strong>Mentor name:</strong> Dr. Smith</p>
      <p><strong>Mentor email:</strong> smith@university.edu</p>
      <p><strong>Group ID:</strong> G001</p>
      <p><strong>Outside coordinator scope:</strong> G002</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRole, hasMentorAccess, mentors } from '../data/mockData'

const router = useRouter()

const mentorName = ref('')
const mentorEmail = ref('')
const groupId = ref('')

const message = ref('')
const isError = ref(false)

function searchMentor() {
  message.value = ''
  isError.value = false

  const nameInput = mentorName.value.trim().toLowerCase()
  const emailInput = mentorEmail.value.trim().toLowerCase()
  const groupInput = groupId.value.trim().toUpperCase()

  if (!nameInput && !emailInput && !groupInput) {
    message.value = 'Warning: Please enter mentor name, email, or group ID.'
    isError.value = true
    return
  }

  if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
    message.value = 'Warning: Invalid mentor email format.'
    isError.value = true
    return
  }

  if (groupInput && !/^G\d{3}$/.test(groupInput)) {
    message.value = 'Warning: Invalid group ID format. Example format: G001.'
    isError.value = true
    return
  }

  const role = getRole()

  const result = mentors.filter((mentor) => {
    const matchName = nameInput && mentor.name.toLowerCase().includes(nameInput)
    const matchEmail = emailInput && mentor.email.toLowerCase() === emailInput
    const matchGroup = groupInput && mentor.groupId === groupInput

    return matchName || matchEmail || matchGroup
  })

  if (result.length === 0) {
    message.value = 'No matching mentor information is found.'
    isError.value = true
    return
  }

  const unauthorized = result.some((mentor) => !hasMentorAccess(mentor, role))

  if (unauthorized) {
    message.value = 'Authorization warning: You cannot view mentor information outside your scope.'
    isError.value = true
    return
  }

  router.push({
    path: '/mentor-result',
    query: {
      name: mentorName.value.trim(),
      email: mentorEmail.value.trim(),
      groupId: groupId.value.trim(),
    },
  })
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
  max-width: 460px;
  margin-top: 24px;
}

.form-item {
  margin-top: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
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
