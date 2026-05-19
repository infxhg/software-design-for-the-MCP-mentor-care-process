<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Communication</h1>
        <p class="desc">View messages from your mentor and respond to interview invitations.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <!-- Choose communication type -->
    <div class="quick-actions">
      <router-link to="/communication/normal" class="action-btn">
        Send a Message to Mentor
      </router-link>
    </div>

    <!-- Interview invitations -->
    <section class="section">
      <h2>Interview Invitations</h2>

      <div v-if="isLoading" class="loading">Loading...</div>

      <div v-else-if="pendingInvitations.length === 0" class="empty">
        No pending interview invitations.
      </div>

      <div v-else>
        <div
            v-for="inv in pendingInvitations"
            :key="inv.invitationId"
            class="invitation-card"
        >
          <p>
            <strong>From:</strong> {{ inv.fromMentorName }}
            <span class="type-tag">Interview Invitation</span>
          </p>

          <p>Available Time Slots (Please select one):</p>

          <div class="slots">
            <label
                v-for="(slot, idx) in inv.slots"
                :key="idx"
                class="slot-label"
            >
              <input
                  type="radio"
                  :name="`inv-${inv.invitationId}`"
                  :value="idx"
                  v-model="chosenIdx[inv.invitationId]"
              />
              <span>{{ slot.date }} {{ slot.time }} - {{ endTime(slot.time) }}</span>
            </label>
          </div>

          <button
              :disabled="confirmingId === inv.invitationId"
              @click="confirm(inv.invitationId)"
          >
            {{ confirmingId === inv.invitationId ? 'Confirming...' : 'Confirm' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </section>

    <!-- Confirmed invitations -->
    <section v-if="confirmedInvitations.length > 0" class="section">
      <h2>Confirmed Interviews</h2>

      <table>
        <thead>
        <tr>
          <th>From Mentor</th>
          <th>Time</th>
          <th>Venue</th>
          <th>Status</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="inv in confirmedInvitations" :key="inv.invitationId">
          <td>{{ inv.fromMentorName }}</td>
          <td>
            <template v-if="inv.chosenSlot">
              {{ inv.chosenSlot.date }} {{ inv.chosenSlot.time }} - {{ endTime(inv.chosenSlot.time) }}
            </template>
          </td>
          <td>{{ inv.venue || 'Pending mentor confirmation' }}</td>
          <td>
            <span :class="['tag', inv.status]">
              {{ formatStatus(inv.status) }}
            </span>
          </td>
        </tr>
        </tbody>
      </table>
    </section>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyInvitations, studentConfirmSlot } from '../../api/communication'
import type { InterviewInvitation } from '../../api/communication'

const router = useRouter()

const invitations = ref<InterviewInvitation[]>([])
const chosenIdx = reactive<Record<string, number>>({})
const message = ref('')
const isError = ref(false)
const isLoading = ref(true)
const confirmingId = ref('')

const pendingInvitations = computed(() =>
    invitations.value.filter((inv) => inv.status === 'pending'),
)

const confirmedInvitations = computed(() =>
    invitations.value.filter(
        (inv) =>
            inv.status === 'student_confirmed' ||
            inv.status === 'venue_confirmed',
    ),
)

onMounted(async () => {
  try {
    invitations.value = await getMyInvitations()
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

function formatStatus(status: string): string {
  if (status === 'venue_confirmed') return 'Venue Confirmed'
  if (status === 'student_confirmed') return 'Waiting for Venue'
  if (status === 'pending') return 'Pending'
  return status
}

async function confirm(invitationId: string) {
  message.value = ''
  isError.value = false

  const idx = chosenIdx[invitationId]
  if (idx === undefined || idx === null) {
    message.value = 'Warning: Please select a time slot.'
    isError.value = true
    return
  }

  const inv = invitations.value.find((i) => i.invitationId === invitationId)
  if (!inv) return
  const slot = inv.slots[idx]
  if (!slot) return

  confirmingId.value = invitationId

  try {
    await studentConfirmSlot(invitationId, slot)
    // refresh local state
    inv.chosenSlot = { ...slot }
    inv.status = 'student_confirmed'
    message.value = 'Time slot confirmed. The mentor will assign a venue soon.'
  } catch (err: any) {
    message.value = err.message || 'Failed to confirm.'
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

.quick-actions { margin-top: 18px; }
.action-btn {
  display: inline-block; padding: 10px 16px;
  background: #2563eb; color: white; border-radius: 6px;
  text-decoration: none;
}

.section { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e7eb; }
.section h2 { font-size: 18px; margin-bottom: 14px; }

.invitation-card {
  padding: 18px; background: #f9fafb;
  border: 1px solid #e5e7eb; border-radius: 10px;
  margin-bottom: 14px;
}
.type-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 999px;
  font-size: 12px;
}

.slots {
  display: flex; flex-direction: column; gap: 10px;
  margin: 14px 0;
}
.slot-label { cursor: pointer; font-weight: normal; }
.slot-label input { margin-right: 6px; }

table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.tag {
  display: inline-block; padding: 2px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
}
.tag.pending { background: #fef3c7; color: #b45309; }
.tag.student_confirmed { background: #dbeafe; color: #1d4ed8; }
.tag.venue_confirmed { background: #dcfce7; color: #15803d; }

.buttons { margin-top: 22px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.loading, .empty { color: #6b7280; padding: 16px 0; }
</style>
