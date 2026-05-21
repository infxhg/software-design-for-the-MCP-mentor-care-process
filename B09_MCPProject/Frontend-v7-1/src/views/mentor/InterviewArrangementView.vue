<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Interview Arrangement</h1>
        <p class="desc">Create 30-minute available slots for students to book.</p>
      </div>
      <div class="actions">
        <button class="secondary" @click="goVenue">Step 2: Confirm Venue</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <div class="form">
      <div class="form-row">
        <div class="form-item">
          <label>Slot Date</label>
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
            <td>{{ slot.slotDate }}</td>
            <td>{{ slot.startTime }}</td>
            <td>{{ slot.endTime }}</td>
            <td><button class="danger" @click="removeSlot(slot.key)">Remove</button></td>
          </tr>
        </tbody>
      </table>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <button :disabled="submitting || slots.length === 0" @click="createSlots">
        {{ submitting ? 'Creating...' : 'Create Slots' }}
      </button>
    </div>

    <div class="card">
      <div class="bar">
        <h2>My Slots</h2>
        <button class="secondary" :disabled="loadingSlots" @click="loadSlots">
          {{ loadingSlots ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Student</th>
            <th>Venue</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in mySlots" :key="slot.slotId">
            <td>{{ slot.slotDate }}</td>
            <td>{{ slot.startTime }}</td>
            <td>{{ slot.endTime || '-' }}</td>
            <td>{{ slot.status || '-' }}</td>
            <td>{{ slot.studentId || '-' }}</td>
            <td>{{ slot.venue || '-' }}</td>
          </tr>
          <tr v-if="!mySlots.length">
            <td colspan="6" class="empty">No slots.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createAppointmentSlots,
  getMentorAppointmentSlots,
  type AppointmentSlot,
} from '../../api/mentoring'
import { getCurrentUserId } from '../../api/request'

const router = useRouter()

type DraftSlot = {
  key: string
  slotDate: string
  startTime: string
  endTime: string
}

const slotDate = ref('')
const slotTime = ref('')
const slots = ref<DraftSlot[]>([])
const mySlots = ref<AppointmentSlot[]>([])
const submitting = ref(false)
const loadingSlots = ref(false)
const message = ref('')
const isError = ref(false)

const mentorId = computed(() => getCurrentUserId() || localStorage.getItem('username') || '')

onMounted(loadSlots)

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
    slotDate: slotDate.value,
    startTime: slotTime.value,
    endTime,
  })

  slotTime.value = ''
}

function removeSlot(key: string) {
  slots.value = slots.value.filter((slot) => slot.key !== key)
}

async function createSlots() {
  clearMessage()

  if (!slots.value.length) {
    showError('Please add at least one slot.')
    return
  }

  const dates = new Set(slots.value.map((slot) => slot.slotDate))
  if (dates.size > 1) {
    showError('Please create slots for one date at a time.')
    return
  }

  submitting.value = true

  try {
    await createAppointmentSlots({
      slotDate: slots.value[0].slotDate,
      startTimes: slots.value.map((slot) => slot.startTime),
    })

    showSuccess('Slots created successfully.')
    slots.value = []
    await loadSlots()
  } catch (err: any) {
    showError(toFriendlyError(err))
  } finally {
    submitting.value = false
  }
}

async function loadSlots() {
  if (!mentorId.value) return

  loadingSlots.value = true

  try {
    mySlots.value = await getMentorAppointmentSlots(mentorId.value)
  } catch {
    mySlots.value = []
  } finally {
    loadingSlots.value = false
  }
}

function addThirtyMinutes(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  date.setMinutes(date.getMinutes() + 30)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toFriendlyError(err: any): string {
  const text = String(err?.message || err || '')
  if (/permission|forbidden|403|access/i.test(text)) {
    return 'Backend rejected this request. Please confirm this account has ROLE_MENTOR and the token is fresh.'
  }
  return text || 'Failed to create slots.'
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
.form-row,
.bar {
  display: flex;
  gap: 10px;
  align-items: center;
}
.header,
.bar {
  justify-content: space-between;
}
.form,
.card {
  margin-top: 22px;
  max-width: 900px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
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
  padding: 9px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
button {
  margin-top: 16px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
th,
td {
  border: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
}
th {
  background: #f3f4f6;
}
.message {
  margin-top: 14px;
  color: #166534;
}
.error {
  color: #dc2626;
}
.empty {
  color: #6b7280;
  text-align: center;
}
</style>
