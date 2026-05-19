<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Interview Arrangement</h1>
        <p class="desc">Mark available 30-min time slots and send an interview invitation.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <!-- Select student -->
      <div class="form-item">
        <label>Select Student</label>
        <select v-model="studentId">
          <option value="">-- Choose a student --</option>
          <option
              v-for="s in studentList"
              :key="s.studentId"
              :value="s.studentId"
          >
            {{ s.name }} ({{ s.studentId }})
          </option>
        </select>
      </div>

      <!-- Add slot -->
      <div class="form-item">
        <label>Mark Available Time Slots (30 mins each)</label>
        <div class="slot-input">
          <input type="date" v-model="slotDate" />
          <input type="time" v-model="slotTime" step="1800" />
          <button @click="addSlot">Add</button>
        </div>
        <small>Each slot is 30 minutes long.</small>
      </div>

      <!-- Current slots -->
      <div v-if="slots.length > 0" class="form-item">
        <label>Current marked slots:</label>
        <ul class="slot-list">
          <li v-for="(slot, idx) in slots" :key="idx">
            <span>{{ slot.date }} {{ slot.time }} - {{ endTime(slot.time) }}</span>
            <button class="remove-btn" @click="removeSlot(idx)">✕</button>
          </li>
        </ul>
      </div>

      <p v-else class="empty">No slots added yet.</p>

      <div class="buttons">
        <button :disabled="isLoading" @click="sendInvitation">
          {{ isLoading ? 'Sending...' : 'Send Invitation' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
        <button
            v-if="hasConfirmed"
            class="link-btn"
            @click="goToVenue"
        >
          → Confirm Venue (Step 2)
        </button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendInterviewInvitation, getMyInvitations } from '../../api/communication'
import type { InterviewSlot } from '../../api/communication'

const router = useRouter()

const studentId = ref('')
const slotDate = ref('')
const slotTime = ref('')
const slots = ref<InterviewSlot[]>([])
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

const hasConfirmed = ref(false)

const studentList = ref([
  { studentId: '123456789', name: 'Bnbuer' },
  { studentId: '987654321', name: 'Uicer' },
  { studentId: '210000001', name: 'Sugar' },
])

onMounted(async () => {
  /**
   * 检查是否已经有学生确认过时间槽，
   * 是的话允许进入"Step 2: Confirm Venue"页面。
   */
  try {
    const invitations = await getMyInvitations()
    hasConfirmed.value = invitations.some((inv) => inv.status === 'student_confirmed')
  } catch {
    // ignore — non-critical
  }
})

function endTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 30
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function addSlot() {
  message.value = ''
  isError.value = false

  if (!slotDate.value || !slotTime.value) {
    message.value = 'Warning: Please pick both date and time.'
    isError.value = true
    return
  }

  // Check duplicate
  const exists = slots.value.some(
      (s) => s.date === slotDate.value && s.time === slotTime.value,
  )
  if (exists) {
    message.value = 'Warning: This slot is already added.'
    isError.value = true
    return
  }

  slots.value.push({ date: slotDate.value, time: slotTime.value })
}

function removeSlot(idx: number) {
  slots.value.splice(idx, 1)
}

async function sendInvitation() {
  message.value = ''
  isError.value = false

  if (!studentId.value) {
    message.value = 'Warning: Please select a student.'
    isError.value = true
    return
  }

  if (slots.value.length === 0) {
    message.value = 'Warning: Please add at least one time slot.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    await sendInterviewInvitation(studentId.value, slots.value)
    message.value =
        'Interview invitation sent. The student will be notified by email and ' +
        'will choose a slot in the system.'
    slots.value = []
    studentId.value = ''
  } catch (err: any) {
    message.value = err.message || 'Failed to send invitation.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goToVenue() {
  router.push('/mentor/interview-arrangement/venue')
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 600px; margin-top: 22px; }
.form-item { margin-top: 18px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }

select, input {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-family: inherit;
}

.slot-input { display: flex; gap: 10px; }
.slot-input input { flex: 1; }
.slot-input button { white-space: nowrap; }

small { color: #6b7280; }

.slot-list { list-style: none; padding: 0; margin-top: 10px; }
.slot-list li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px; background: #f9fafb; border-radius: 6px;
  margin-bottom: 6px;
}
.remove-btn {
  background: transparent; color: #dc2626;
  border: none; cursor: pointer; padding: 0 6px; font-size: 16px;
}

.empty { color: #6b7280; }
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.link-btn { background: transparent; color: #2563eb; padding: 6px 0; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
