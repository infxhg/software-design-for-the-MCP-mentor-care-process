<template>
  <section class="page">
    <h1>Confirm Interview Venue</h1>
    <p class="muted">Set venue for booked interview slots.</p>

    <p v-if="error" class="error">{{ error }}</p>
    <button @click="loadSlots">Refresh</button>

    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Student</th>
          <th>Status</th>
          <th>Venue</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in bookedSlots" :key="s.slotId">
          <td>{{ s.slotDate }}</td>
          <td>{{ s.startTime }} - {{ s.endTime }}</td>
          <td>{{ s.studentId || '-' }}</td>
          <td>{{ s.status || '-' }}</td>
          <td><input v-model.trim="venues[s.slotId]" :placeholder="s.venue || 'Room 101'" /></td>
          <td><button class="primary" @click="saveVenue(s.slotId)">Save Venue</button></td>
        </tr>
        <tr v-if="bookedSlots.length === 0">
          <td colspan="6" class="empty">No booked slots.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getMentorAppointmentSlots,
  setAppointmentVenue,
  type AppointmentSlot,
} from '../../api/mentoring'
import { getCurrentUserId } from '../../api/request'

const slots = ref<AppointmentSlot[]>([])
const venues = reactive<Record<string, string>>({})
const error = ref('')

const bookedSlots = computed(() =>
  slots.value.filter((s) => s.studentId || String(s.status || '').toUpperCase() === 'BOOKED'),
)

async function loadSlots() {
  error.value = ''
  const mentorId = getCurrentUserId()
  if (!mentorId) {
    error.value = 'Cannot find current mentor id from userInfo.'
    return
  }

  try {
    slots.value = await getMentorAppointmentSlots(mentorId)
    slots.value.forEach((s) => {
      venues[s.slotId] = s.venue || venues[s.slotId] || ''
    })
  } catch (e: any) {
    error.value = e.message || 'Failed to load slots.'
  }
}

async function saveVenue(slotId: string) {
  const venue = venues[slotId]
  if (!venue) {
    alert('Please enter a venue.')
    return
  }

  try {
    await setAppointmentVenue(slotId, venue)
    await loadSlots()
  } catch (e: any) {
    alert(e.message || 'Save venue failed.')
  }
}

onMounted(loadSlots)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #fff; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { padding: 7px 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
.muted { color: #666; }
</style>
