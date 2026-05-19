<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Confirm Venue (Step 2)</h1>
        <p class="desc">After students choose a time, confirm the venue to finalize the interview.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading confirmed invitations...</div>

    <div v-else-if="invitations.length === 0" class="empty">
      No student has confirmed a time slot yet.
    </div>

    <table v-else>
      <thead>
      <tr>
        <th>Student</th>
        <th>Chosen Time</th>
        <th>Venue</th>
        <th>Operation</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="inv in invitations" :key="inv.invitationId">
        <td>{{ inv.studentName || inv.studentId }}</td>
        <td>
          <template v-if="inv.chosenSlot">
            {{ inv.chosenSlot.date }} {{ inv.chosenSlot.time }} - {{ endTime(inv.chosenSlot.time) }}
          </template>
          <span v-else class="muted">N/A</span>
        </td>
        <td>
          <input
              type="text"
              v-model="venues[inv.invitationId]"
              :placeholder="inv.venue || 'e.g. T1-102'"
              :disabled="inv.status === 'venue_confirmed'"
          />
        </td>
        <td>
          <button
              v-if="inv.status !== 'venue_confirmed'"
              :disabled="confirmingId === inv.invitationId"
              @click="confirmVenue(inv.invitationId)"
          >
            {{ confirmingId === inv.invitationId ? 'Confirming...' : 'Confirm' }}
          </button>
          <span v-else class="confirmed-tag">Confirmed</span>
        </td>
      </tr>
      </tbody>
    </table>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyInvitations, mentorConfirmVenue } from '../../api/communication'
import type { InterviewInvitation } from '../../api/communication'

const router = useRouter()

const invitations = ref<InterviewInvitation[]>([])
const venues = reactive<Record<string, string>>({})
const message = ref('')
const isError = ref(false)
const isLoading = ref(true)
const confirmingId = ref('')

onMounted(async () => {
  try {
    const all = await getMyInvitations()
    /**
     * Only show invitations that the student already confirmed a time on.
     * (status === 'student_confirmed' or 'venue_confirmed')
     */
    invitations.value = all.filter(
        (inv) =>
            inv.status === 'student_confirmed' || inv.status === 'venue_confirmed',
    )
    for (const inv of invitations.value) {
      venues[inv.invitationId] = inv.venue || ''
    }
  } catch (err: any) {
    message.value = 'Failed to load invitations: ' + (err.message || 'Unknown error')
    isError.value = true
  } finally {
    isLoading.value = false
  }
})

function endTime(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const total = h * 60 + m + 30
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

async function confirmVenue(invitationId: string) {
  message.value = ''
  isError.value = false
  confirmingId.value = invitationId

  try {
    const v = venues[invitationId] || ''
    await mentorConfirmVenue(invitationId, v)

    /**
     * Refresh the in-memory invitation so the UI flips to "Confirmed"
     * without a full reload.
     */
    const target = invitations.value.find((i) => i.invitationId === invitationId)
    if (target) {
      target.venue = v.trim()
      target.status = 'venue_confirmed'
    }

    message.value = 'Venue confirmed. Both sides have been notified.'
  } catch (err: any) {
    message.value = err.message || 'Failed to confirm venue.'
    isError.value = true
  } finally {
    confirmingId.value = ''
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

table {
  width: 100%; border-collapse: collapse; margin-top: 20px;
}
th, td {
  padding: 10px; border: 1px solid #e5e7eb; text-align: left;
}
th { background: #f3f4f6; }

td input {
  width: 100%; padding: 8px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

.confirmed-tag { color: #047857; font-weight: 600; }
.muted { color: #6b7280; }

.buttons { margin-top: 20px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.loading, .empty { color: #6b7280; padding: 20px 0; }
</style>
