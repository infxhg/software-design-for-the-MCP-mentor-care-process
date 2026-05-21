<template>
  <section class="page">
    <h1>Interview Arrangement</h1>
    <p class="muted">Create 30-minute available slots for students to book.</p>

    <form class="card" @submit.prevent="createSlots">
      <label>
        Slot Date
        <input v-model="slotDate" type="date" required />
      </label>

      <div class="inline">
        <input v-model="timeInput" type="time" step="1800" />
        <button type="button" @click="addTime">Add Time</button>
      </div>

      <div class="chips">
        <span v-for="t in startTimes" :key="t" class="chip">
          {{ t }}
          <button type="button" @click="removeTime(t)">×</button>
        </span>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="loading || !slotDate || startTimes.length === 0">
        {{ loading ? 'Creating...' : 'Create Slots' }}
      </button>
    </form>

    <div class="card">
      <h2>My Slots</h2>
      <button @click="loadSlots">Refresh</button>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Student</th>
            <th>Venue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in slots" :key="s.slotId">
            <td>{{ s.slotDate }}</td>
            <td>{{ s.startTime }}</td>
            <td>{{ s.endTime || '-' }}</td>
            <td>{{ s.status || '-' }}</td>
            <td>{{ s.studentId || '-' }}</td>
            <td>{{ s.venue || '-' }}</td>
            <td><button class="danger" @click="cancel(s.slotId)">Cancel</button></td>
          </tr>
          <tr v-if="slots.length === 0">
            <td colspan="7" class="empty">No slots.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  cancelAppointmentSlot,
  createAppointmentSlots,
  getMentorAppointmentSlots,
  type AppointmentSlot,
} from '../../api/mentoring'
import { getCurrentUserId } from '../../api/request'

const slotDate = ref('')
const timeInput = ref('')
const startTimes = ref<string[]>([])
const slots = ref<AppointmentSlot[]>([])
const loading = ref(false)
const error = ref('')

function addTime() {
  if (!timeInput.value) return
  if (!startTimes.value.includes(timeInput.value)) {
    startTimes.value.push(timeInput.value)
    startTimes.value.sort()
  }
  timeInput.value = ''
}

function removeTime(t: string) {
  startTimes.value = startTimes.value.filter((x) => x !== t)
}

async function createSlots() {
  loading.value = true
  error.value = ''
  try {
    await createAppointmentSlots({ slotDate: slotDate.value, startTimes: startTimes.value })
    startTimes.value = []
    await loadSlots()
  } catch (e: any) {
    error.value = e.message || 'Failed to create slots.'
  } finally {
    loading.value = false
  }
}

async function loadSlots() {
  const mentorId = getCurrentUserId()
  if (!mentorId) return
  try {
    slots.value = await getMentorAppointmentSlots(mentorId)
  } catch (e: any) {
    error.value = e.message || 'Failed to load slots.'
  }
}

async function cancel(slotId: string) {
  if (!window.confirm('Cancel this slot?')) return
  try {
    await cancelAppointmentSlot(slotId)
    await loadSlots()
  } catch (e: any) {
    alert(e.message || 'Cancel failed.')
  }
}

onMounted(loadSlots)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
.inline { display: flex; gap: 10px; align-items: center; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { width: fit-content; padding: 7px 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.danger { color: #b42318; border-color: #f3b8b2; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; gap: 6px; align-items: center; padding: 4px 8px; background: #eef2ff; border-radius: 999px; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
.muted { color: #666; }
</style>
