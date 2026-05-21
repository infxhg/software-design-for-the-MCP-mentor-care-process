<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Interview Arrangement</h1>
        <p class="desc">Invite a student to select one of your available 30-minute slots.</p>
      </div>
      <div class="actions">
        <button class="secondary" @click="goVenue">Step 2: Confirm Venue</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Student</label>
        <select v-if="students.length > 0" v-model="studentId">
          <option value="">-- Select Student --</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name }} ({{ student.id }})
          </option>
        </select>
        <input v-else v-model.trim="studentId" placeholder="Enter Student ID" />
      </div>

      <div class="form-row">
        <div class="form-item">
          <label>Date</label>
          <input v-model="slotDate" type="date" />
        </div>

        <div class="form-item">
          <label>Start Time</label>
          <input v-model="slotTime" type="time" step="1800" />
        </div>

        <button class="add-button" @click="addSlot">Add Slot</button>
      </div>

      <table v-if="slots.length > 0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in slots" :key="slot.key">
            <td>{{ slot.date }}</td>
            <td>{{ slot.startTime }}</td>
            <td>{{ slot.endTime }}</td>
            <td><button class="danger" @click="removeSlot(slot.key)">Remove</button></td>
          </tr>
        </tbody>
      </table>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <button :disabled="submitting || !studentId || slots.length === 0" @click="sendInvitation">
        {{ submitting ? 'Sending...' : 'Send Interview Invitation' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type Slot = {
  key: string
  date: string
  startTime: string
  endTime: string
}

const students = ref<{ id: string; name: string }[]>([])
const studentId = ref('')
const slotDate = ref('')
const slotTime = ref('')
const slots = ref<Slot[]>([])
const submitting = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(loadStudents)

async function loadStudents() {
  try {
    const mentoringApi: any = await import('../../api/mentoring')
    const orgApi: any = await import('../../api/org')

    const fn =
      mentoringApi.getMentorStudents ||
      mentoringApi.getMyStudents ||
      mentoringApi.getMyGroupStudents ||
      orgApi.getAllStudents ||
      orgApi.searchAllStudents

    if (!fn) return

    const data = fn === orgApi.searchAllStudents ? await fn('') : await fn()
    students.value = normalizeStudents(data)
  } catch {
    students.value = []
  }
}

function addSlot() {
  clearMessage()

  if (!slotDate.value || !slotTime.value) {
    showError('Please select date and start time.')
    return
  }

  const endTime = addThirtyMinutes(slotTime.value)
  const key = `${slotDate.value}_${slotTime.value}`

  if (slots.value.some((slot) => slot.key === key)) {
    showError('This slot already exists.')
    return
  }

  slots.value.push({
    key,
    date: slotDate.value,
    startTime: slotTime.value,
    endTime,
  })

  slotTime.value = ''
}

function removeSlot(key: string) {
  slots.value = slots.value.filter((slot) => slot.key !== key)
}

async function sendInvitation() {
  clearMessage()

  if (!studentId.value) {
    showError('Please select a student.')
    return
  }

  if (slots.value.length === 0) {
    showError('Please add at least one time slot.')
    return
  }

  submitting.value = true

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const payloadSlots = slots.value.map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      start: `${slot.date}T${slot.startTime}:00`,
      end: `${slot.date}T${slot.endTime}:00`,
    }))

    const fn =
      communicationApi.sendInterviewInvitation ||
      mentoringApi.sendInterviewInvitation ||
      mentoringApi.createAppointmentSlots ||
      mentoringApi.createInterviewSlots

    if (!fn) {
      throw new Error('Interview arrangement API is not available.')
    }

    await fn(studentId.value, payloadSlots)

    showSuccess('Interview invitation sent successfully.')
    slots.value = []
    studentId.value = ''
  } catch (err: any) {
    showError(err.message || 'Failed to send invitation.')
  } finally {
    submitting.value = false
  }
}

function addThirtyMinutes(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  date.setMinutes(date.getMinutes() + 30)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function normalizeStudents(data: any) {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list
    .map((item: any) => ({
      id: String(item.studentId ?? item.id ?? ''),
      name: item.studentName ?? item.name ?? item.username ?? item.studentId,
    }))
    .filter((item: any) => item.id)
}

function goVenue() {
  router.push('/mentor/interview-arrangement/venue')
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
.header,
.actions,
.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.header {
  justify-content: space-between;
}
.form {
  margin-top: 22px;
  max-width: 850px;
}
.form-item {
  margin-top: 16px;
  flex: 1;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
input,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
.add-button {
  margin-top: 42px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
}
th,
td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}
th {
  background: #f3f4f6;
}
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
.danger {
  background: #dc2626;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
