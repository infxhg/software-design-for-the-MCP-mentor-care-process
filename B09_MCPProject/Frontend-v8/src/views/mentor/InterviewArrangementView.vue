<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Interview Arrangement</h1>
        <p class="desc">
          Arrange a 30-minute interview for a student, set the venue, and track booking status below.
        </p>
      </div>
      <div class="actions">
        <button type="button" class="secondary" @click="goVenue">Venue Only Page</button>
        <button type="button" class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <section class="card">
      <h2>Arrange Interview</h2>
      <p class="hint">
        Fill in the same fields as the table below. After saving, the student can confirm the slot
        from <strong>Select Interview Appointment</strong>.
      </p>

      <div class="form-grid">
        <div class="form-item">
          <label>Date</label>
          <input v-model="slotDate" type="date" />
        </div>

        <div class="form-item">
          <label>Start Time</label>
          <input v-model="slotTime" type="time" step="1800" />
        </div>

        <div class="form-item span-2 student-picker">
          <label>Student</label>
          <div class="picker-shell">
            <input
              v-model="studentQuery"
              placeholder="Type student ID or name, pick from suggestions, or press Enter to search"
              autocomplete="off"
              @focus="studentPickerOpen = true"
              @input="onStudentQueryInput"
              @keydown.enter.prevent="() => resolveStudentSelection()"
              @blur="onStudentBlur"
            />

            <ul v-if="studentPickerOpen && filteredStudentOptions.length" class="picker-list">
              <li
                v-for="student in filteredStudentOptions"
                :key="student.studentId"
                @mousedown.prevent="pickStudent(student)"
              >
                {{ formatStudentLabel(student) }}
              </li>
            </ul>

            <p v-if="selectedStudentId" class="picker-hint">
              Selected: {{ selectedStudentLabel }}
            </p>
          </div>
        </div>

        <div class="form-item span-2">
          <label>Venue (optional)</label>
          <input v-model.trim="venueDraft" placeholder="Room 101" />
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <button
        type="button"
        class="primary save-button"
        :disabled="submitting || resolvingStudent || !slotDate || !slotTime || !selectedStudentId"
        @click="saveInterviewSlot"
      >
        {{ submitting ? 'Saving...' : 'Save Interview Slot' }}
      </button>
    </section>

    <section class="card">
      <div class="bar">
        <div>
          <h2>My Interview Slots</h2>
          <p class="hint">
            Student shows as invited until they book. Booked slots can receive or update a venue.
          </p>
        </div>
        <button type="button" class="secondary" :disabled="loadingSlots" @click="() => loadSlots()">
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
                {{ displayStatus(slot) }}
              </span>
            </td>
            <td>{{ displayStudent(slot) }}</td>
            <td>
              <input
                v-model.trim="venues[slot.slotId]"
                :placeholder="slot.venue || 'Room 101'"
              />
            </td>
            <td class="op-cell">
              <button
                type="button"
                class="primary small"
                :disabled="savingVenueId === slot.slotId || !venues[slot.slotId]"
                @click="saveVenue(slot)"
              >
                {{ savingVenueId === slot.slotId ? 'Saving...' : 'Save Venue' }}
              </button>
              <button
                type="button"
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
  getMyInterviewRecords,
  listMyMentorAppointmentSlots,
  lookupStudent,
  setAppointmentVenue,
  tagMentorSlotInvitation,
  upsertCachedMentorSlot,
  type AppointmentSlot,
} from '../../api/mentoring'
import { sendNormalMessage } from '../../api/communication'

type StudentOption = {
  studentId: string
  name?: string
  realName?: string
}

const router = useRouter()

const slotDate = ref('')
const slotTime = ref('')
const venueDraft = ref('')
const mySlots = ref<AppointmentSlot[]>([])

const submitting = ref(false)
const loadingSlots = ref(false)
const savingVenueId = ref('')
const cancellingSlotId = ref('')

const message = ref('')
const isError = ref(false)
const slotLoadMessage = ref('')
const isSlotLoadError = ref(false)

const studentQuery = ref('')
const studentOptions = ref<StudentOption[]>([])
const selectedStudentId = ref('')
const studentPickerOpen = ref(false)
const resolvingStudent = ref(false)

const venues = reactive<Record<string, string>>({})

const filteredStudentOptions = computed(() => {
  const query = studentQuery.value.trim().toLowerCase()
  const rows = query
    ? studentOptions.value.filter((student) => {
        const label = formatStudentLabel(student).toLowerCase()
        return (
          student.studentId.toLowerCase().includes(query) ||
          label.includes(query) ||
          String(student.name || '').toLowerCase().includes(query) ||
          String(student.realName || '').toLowerCase().includes(query)
        )
      })
    : studentOptions.value

  return rows.slice(0, 20)
})

const selectedStudentLabel = computed(() => {
  const student = studentOptions.value.find((row) => row.studentId === selectedStudentId.value)
  return student ? formatStudentLabel(student) : selectedStudentId.value
})

const sortedSlots = computed(() => {
  return [...mySlots.value].sort((a, b) => {
    const left = `${a.slotDate || ''} ${a.startTime || ''}`
    const right = `${b.slotDate || ''} ${b.startTime || ''}`
    return left.localeCompare(right)
  })
})

onMounted(async () => {
  await Promise.all([loadSlots(true), loadStudentOptions()])
})

async function loadStudentOptions() {
  const map = new Map<string, StudentOption>()

  try {
    const records = await getMyInterviewRecords()
    for (const record of records) {
      const studentId = String(record.studentId || '').trim()
      if (!studentId) continue
      map.set(studentId, { studentId })
    }
  } catch {
    // ignore
  }

  studentOptions.value = [...map.values()].sort((a, b) => a.studentId.localeCompare(b.studentId))
}

async function saveInterviewSlot() {
  clearCreateMessage()

  if (!selectedStudentId.value && studentQuery.value.trim()) {
    await resolveStudentSelection()
  }

  const date = slotDate.value
  const startTime = normalizeHalfHourTime(slotTime.value)
  const studentId = selectedStudentId.value.trim()
  const venue = venueDraft.value.trim()

  if (!date) {
    showCreateError('Please select interview date.')
    return
  }

  if (date < todayText()) {
    showCreateError('Interview date cannot be earlier than today.')
    return
  }

  if (!startTime) {
    showCreateError('Start time must be on a 30-minute boundary, for example 09:00 or 09:30.')
    return
  }

  if (!studentId) {
    showCreateError('Please select a student.')
    return
  }

  submitting.value = true

  try {
    const createdRows = await createAppointmentSlots({
      slotDate: date,
      startTimes: [startTime],
    })

    const slot = createdRows[0]
    if (!slot?.slotId) {
      throw new Error('Backend did not return slotId.')
    }

    const studentName =
      studentOptions.value.find((row) => row.studentId === studentId)?.name ||
      studentOptions.value.find((row) => row.studentId === studentId)?.realName

    tagMentorSlotInvitation(slot.slotId, studentId, studentName)

    let savedSlot: AppointmentSlot = {
      ...slot,
      invitedStudentId: studentId,
      invitedStudentName: studentName || studentId,
    }

    if (venue) {
      savedSlot = await setAppointmentVenue(slot.slotId, venue)
      savedSlot = {
        ...savedSlot,
        invitedStudentId: studentId,
        invitedStudentName: studentName || studentId,
      }
      upsertCachedMentorSlot(savedSlot)
    }

    try {
      const endTime = savedSlot.endTime || addThirtyMinutes(startTime)
      await sendNormalMessage(
        studentId,
        [
          'Interview appointment invitation:',
          `Date: ${date}`,
          `Time: ${startTime}${endTime ? ` - ${endTime}` : ''}`,
          venue ? `Venue: ${venue}` : 'Venue: to be confirmed',
          'Please confirm this slot from your "Select Interview Appointment" page.',
        ].join('\n'),
      )
    } catch {
      // slot is already saved; message failure should not block the mentor flow
    }

    mySlots.value = await listMyMentorAppointmentSlots()
    syncVenueInputs()

    message.value = `Interview slot saved for ${studentId}.`
    isError.value = false
    slotDate.value = ''
    slotTime.value = ''
    venueDraft.value = ''
    studentQuery.value = ''
    selectedStudentId.value = ''
  } catch (err: any) {
    showCreateError(toFriendlyError(err, 'Failed to save interview slot.'))
  } finally {
    submitting.value = false
  }
}

async function loadSlots(silent = false) {
  slotLoadMessage.value = ''
  isSlotLoadError.value = false
  loadingSlots.value = true

  try {
    mySlots.value = await listMyMentorAppointmentSlots()
    syncVenueInputs()

    if (!silent && mySlots.value.length === 0) {
      slotLoadMessage.value = 'No slots yet. Arrange an interview above.'
    }
  } catch (err: any) {
    if (!silent) {
      slotLoadMessage.value = toFriendlyError(err, 'Failed to load slots.')
      isSlotLoadError.value = true
    }
  } finally {
    loadingSlots.value = false
  }
}

function syncVenueInputs() {
  mySlots.value.forEach((slot) => {
    if (slot.slotId) venues[slot.slotId] = slot.venue || venues[slot.slotId] || ''
  })
}

function isBooked(slot: AppointmentSlot): boolean {
  const status = String(slot.status || '').toUpperCase()
  return Boolean(slot.studentId) || ['BOOKED', 'CONFIRMED', 'RESERVED', 'OCCUPIED'].includes(status)
}

function displayStatus(slot: AppointmentSlot): string {
  if (isBooked(slot)) return slot.status || 'BOOKED'
  if (slot.invitedStudentId) return 'INVITED'
  return slot.status || 'AVAILABLE'
}

function statusClass(slot: AppointmentSlot): string {
  if (isBooked(slot)) return 'booked'
  if (slot.invitedStudentId) return 'invited'
  return 'available'
}

function displayStudent(slot: AppointmentSlot): string {
  if (slot.studentId) return String(slot.studentId)
  if (slot.invitedStudentId) {
    const name = slot.invitedStudentName ? ` (${slot.invitedStudentName})` : ''
    return `${slot.invitedStudentId}${name} · invited`
  }
  return '-'
}

async function saveVenue(slot: AppointmentSlot) {
  const venue = venues[slot.slotId]?.trim()
  if (!venue) {
    window.alert('Please enter a venue.')
    return
  }

  savingVenueId.value = slot.slotId

  try {
    const updated = await setAppointmentVenue(slot.slotId, venue)
    const index = mySlots.value.findIndex((row) => row.slotId === slot.slotId)
    if (index >= 0) {
      mySlots.value[index] = {
        ...mySlots.value[index],
        ...updated,
        venue,
        invitedStudentId: mySlots.value[index]?.invitedStudentId,
        invitedStudentName: mySlots.value[index]?.invitedStudentName,
      }
    }
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Save venue failed.'))
  } finally {
    savingVenueId.value = ''
  }
}

function formatStudentLabel(student: StudentOption): string {
  const name = student.name || student.realName
  return name ? `${student.studentId} - ${name}` : student.studentId
}

function pickStudent(student: StudentOption) {
  selectedStudentId.value = student.studentId
  studentQuery.value = formatStudentLabel(student)
  studentPickerOpen.value = false
}

function onStudentQueryInput() {
  const query = studentQuery.value.trim()
  const matched = studentOptions.value.find(
    (student) =>
      student.studentId === query || formatStudentLabel(student).toLowerCase() === query.toLowerCase(),
  )
  selectedStudentId.value = matched?.studentId || ''
  studentPickerOpen.value = true
}

function onStudentBlur() {
  window.setTimeout(async () => {
    studentPickerOpen.value = false
    if (!selectedStudentId.value && studentQuery.value.trim()) {
      await resolveStudentSelection(true)
    }
  }, 150)
}

async function resolveStudentSelection(silent = false) {
  const query = studentQuery.value.trim()
  if (!query) {
    selectedStudentId.value = ''
    return
  }

  const exact = studentOptions.value.find(
    (student) =>
      student.studentId === query ||
      formatStudentLabel(student).toLowerCase() === query.toLowerCase(),
  )
  if (exact) {
    pickStudent(exact)
    return
  }

  if (filteredStudentOptions.value.length === 1) {
    pickStudent(filteredStudentOptions.value[0]!)
    return
  }

  resolvingStudent.value = true

  try {
    const student = await lookupStudent(query)
    if (!student) {
      selectedStudentId.value = ''
      if (!silent) showCreateError('Student not found in your groups.')
      return
    }

    const option: StudentOption = {
      studentId: String(student.studentId || query),
      name: student.name || student.realName || undefined,
      realName: student.realName || student.name || undefined,
    }

    if (!studentOptions.value.some((row) => row.studentId === option.studentId)) {
      studentOptions.value = [...studentOptions.value, option].sort((a, b) =>
        a.studentId.localeCompare(b.studentId),
      )
    }

    pickStudent(option)
    if (!silent) {
      message.value = `Student ${option.studentId} selected.`
      isError.value = false
    }
  } catch (err: any) {
    selectedStudentId.value = ''
    if (!silent) showCreateError(toFriendlyError(err, 'Student search failed.'))
  } finally {
    resolvingStudent.value = false
  }
}

async function cancelSlot(slot: AppointmentSlot) {
  const ok = window.confirm(`Cancel slot ${slot.slotDate} ${slot.startTime}?`)
  if (!ok) return

  cancellingSlotId.value = slot.slotId

  try {
    await cancelAppointmentSlot(slot.slotId)
    mySlots.value = mySlots.value.filter((row) => row.slotId !== slot.slotId)
    delete venues[slot.slotId]
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Cancel slot failed.'))
  } finally {
    cancellingSlotId.value = ''
  }
}

function normalizeHalfHourTime(value: string): string {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/)
  if (!match) return ''
  const minutes = match[2]
  if (minutes !== '00' && minutes !== '30') return ''
  return `${match[1]}:${minutes}`
}

function todayText(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

.student-picker {
  position: relative;
}

.picker-shell {
  position: relative;
}

.picker-list {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.picker-list li {
  padding: 9px 12px;
  cursor: pointer;
}

.picker-list li:hover {
  background: #eff6ff;
}

.picker-hint {
  margin: 8px 0 0;
  color: #047857;
  font-size: 13px;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.form-item.span-2 {
  grid-column: span 2;
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

.page-card button {
  padding: 9px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.page-card button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-card button.primary {
  background: #2563eb;
  border: 1px solid #2563eb;
  color: #fff;
}

.page-card button.secondary {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #1e293b;
}

.page-card button.danger {
  background: #dc2626;
  border: 1px solid #dc2626;
  color: #fff;
}

.small {
  padding: 6px 10px;
  font-size: 12px;
}

.save-button {
  margin-top: 16px;
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

.status.invited {
  background: #fef3c7;
  color: #92400e;
}

.status.booked {
  background: #dbeafe;
  color: #1d4ed8;
}

@media (max-width: 900px) {
  .header,
  .form-grid,
  .bar,
  .op-cell {
    align-items: stretch;
    flex-direction: column;
  }

  .form-item.span-2 {
    grid-column: span 1;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
