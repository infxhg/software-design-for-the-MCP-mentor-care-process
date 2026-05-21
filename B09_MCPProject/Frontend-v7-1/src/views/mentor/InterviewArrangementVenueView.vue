<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Confirm Interview Venue</h1>
        <p class="desc">Confirm a venue after the student has selected a slot.</p>
      </div>
      <div class="actions">
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </p>

    <p v-if="loading" class="empty">Loading...</p>

    <table v-if="appointments.length > 0">
      <thead>
        <tr>
          <th>Student</th>
          <th>Selected Time</th>
          <th>Status</th>
          <th>Venue</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in appointments" :key="item.id">
          <td>{{ item.studentName || item.studentId || '-' }}</td>
          <td>{{ formatTime(item) }}</td>
          <td>{{ item.status || '-' }}</td>
          <td>
            <input v-model.trim="venueMap[item.id]" placeholder="Enter venue" />
          </td>
          <td>
            <button
              :disabled="savingId === item.id || !venueMap[item.id]"
              @click="confirmVenue(item)"
            >
              {{ savingId === item.id ? 'Saving...' : 'Confirm Venue' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading" class="empty">
      No confirmed interview slots waiting for venue.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const appointments = ref<any[]>([])
const venueMap = reactive<Record<string, string>>({})
const loading = ref(false)
const savingId = ref('')
const message = ref('')
const isError = ref(false)

onMounted(loadAppointments)

async function loadAppointments() {
  loading.value = true
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.getMyInvitations ||
      mentoringApi.getMyInvitations ||
      mentoringApi.getMentorAppointments ||
      mentoringApi.getMyAppointments

    if (!fn) {
      throw new Error('Appointment list API is not available.')
    }

    const data = await fn()
    const list = normalizeArray(data)

    appointments.value = list
      .map((item: any) => ({
        ...item,
        id: String(item.id ?? item.invitationId ?? item.appointmentId ?? item.slotId ?? ''),
        studentName: item.studentName ?? item.student?.name,
        studentId: item.studentId ?? item.student?.studentId,
      }))
      .filter((item: any) => item.id)
      .filter((item: any) => {
        const status = String(item.status || '').toLowerCase()
        return (
          !status ||
          status.includes('student_confirmed') ||
          status.includes('confirmed') ||
          status.includes('venue')
        )
      })

    appointments.value.forEach((item) => {
      venueMap[item.id] = item.venue || ''
    })
  } catch (err: any) {
    showError(err.message || 'Failed to load appointments.')
  } finally {
    loading.value = false
  }
}

async function confirmVenue(item: any) {
  const venue = venueMap[item.id]?.trim()
  if (!venue) {
    showError('Please enter venue.')
    return
  }

  savingId.value = item.id
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.mentorConfirmVenue ||
      mentoringApi.mentorConfirmVenue ||
      mentoringApi.confirmAppointmentVenue ||
      mentoringApi.updateAppointmentVenue

    if (!fn) {
      throw new Error('Confirm venue API is not available.')
    }

    await fn(item.id, venue)
    showSuccess('Venue confirmed successfully.')
    await loadAppointments()
  } catch (err: any) {
    showError(err.message || 'Failed to confirm venue.')
  } finally {
    savingId.value = ''
  }
}

function formatTime(item: any): string {
  return (
    item.selectedTime ||
    item.time ||
    item.startTime ||
    item.start ||
    `${item.date || ''} ${item.slotTime || ''}`.trim() ||
    '-'
  )
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.records)) return data.records
  return []
}

function goBack() {
  router.push('/mentor/interview-arrangement')
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
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.header {
  justify-content: space-between;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 22px;
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
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
.empty {
  color: #6b7280;
  padding: 16px 0;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
