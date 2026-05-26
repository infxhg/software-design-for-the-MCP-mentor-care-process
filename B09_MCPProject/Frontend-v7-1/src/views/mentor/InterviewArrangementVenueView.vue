<template>
  <section class="page-card">
    <div class="header">
      <div>
        <h1>Confirm Interview Venue</h1>
        <p class="desc">Set or update the venue for booked interview slots.</p>
      </div>
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="error" class="message error">{{ error }}</p>

    <div class="toolbar">
      <button class="secondary" :disabled="loading" @click="loadSlots">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
      <label class="checkbox">
        <input v-model="showAll" type="checkbox" />
        Show all slots
      </label>
    </div>

    <table>
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
        <tr v-for="slot in visibleSlots" :key="slot.slotId">
          <td>{{ slot.slotDate }}</td>
          <td>{{ slot.startTime }} - {{ slot.endTime || '-' }}</td>
          <td>{{ slot.studentId || '-' }}</td>
          <td>{{ slot.status || (isBooked(slot) ? 'BOOKED' : 'AVAILABLE') }}</td>
          <td>
            <input v-model.trim="venues[slot.slotId]" :placeholder="slot.venue || 'Room 101'" />
          </td>
          <td>
            <button
              class="primary"
              :disabled="savingId === slot.slotId || !venues[slot.slotId]"
              @click="saveVenue(slot.slotId)"
            >
              {{ savingId === slot.slotId ? 'Saving...' : 'Save Venue' }}
            </button>
          </td>
        </tr>

        <tr v-if="visibleSlots.length === 0">
          <td colspan="6" class="empty">No booked slots.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getMentorAppointmentSlots,
  setAppointmentVenue,
  type AppointmentSlot,
} from '../../api/mentoring'

const router = useRouter()

const slots = ref<AppointmentSlot[]>([])
const venues = reactive<Record<string, string>>({})
const error = ref('')
const loading = ref(false)
const savingId = ref('')
const showAll = ref(false)

const visibleSlots = computed(() => {
  const rows = showAll.value ? slots.value : slots.value.filter(isBooked)
  return [...rows].sort((a, b) => `${a.slotDate} ${a.startTime}`.localeCompare(`${b.slotDate} ${b.startTime}`))
})

onMounted(loadSlots)

function getStoredUserInfo(): any {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

function getMentorIdCandidates(): string[] {
  const info = getStoredUserInfo()
  const user = info.user || {}
  const raw = [
    info.mentorId,
    user.mentorId,
    info.userId,
    user.userId,
    info.id,
    user.id,
    info.username,
    user.username,
    localStorage.getItem('userId'),
    localStorage.getItem('username'),
  ]

  return Array.from(new Set(raw.map((item) => String(item || '').trim()).filter(Boolean)))
}

function isBooked(slot: AppointmentSlot): boolean {
  const status = String(slot.status || '').toUpperCase()
  return Boolean(slot.studentId) || ['BOOKED', 'CONFIRMED', 'RESERVED', 'OCCUPIED'].includes(status)
}

async function loadSlots() {
  error.value = ''
  loading.value = true

  const candidates = getMentorIdCandidates()
  if (candidates.length === 0) {
    error.value = 'Cannot find current mentor ID or username from localStorage.'
    loading.value = false
    return
  }

  let loaded: AppointmentSlot[] = []
  let lastError = ''
  let hadSuccessfulEmptyResponse = false

  for (const candidate of candidates) {
    try {
      const rows = await getMentorAppointmentSlots(candidate)
      if (rows.length > 0) {
        loaded = rows
        break
      }
      hadSuccessfulEmptyResponse = true
    } catch (err: any) {
      lastError = String(err?.message || err || '')
    }
  }

  if (loaded.length === 0 && !hadSuccessfulEmptyResponse && lastError) {
    error.value = toFriendlyError(lastError, 'Failed to load slots.')
  }

  slots.value = dedupeSlots(loaded)
  slots.value.forEach((slot) => {
    venues[slot.slotId] = slot.venue || venues[slot.slotId] || ''
  })
  loading.value = false
}

function dedupeSlots(rows: AppointmentSlot[]): AppointmentSlot[] {
  const map = new Map<string, AppointmentSlot>()
  for (const row of rows) {
    const key = row.slotId || `${row.slotDate}-${row.startTime}-${row.studentId || ''}`
    map.set(key, row)
  }
  return [...map.values()]
}

async function saveVenue(slotId: string) {
  const venue = venues[slotId]?.trim()
  if (!venue) {
    window.alert('Please enter a venue.')
    return
  }

  savingId.value = slotId

  try {
    await setAppointmentVenue(slotId, venue)
    await loadSlots()
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Save venue failed.'))
  } finally {
    savingId.value = ''
  }
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Backend rejected this request. Please confirm this account has ROLE_MENTOR and the token is fresh.'
  }
  return text || fallback
}

function goBack() {
  router.push('/mentor/interview-arrangement')
}
</script>

<style scoped>
.header,
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.desc,
.empty {
  color: #6b7280;
}

.toolbar {
  justify-content: flex-start;
  margin: 18px 0;
}

.checkbox {
  display: flex;
  gap: 6px;
  align-items: center;
}

.checkbox input {
  width: auto;
}

input {
  width: 100%;
  padding: 9px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

button {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.secondary {
  background: #f8fafc;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

th,
td {
  border: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
}

th {
  background: #f8fafc;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #b42318;
}

@media (max-width: 760px) {
  .header,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
