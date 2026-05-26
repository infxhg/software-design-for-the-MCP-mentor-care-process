<template>
  <section class="page">
    <div class="header">
      <div>
        <h1>My Mentor</h1>
        <p>View your group status, assigned mentor, and interview history.</p>
      </div>
      <button :disabled="loading" @click="load">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card" v-if="groupStatus">
      <h2>Group Status</h2>
      <div class="info-grid">
        <p><strong>Group ID:</strong> {{ groupStatus.groupId || '-' }}</p>
        <p><strong>Major ID:</strong> {{ groupStatus.majorId || '-' }}</p>
        <p><strong>Status:</strong> {{ groupStatus.status || '-' }}</p>
      </div>
    </div>

    <div class="card">
      <h2>Mentor Information</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mentors" :key="mentorKey(m)">
            <td>{{ m.realName || m.name || '-' }}</td>
            <td>{{ m.username || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.phone || '-' }}</td>
          </tr>
          <tr v-if="!loading && mentors.length === 0">
            <td colspan="4" class="empty">No mentor assigned yet.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="4" class="empty">Loading mentor information...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>My Interview Records</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Problem</th>
            <th>Summary</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="String(r.recordId || r.id)">
            <td>{{ r.interviewDate || '-' }}</td>
            <td>{{ r.interviewTime || '-' }}</td>
            <td>{{ r.problemStatement || '-' }}</td>
            <td>{{ r.interviewSummary || '-' }}</td>
            <td>{{ r.followupAction || r.followUpAction || '-' }}</td>
          </tr>
          <tr v-if="!loading && records.length === 0">
            <td colspan="5" class="empty">No records.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="5" class="empty">Loading records...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getMyGroupStatus,
  getMyMentor,
  getMyRecordsAsStudent,
  type InterviewRecord,
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

const groupStatus = ref<any>(null)
const mentors = ref<MentorRow[]>([])
const records = ref<InterviewRecord[]>([])
const loading = ref(false)
const error = ref('')

function normalizeMentors(data: any): MentorRow[] {
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

function mentorKey(row: MentorRow): string {
  return String(row.id || row.mentorId || row.userId || row.username || row.email || Math.random())
}

async function load() {
  loading.value = true
  error.value = ''

  const errors: string[] = []

  try {
    const mentorResult = await Promise.allSettled([
      getMyMentor(),
      getMyGroupStatus(),
      getMyRecordsAsStudent(),
    ])

    const mentorData = mentorResult[0]
    const statusData = mentorResult[1]
    const recordData = mentorResult[2]

    if (mentorData.status === 'fulfilled') {
      mentors.value = normalizeMentors(mentorData.value)
      if (!groupStatus.value && mentorData.value?.groupId) {
        groupStatus.value = { groupId: mentorData.value.groupId }
      }
    } else {
      mentors.value = []
      errors.push(mentorData.reason?.message || 'Failed to load mentor information.')
    }

    if (statusData.status === 'fulfilled') {
      groupStatus.value = {
        ...(groupStatus.value || {}),
        ...(statusData.value || {}),
      }
    } else {
      errors.push(statusData.reason?.message || 'Failed to load group status.')
    }

    if (recordData.status === 'fulfilled') {
      records.value = recordData.value || []
    } else {
      records.value = []
      errors.push(recordData.reason?.message || 'Failed to load interview records.')
    }

    error.value = errors.join(' ')
  } finally {
    loading.value = false
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
.table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; vertical-align: top; }
th { background: #f8fafc; }
button { padding: 7px 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.error { margin: 12px 0; color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
