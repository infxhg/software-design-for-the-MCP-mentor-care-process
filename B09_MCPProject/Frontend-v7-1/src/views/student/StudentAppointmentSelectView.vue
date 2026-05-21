<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Select Interview Appointment</h1>
        <p class="desc">Choose one available time slot from your mentor.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </p>

    <p v-if="loading" class="empty">Loading...</p>

    <div v-if="invitations.length > 0" class="cards">
      <section v-for="invitation in invitations" :key="invitation.id" class="card">
        <h2>{{ invitation.mentorName || invitation.mentorId || 'Mentor' }}</h2>
        <p><strong>Status:</strong> {{ invitation.status || '-' }}</p>

        <div class="slot-list">
          <label
            v-for="slot in invitation.slots"
            :key="slot.id"
            class="slot"
          >
            <input
              v-model="selectedSlotIds[invitation.id]"
              type="radio"
              :name="`slot-${invitation.id}`"
              :value="slot.id"
            />
            <span>{{ formatSlot(slot) }}</span>
          </label>
        </div>

        <button
          :disabled="confirmingId === invitation.id || !selectedSlotIds[invitation.id]"
          @click="confirmSlot(invitation)"
        >
          {{ confirmingId === invitation.id ? 'Confirming...' : 'Confirm Selected Slot' }}
        </button>
      </section>
    </div>

    <p v-else-if="!loading" class="empty">
      No appointment invitations.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const invitations = ref<any[]>([])
const selectedSlotIds = reactive<Record<string, string>>({})
const loading = ref(false)
const confirmingId = ref('')
const message = ref('')
const isError = ref(false)

onMounted(loadInvitations)

async function loadInvitations() {
  loading.value = true
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.getStudentInvitations ||
      mentoringApi.getStudentInvitations ||
      mentoringApi.getStudentAppointments ||
      mentoringApi.getMyAppointments ||
      communicationApi.getMyInvitations

    if (!fn) {
      throw new Error('Student appointment list API is not available.')
    }

    const data = await fn()
    invitations.value = normalizeInvitations(data)
  } catch (err: any) {
    showError(err.message || 'Failed to load appointments.')
  } finally {
    loading.value = false
  }
}

async function confirmSlot(invitation: any) {
  const slotId = selectedSlotIds[invitation.id]
  if (!slotId) {
    showError('Please select a slot.')
    return
  }

  confirmingId.value = invitation.id
  clearMessage()

  try {
    const communicationApi: any = await import('../../api/communication')
    const mentoringApi: any = await import('../../api/mentoring')

    const fn =
      communicationApi.studentConfirmSlot ||
      mentoringApi.studentConfirmSlot ||
      mentoringApi.confirmAppointment ||
      mentoringApi.confirmAppointmentSlot

    if (!fn) {
      throw new Error('Confirm appointment API is not available.')
    }

    await fn(invitation.id, slotId)
    showSuccess('Appointment slot confirmed successfully.')
    await loadInvitations()
  } catch (err: any) {
    showError(err.message || 'Failed to confirm slot.')
  } finally {
    confirmingId.value = ''
  }
}

function normalizeInvitations(data: any) {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []

  return list
    .map((item: any) => {
      const id = String(item.id ?? item.invitationId ?? item.appointmentId ?? '')
      const rawSlots = item.slots ?? item.availableSlots ?? item.timeSlots ?? [item]

      return {
        ...item,
        id,
        slots: normalizeSlots(rawSlots),
      }
    })
    .filter((item: any) => item.id)
}

function normalizeSlots(data: any) {
  const list = Array.isArray(data) ? data : data?.data || []
  return list
    .map((slot: any) => ({
      ...slot,
      id: String(slot.id ?? slot.slotId ?? slot.appointmentSlotId ?? ''),
    }))
    .filter((slot: any) => slot.id)
}

function formatSlot(slot: any): string {
  if (slot.start && slot.end) return `${slot.start} - ${slot.end}`
  if (slot.date && slot.startTime) {
    return `${slot.date} ${slot.startTime}${slot.endTime ? ` - ${slot.endTime}` : ''}`
  }
  return slot.time || slot.startTime || slot.id
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
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cards {
  display: grid;
  gap: 16px;
  margin-top: 22px;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}
.slot-list {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}
.slot {
  display: flex;
  gap: 8px;
  align-items: center;
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
