<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Forward Cases</h1>
        <p class="desc">Forward a student case to the MCP Coordinator.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Student List</label>
        <select v-model="studentId">
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

      <div class="form-item">
        <label>Forward To (Coordinator)</label>
        <select v-model="coordinatorId">
          <option value="">-- Choose a coordinator --</option>
          <option
              v-for="c in coordinatorList"
              :key="c.id"
              :value="c.id"
          >
            {{ c.name }} ({{ c.department }})
          </option>
        </select>
      </div>

      <div class="form-item">
        <label>Case Description</label>
        <textarea
            v-model="description"
            rows="5"
            maxlength="500"
            placeholder="Describe the case..."
        ></textarea>
        <small>{{ description.length }}/500</small>
      </div>

      <div class="buttons">
        <button :disabled="isLoading" @click="forward">
          {{ isLoading ? 'Forwarding...' : 'Forward' }}
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
import { forwardCaseToCoordinator } from '../../api/communication'

const router = useRouter()

const studentId = ref('')
const coordinatorId = ref('')
const description = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

// Mock data — TODO: load from backend
const studentList = ref([
  { studentId: '123456789', name: 'Bnbuer' },
  { studentId: '987654321', name: 'Uicer' },
  { studentId: '210000001', name: 'Sugar' },
])

const coordinatorList = ref([
  { id: 'coord001', name: 'Jack', department: 'DCS' },
  { id: 'coord002', name: 'Peter', department: 'DS' },
  { id: 'coord003', name: 'Mark', department: 'AI' },
])

async function forward() {
  message.value = ''
  isError.value = false
  isLoading.value = true

  try {
    await forwardCaseToCoordinator({
      studentId: studentId.value,
      forwardToId: coordinatorId.value,
      caseDescription: description.value,
    })
    message.value = 'Case forwarded successfully. Email notification has been sent.'
    description.value = ''
    studentId.value = ''
    coordinatorId.value = ''
  } catch (err: any) {
    message.value = err.message || 'Failed to forward case.'
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
.form { max-width: 600px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
select, textarea {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-family: inherit;
}
small { color: #6b7280; }
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
