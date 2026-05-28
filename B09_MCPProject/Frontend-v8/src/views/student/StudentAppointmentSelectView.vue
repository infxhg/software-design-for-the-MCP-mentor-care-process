<template>
  <section class="page">
    <div class="header">
      <div>
        <h1>Select Interview Appointment</h1>
        <p>
          Your mentor publishes <strong>AVAILABLE</strong> 30-minute slots for you to choose.
          Click <strong>Confirm Appointment</strong> to book one. After you book, the mentor will
          set the interview venue.
        </p>
      </div>
      <button class="refresh-btn" type="button" :disabled="loading" @click="load">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>

    <div class="card" v-if="mentor">
      <h2>Assigned Mentor</h2>
      <div class="info-grid">
        <p><strong>Name:</strong> {{ mentor.realName || mentor.name || '-' }}</p>
        <p><strong>Username:</strong> {{ mentor.username || '-' }}</p>
        <p><strong>Email:</strong> {{ mentor.email || '-' }}</p>
        <p><strong>Phone:</strong> {{ mentor.phone || '-' }}</p>
      </div>
    </div>

    <div class="card" v-if="bookedSlots.length">
      <h2>My Confirmed Appointments</h2>
      <p class="hint">
        After your mentor saves the venue, click <strong>Refresh</strong> to see the room here.
      </p>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Venue</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in bookedSlots" :key="`booked-${slotKey(s)}`">
            <td>{{ s.slotDate || '-' }}</td>
            <td>
              {{ s.startTime || '-' }}
              <span v-if="s.endTime"> - {{ s.endTime }}</span>
            </td>
            <td>
              <span class="status-pill booked">{{ statusText(s.status, s) }}</span>
            </td>
            <td>{{ formatVenue(s.venue) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Available Slots From Your Mentor</h2>
      <p class="hint">
        Choose one 30-minute slot below. These are the time slots your mentor marked as available
        for students in your group.
      </p>

      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Venue</th>
            <th class="actions">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in availableSlots" :key="slotKey(s)">
            <td>{{ s.slotDate || '-' }}</td>
            <td>
              {{ s.startTime || '-' }}
              <span v-if="s.endTime"> - {{ s.endTime }}</span>
            </td>
            <td>
              <span class="status-pill" :class="statusPillClass(s)">{{ statusText(s.status, s) }}</span>
            </td>
            <td>{{ formatVenue(s.venue) }}</td>
            <td class="actions">
              <button
                class="primary"
                :disabled="bookingSlotId === s.slotId || !s.slotId"
                @click="confirm(s.slotId)"
              >
                {{ bookingSlotId === s.slotId ? 'Confirming...' : 'Confirm Appointment' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && availableSlots.length === 0">
            <td colspan="5" class="empty">
              No open slots right now. Ask your mentor to publish a slot, then click Refresh.
            </td>
          </tr>
          <tr v-if="loading">
            <td colspan="5" class="empty">Loading slots...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" v-if="mentor">
      <h2>All Slots From This Mentor</h2>
      <p class="hint">
        Full list returned by
        <code>GET /api/mentoring/appointments/slots/mentor/{mentorId}</code>
        (AVAILABLE + your BOOKED slots). Read-only overview.
      </p>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Student</th>
            <th>Venue</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in sortedAllSlots"
            :key="`all-${slotKey(s)}`"
            :class="{ mine: isMyBookedSlot(s) }"
          >
            <td>{{ s.slotDate || '-' }}</td>
            <td>
              {{ s.startTime || '-' }}
              <span v-if="s.endTime"> - {{ s.endTime }}</span>
            </td>
            <td>
              <span class="status-pill" :class="statusPillClass(s)">
                {{ statusText(s.status, s) }}
              </span>
            </td>
            <td>{{ displaySlotStudent(s) }}</td>
            <td>{{ formatVenue(s.venue) }}</td>
          </tr>
          <tr v-if="!loading && sortedAllSlots.length === 0">
            <td colspan="5" class="empty">No slots loaded yet. Click Refresh after you confirm an appointment.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="5" class="empty">Loading slots...</td>
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
  getStudentMentorAppointmentSlots,
  mergeStudentAppointmentSlots,
  getMyMentor,
  loadCachedStudentBookedSlots,
  loadStudentBookedIdentities,
  type AppointmentSlot,
} from '../../api/mentoring'

interface MentorRow {
  id?: string
  mentorId?: string
  userId?: string
  username?: string
  realName?: string
  name?: string
  email?: string | null
  phone?: string | null
  [key: string]: any
}

const allSlots = ref<AppointmentSlot[]>([])
const mentor = ref<MentorRow | null>(null)
const loading = ref(false)
const bookingSlotId = ref('')
const error = ref('')
const success = ref('')

const currentStudentId = computed(() => getCurrentStudentId())

const availableSlots = computed(() =>
  allSlots.value
    .filter(isBookableSlot)
    .sort((a, b) =>
      `${a.slotDate || ''} ${a.startTime || ''}`.localeCompare(`${b.slotDate || ''} ${b.startTime || ''}`),
    ),
)

const bookedSlots = computed(() =>
  allSlots.value
    .filter((slot) => isMyBookedSlot(slot))
    .sort((a, b) =>
      `${a.slotDate || ''} ${a.startTime || ''}`.localeCompare(`${b.slotDate || ''} ${b.startTime || ''}`),
    ),
)

const sortedAllSlots = computed(() =>
  [...allSlots.value].sort((a, b) =>
    `${a.slotDate || ''} ${a.startTime || ''}`.localeCompare(`${b.slotDate || ''} ${b.startTime || ''}`),
  ),
)

function getCurrentStudentId(): string {
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const user = info.user || info
    return String(
      user.studentId ??
        user.userId ??
        user.id ??
        info.studentId ??
        info.userId ??
        info.id ??
        localStorage.getItem('userId') ??
        localStorage.getItem('username') ??
        '',
    ).trim()
  } catch {
    return String(localStorage.getItem('userId') || localStorage.getItem('username') || '').trim()
  }
}

function getCurrentStudentAliases(): string[] {
  const set = new Set<string>()
  const id = currentStudentId.value
  if (id) {
    set.add(id)
    set.add(id.toLowerCase())
  }

  const username = String(localStorage.getItem('username') || '').trim()
  if (username) {
    set.add(username)
    set.add(username.toLowerCase())
  }

  for (const id of loadStudentBookedIdentities()) {
    set.add(id)
    set.add(id.toLowerCase())
  }

  return Array.from(set).filter(Boolean)
}

function isCachedMyBookedSlot(slot: AppointmentSlot): boolean {
  const id = String(slot.slotId || '').trim()
  if (!id) return false
  return loadCachedStudentBookedSlots().some((row) => row.slotId === id)
}

function slotBelongsToCurrentStudent(slot: AppointmentSlot): boolean {
  const assigned = String(slot.studentId || '').trim()
  if (!assigned) return false

  const aliases = getCurrentStudentAliases()
  return aliases.includes(assigned) || aliases.includes(assigned.toLowerCase())
}

function isBookableSlot(slot: AppointmentSlot): boolean {
  if (!slot.slotId) return false
  if (isCachedMyBookedSlot(slot)) return false

  const status = String(slot.status || '').trim().toUpperCase()
  if (['BOOKED', 'CONFIRMED', 'CANCELLED', 'CANCELED', 'UNAVAILABLE', 'DISABLED'].includes(status)) {
    return false
  }

  const assignedStudent = String(slot.studentId || '').trim()
  if (assignedStudent && !slotBelongsToCurrentStudent(slot)) {
    return false
  }

  return true
}

function isMyBookedSlot(slot: AppointmentSlot): boolean {
  const status = String(slot.status || '').trim().toUpperCase()
  const booked =
    ['BOOKED', 'CONFIRMED', 'RESERVED', 'OCCUPIED'].includes(status) || isCachedMyBookedSlot(slot)

  if (!booked) return false

  if (slotBelongsToCurrentStudent(slot)) return true

  // Confirm API may return a different studentId than username; cache marks ownership by slotId.
  return isCachedMyBookedSlot(slot)
}

function statusText(status: unknown, slot?: AppointmentSlot): string {
  if (slot && isMyBookedSlot(slot)) return 'BOOKED'
  const text = String(status || '').trim()
  return text || 'AVAILABLE'
}

function formatVenue(venue: unknown): string {
  const text = String(venue ?? '').trim()
  return text || 'To be confirmed'
}

function displaySlotStudent(slot: AppointmentSlot): string {
  if (isMyBookedSlot(slot)) return 'You (booked)'
  const sid = String(slot.studentId || '').trim()
  return sid || '-'
}

function statusPillClass(slot: AppointmentSlot): string {
  const status = String(slot.status || '').trim().toUpperCase()
  if (['BOOKED', 'CONFIRMED'].includes(status) || isMyBookedSlot(slot)) return 'booked'
  return 'available'
}

function slotKey(slot: AppointmentSlot): string {
  return String(slot.slotId || `${slot.slotDate || ''}-${slot.startTime || ''}-${slot.endTime || ''}`)
}

function extractMentors(data: any): MentorRow[] {
  const raw =
    Array.isArray(data?.mentor)
      ? data.mentor
      : data?.mentor
        ? [data.mentor]
        : Array.isArray(data?.mentors)
          ? data.mentors
          : Array.isArray(data)
            ? data
            : []

  return raw.filter(Boolean).map((item: any) => ({
    ...item,
    id: String(item?.id ?? item?.mentorId ?? item?.userId ?? item?.username ?? ''),
    mentorId: String(item?.mentorId ?? item?.id ?? item?.userId ?? item?.username ?? ''),
    username: item?.username,
    realName: item?.realName ?? item?.mentorName ?? item?.name,
    name: item?.name ?? item?.realName ?? item?.mentorName,
    email: item?.email ?? null,
    phone: item?.phone ?? null,
  }))
}

function looksLikeSysId(value: string): boolean {
  const id = value.trim()
  if (/^[0-9a-f]{32}$/i.test(id)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true
  return id.length >= 20 && !id.includes('_') && /^[0-9a-f]+$/i.test(id)
}

function mentorIdCandidates(row: MentorRow): string[] {
  const raw = [row.mentorId, row.id, row.userId, row.username]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  const unique = Array.from(new Set(raw))
  return unique.sort((a, b) => {
    const score = (value: string) => (looksLikeSysId(value) ? 0 : 1)
    return score(a) - score(b)
  })
}

async function loadSlotsWithFallback(candidates: string[]): Promise<AppointmentSlot[]> {
  let lastError: unknown
  let merged: AppointmentSlot[] = []
  const aliases = candidates

  for (const id of candidates) {
    try {
      const rows = await getStudentMentorAppointmentSlots(id, aliases)
      if (rows.length > 0) {
        merged = mergeStudentAppointmentSlots(merged, rows)
      }
    } catch (e) {
      lastError = e
    }
  }

  const cachedForMentor = loadCachedStudentBookedSlots().filter((slot) => {
    const mid = String(slot.mentorId || '').trim()
    return !mid || aliases.includes(mid)
  })

  if (merged.length > 0 || cachedForMentor.length > 0) {
    return mergeStudentAppointmentSlots(merged, cachedForMentor)
  }

  throw lastError || new Error('Failed to load appointment slots.')
}

async function load() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const mentorData = await getMyMentor()
    const rows = extractMentors(mentorData)
    mentor.value = rows[0] || null

    if (!mentor.value) {
      allSlots.value = []
      error.value = 'No mentor assigned yet.'
      return
    }

    const candidates = mentorIdCandidates(mentor.value)
    if (candidates.length === 0) {
      allSlots.value = []
      error.value = 'Mentor ID is missing.'
      return
    }

    allSlots.value = await loadSlotsWithFallback(candidates)
  } catch (e: any) {
    error.value = e.message || 'Failed to load appointment slots.'
  } finally {
    loading.value = false
  }
}

async function confirm(slotId: string) {
  if (!slotId) return
  if (!window.confirm('Confirm this interview appointment?')) return

  bookingSlotId.value = slotId
  error.value = ''
  success.value = ''

  try {
    const mentorIds = mentor.value ? mentorIdCandidates(mentor.value) : []
    await confirmAppointmentSlot(slotId, {
      mentorId: mentorIds[0],
      studentId: currentStudentId.value,
    })
    success.value = 'Appointment confirmed. Venue will appear here after your mentor saves it.'
    await load()
  } catch (e: any) {
    error.value = e.message || 'Confirmation failed.'
  } finally {
    bookingSlotId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1050px; margin: 0 auto; padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.header h1 { margin: 0 0 6px; }
.header p { margin: 0; color: #6b7280; max-width: 720px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.hint { margin: 0 0 12px; color: #6b7280; font-size: 14px; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 18px; }
.info-grid p { margin: 4px 0; }
.table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; vertical-align: top; }
th { background: #f8fafc; }
.actions { white-space: nowrap; }
.refresh-btn {
  min-width: 88px;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #111827;
  font-weight: 600;
  cursor: pointer;
}
.refresh-btn:hover:not(:disabled) { background: #e2e8f0; }
.refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }
button.primary {
  padding: 8px 14px;
  border: 1px solid #1f6feb;
  border-radius: 8px;
  background: #1f6feb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
button.primary:disabled { opacity: 0.55; cursor: not-allowed; }
.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
}
.status-pill.booked {
  background: #dbeafe;
  color: #1d4ed8;
}
.error { margin: 12px 0; color: #b42318; }
.success { margin: 12px 0; color: #047857; }
.empty { text-align: center; color: #777; }
.hint code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
tr.mine {
  background: #eff6ff;
}
</style>
