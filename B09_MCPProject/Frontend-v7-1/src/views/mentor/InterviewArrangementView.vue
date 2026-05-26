<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Interview Arrangement</h1>
        <p class="desc">
          Create 30-minute available slots, watch student bookings, set venues, and cancel unusable slots.
        </p>
      </div>
      <div class="actions">
        <button class="secondary" @click="goVenue">Venue Only Page</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <section class="card">
      <h2>Create Available Slots</h2>

      <div class="form-row">
        <div class="form-item">
          <label>Slot Date</label>
          <input v-model="slotDate" type="date" />
        </div>

        <div class="form-item">
          <label>Start Time</label>
          <input v-model="slotTime" type="time" step="1800" />
        </div>

        <button class="primary add-button" @click="addSlot">Add Slot</button>
      </div>

      <table v-if="draftSlots.length > 0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="slot in draftSlots" :key="slot.key">
            <td>{{ slot.slotDate }}</td>
            <td>{{ slot.startTime }}</td>
            <td>{{ slot.endTime }}</td>
            <td>
              <button class="danger small" @click="removeDraftSlot(slot.key)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="hint">
        Backend endpoint creates slots for one date at a time. If you add slots from multiple dates,
        save them separately.
      </p>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <button class="primary" :disabled="submitting || draftSlots.length === 0" @click="createSlots">
        {{ submitting ? 'Creating...' : 'Create Slots' }}
      </button>
    </section>

    <section class="card">
      <div class="bar">
        <div>
          <h2>My Interview Slots</h2>
          <p class="hint">
            Booked slots can receive a venue. Unneeded slots can be cancelled.
          </p>
        </div>
        <button class="secondary" :disabled="loadingSlots" @click="loadSlots">
          {{ loadingSlots ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <p v-if="slotLoadMessage" class="message" :class="{ error: isSlotLoadError }">
        {{ slotLoadMessage }}
      </p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Student</th>
            <th>Venue</th>
            <th>Operation</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="slot in sortedSlots" :key="slot.slotId">
            <td>{{ slot.slotDate }}</td>
            <td>{{ slot.startTime }}</td>
            <td>{{ slot.endTime || '-' }}</td>
            <td>
              <span class="status" :class="statusClass(slot)">
                {{ slot.status || inferSlotStatus(slot) }}
              </span>
            </td>
            <td>{{ slot.studentId || '-' }}</td>
            <td>
              <input
                v-model.trim="venues[slot.slotId]"
                :placeholder="slot.venue || (isBooked(slot) ? 'Room 101' : 'Available slot')"
              />
            </td>
            <td class="op-cell">
              <button
                class="primary small"
                :disabled="savingVenueId === slot.slotId || !venues[slot.slotId]"
                @click="saveVenue(slot)"
              >
                {{ savingVenueId === slot.slotId ? 'Saving...' : 'Save Venue' }}
              </button>
              <button
                class="danger small"
                :disabled="cancellingSlotId === slot.slotId"
                @click="cancelSlot(slot)"
              >
                {{ cancellingSlotId === slot.slotId ? 'Cancelling...' : 'Cancel Slot' }}
              </button>
            </td>
          </tr>

          <tr v-if="!sortedSlots.length">
            <td colspan="7" class="empty">No slots yet.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  cancelAppointmentSlot,
  createAppointmentSlots,
  getMentorAppointmentSlots,
  setAppointmentVenue,
  type AppointmentSlot,
} from '../../api/mentoring'

type DraftSlot = {
  key: string
  slotDate: string
  startTime: string
  endTime: string
}

const router = useRouter()

const slotDate = ref('')
const slotTime = ref('')
const draftSlots = ref<DraftSlot[]>([])
const mySlots = ref<AppointmentSlot[]>([])

const submitting = ref(false)
const loadingSlots = ref(false)
const savingVenueId = ref('')
const cancellingSlotId = ref('')

const message = ref('')
const isError = ref(false)
const slotLoadMessage = ref('')
const isSlotLoadError = ref(false)

const venues = reactive<Record<string, string>>({})
const HALF_HOUR_TIME_PATTERN = /^\d{2}:(00|30)$/

const sortedSlots = computed(() => {
  return [...mySlots.value].sort((a, b) => {
    const left = `${a.slotDate || ''} ${a.startTime || ''}`
    const right = `${b.slotDate || ''} ${b.startTime || ''}`
    return left.localeCompare(right)
  })
})

onMounted(() => loadSlots(true))

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

  return Array.from(
    new Set(
      raw
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  )
}

function addSlot() {
  clearCreateMessage()

  if (!slotDate.value || !slotTime.value) {
    showCreateError('Please select date and start time.')
    return
  }

  if (slotDate.value < todayText()) {
    showCreateError('Slot date cannot be earlier than today.')
    return
  }

  if (!HALF_HOUR_TIME_PATTERN.test(slotTime.value)) {
    showCreateError('Start time must be on a 30-minute boundary, for example 09:00 or 09:30.')
    return
  }

  const endTime = addThirtyMinutes(slotTime.value)
  const key = `${slotDate.value}_${slotTime.value}`

  if (draftSlots.value.some((slot) => slot.key === key)) {
    showCreateError('This slot already exists in the draft list.')
    return
  }

  draftSlots.value.push({
    key,
    slotDate: slotDate.value,
    startTime: slotTime.value,
    endTime,
  })

  slotTime.value = ''
}

function removeDraftSlot(key: string) {
  draftSlots.value = draftSlots.value.filter((slot) => slot.key !== key)
}

async function createSlots() {
  clearCreateMessage()

  if (!draftSlots.value.length) {
    showCreateError('Please add at least one slot.')
    return
  }

  const dates = Array.from(new Set(draftSlots.value.map((slot) => slot.slotDate)))
  if (dates.length > 1) {
    showCreateError('Please create slots for one date at a time.')
    return
  }

  const onlyDate = dates[0]
  if (!onlyDate) {
    showCreateError('Please select a slot date.')
    return
  }

  submitting.value = true

  try {
    const createdRows = await createAppointmentSlots({
      slotDate: onlyDate,
      startTimes: draftSlots.value.map((slot) => slot.startTime),
    })

    if (createdRows.length > 0) {
      mySlots.value = dedupeSlots([...mySlots.value, ...createdRows])
      createdRows.forEach((slot) => {
        if (slot.slotId) venues[slot.slotId] = slot.venue || venues[slot.slotId] || ''
      })
    }

    message.value = 'Slots created successfully.'
    isError.value = false
    draftSlots.value = []
    await loadSlots(true)
  } catch (err: any) {
    showCreateError(toFriendlyError(err, 'Failed to create slots.'))
  } finally {
    submitting.value = false
  }
}

async function loadSlots(silent = false) {
  slotLoadMessage.value = ''
  isSlotLoadError.value = false
  loadingSlots.value = true

  const candidates = getMentorIdCandidates()
  if (candidates.length === 0) {
    slotLoadMessage.value = 'Cannot find current mentor ID or username from localStorage.'
    isSlotLoadError.value = true
    loadingSlots.value = false
    return
  }

  let lastError = ''
  let loaded: AppointmentSlot[] = []
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

  const shouldReplaceRows = loaded.length > 0 || hadSuccessfulEmptyResponse

  if (loaded.length === 0 && !hadSuccessfulEmptyResponse && lastError) {
    if (!silent) {
      slotLoadMessage.value = toFriendlyError(lastError, 'Failed to load slots.')
      isSlotLoadError.value = true
    }
  }

  if (shouldReplaceRows) {
    mySlots.value = dedupeSlots(loaded)
    mySlots.value.forEach((slot) => {
      if (slot.slotId) venues[slot.slotId] = slot.venue || venues[slot.slotId] || ''
    })
  }

  loadingSlots.value = false
}

function dedupeSlots(rows: AppointmentSlot[]): AppointmentSlot[] {
  const map = new Map<string, AppointmentSlot>()
  for (const row of rows) {
    const key = row.slotId || `${row.slotDate}-${row.startTime}-${row.studentId || ''}`
    map.set(key, row)
  }
  return [...map.values()]
}

function isBooked(slot: AppointmentSlot): boolean {
  const status = String(slot.status || '').toUpperCase()
  return Boolean(slot.studentId) || ['BOOKED', 'CONFIRMED', 'RESERVED', 'OCCUPIED'].includes(status)
}

function inferSlotStatus(slot: AppointmentSlot): string {
  return isBooked(slot) ? 'BOOKED' : 'AVAILABLE'
}

function statusClass(slot: AppointmentSlot): string {
  return isBooked(slot) ? 'booked' : 'available'
}

async function saveVenue(slot: AppointmentSlot) {
  const venue = venues[slot.slotId]?.trim()
  if (!venue) {
    window.alert('Please enter a venue.')
    return
  }

  savingVenueId.value = slot.slotId

  try {
    await setAppointmentVenue(slot.slotId, venue)
    await loadSlots()
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Save venue failed.'))
  } finally {
    savingVenueId.value = ''
  }
}

async function cancelSlot(slot: AppointmentSlot) {
  const ok = window.confirm(`Cancel slot ${slot.slotDate} ${slot.startTime}?`)
  if (!ok) return

  cancellingSlotId.value = slot.slotId

  try {
    await cancelAppointmentSlot(slot.slotId)
    await loadSlots()
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Cancel slot failed.'))
  } finally {
    cancellingSlotId.value = ''
  }
}

function todayText(): string {
  return new Date().toISOString().slice(0, 10)
}

function addThirtyMinutes(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h || 0, m || 0, 0, 0)
  date.setMinutes(date.getMinutes() + 30)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Backend rejected this request. Please confirm this account has ROLE_MENTOR and the token is fresh.'
  }
  return text || fallback
}

function goVenue() {
  router.push('/mentor/interview-arrangement/venue')
}

function goHome() {
  router.push('/main')
}

function clearCreateMessage() {
  message.value = ''
  isError.value = false
}

function showCreateError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header,
.actions,
.form-row,
.bar,
.op-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.header,
.bar {
  justify-content: space-between;
}

.desc,
.hint,
.empty {
  color: #6b7280;
}

.card {
  margin-top: 22px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
}

.form-row {
  align-items: flex-end;
}

.form-item {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 9px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

button {
  padding: 9px 14px;
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

.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}

.small {
  padding: 6px 10px;
  font-size: 12px;
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
  vertical-align: middle;
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

.status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #e5e7eb;
}

.status.available {
  background: #dcfce7;
  color: #166534;
}

.status.booked {
  background: #dbeafe;
  color: #1d4ed8;
}

@media (max-width: 900px) {
  .header,
  .form-row,
  .bar,
  .op-cell {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
