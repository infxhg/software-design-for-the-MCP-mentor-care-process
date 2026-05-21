<template>
  <section class="page">
    <h1>Select Interview Appointment</h1>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card">
      <h2>Available Slots</h2>
      <button @click="load">Refresh</button>

      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Venue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in availableSlots" :key="s.slotId">
            <td>{{ s.slotDate }}</td>
            <td>{{ s.startTime }} - {{ s.endTime }}</td>
            <td>{{ s.status || '-' }}</td>
            <td>{{ s.venue || '-' }}</td>
            <td>
              <button class="primary" @click="confirm(s.slotId)">Book</button>
            </td>
          </tr>
          <tr v-if="availableSlots.length === 0">
            <td colspan="5" class="empty">No available slots.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  confirmAppointmentSlot,
  getMentorAppointmentSlots,
  getMyMentor,
  type AppointmentSlot,
} from '../../api/mentoring'

const slots = ref<AppointmentSlot[]>([])
const error = ref('')

const availableSlots = computed(() =>
  slots.value.filter((s) => !s.studentId && String(s.status || '').toUpperCase() !== 'BOOKED'),
)

async function load() {
  error.value = ''
  try {
    const mentorData = await getMyMentor()
    const mentor = Array.isArray(mentorData?.mentor) ? mentorData.mentor[0] : mentorData?.mentor
    const mentorId = mentor?.id || mentor?.mentorId
    if (!mentorId) {
      error.value = 'No mentor assigned yet.'
      return
    }
    slots.value = await getMentorAppointmentSlots(mentorId)
  } catch (e: any) {
    error.value = e.message || 'Failed to load appointment slots.'
  }
}

async function confirm(slotId: string) {
  if (!window.confirm('Book this appointment slot?')) return
  try {
    await confirmAppointmentSlot(slotId)
    await load()
    alert('Appointment confirmed.')
  } catch (e: any) {
    alert(e.message || 'Booking failed.')
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
button { padding: 7px 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
