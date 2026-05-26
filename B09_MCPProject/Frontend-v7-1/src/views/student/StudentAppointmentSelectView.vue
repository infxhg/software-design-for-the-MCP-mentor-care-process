<template>
  <section class="page">
    <div class="header">
      <div>
        <h1>Select Interview Appointment</h1>
        <p>Book one available 30-minute interview slot from your assigned mentor.</p>
      </div>
      <button :disabled="loading" @click="load">
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

    <div class="card">
      <h2>Available Slots</h2>

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
            <td>{{ statusText(s.status) }}</td>
            <td>{{ s.venue || 'To be confirmed' }}</td>
            <td class="actions">
              <button
                class="primary"
                :disabled="bookingSlotId === s.slotId || !s.slotId"
                @click="confirm(s.slotId)"
              >
                {{ bookingSlotId === s.slotId ? 'Booking...' : 'Book' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && availableSlots.length === 0">
            <td colspan="5" class="empty">No available slots.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="5" class="empty">Loading slots...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" v-if="allSlots.length">
      <h2>All Slots From This Mentor</h2>
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
          <tr v-for="s in allSlots" :key="`all-${slotKey(s)}`">
            <td>{{ s.slotDate || '-' }}</td>
            <td>
              {{ s.startTime || '-' }}
              <span v-if="s.endTime"> - {{ s.endTime }}</span>
            </td>
            <td>{{ statusText(s.status) }}</td>
            <td>{{ s.studentId || '-' }}</td>
            <td>{{ s.venue || '-' }}</td>
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

interface MentorRow {
  id?: string
  mentorId?: string
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

const availableSlots = computed(() =>
  allSlots.value
    .filter(isBookableSlot)
    .sort((a, b) =>
      `${a.slotDate || ''} ${a.startTime || ''}`.localeCompare(`${b.slotDate || ''} ${b.startTime || ''}`),
    ),
)

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

function mentorIdCandidates(row: MentorRow): string[] {
  return Array.from(
    new Set(
      [
        row.mentorId,
        row.id,
        row.userId,
        row.username,
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  )
}

function isBookableSlot(slot: AppointmentSlot): boolean {
  if (!slot.slotId) return false
  if (slot.studentId) return false

  const status = String(slot.status || '').trim().toUpperCase()
  if (!status) return true

  return !['BOOKED', 'CONFIRMED', 'CANCELLED', 'CANCELED', 'UNAVAILABLE', 'DISABLED'].includes(status)
}

function statusText(status: unknown): string {
  const text = String(status || '').trim()
  return text || 'AVAILABLE'
}

function slotKey(slot: AppointmentSlot): string {
  return String(slot.slotId || `${slot.slotDate || ''}-${slot.startTime || ''}-${slot.endTime || ''}`)
}

async function loadSlotsWithFallback(candidates: string[]): Promise<AppointmentSlot[]> {
  let lastError: unknown

  for (const id of candidates) {
    try {
      const rows = await getMentorAppointmentSlots(id)
      return rows || []
    } catch (e) {
      lastError = e
    }
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
  if (!window.confirm('Book this appointment slot?')) return

  bookingSlotId.value = slotId
  error.value = ''
  success.value = ''

  try {
    await confirmAppointmentSlot(slotId)
    success.value = 'Appointment confirmed.'
    await load()
  } catch (e: any) {
    error.value = e.message || 'Booking failed.'
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
.header p { margin: 0; color: #6b7280; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 18px; }
.info-grid p { margin: 4px 0; }
.table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; vertical-align: top; }
th { background: #f8fafc; }
.actions { white-space: nowrap; }
button { padding: 7px 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { margin: 12px 0; color: #b42318; }
.success { margin: 12px 0; color: #047857; }
.empty { text-align: center; color: #777; }
</style>
