<template>
  <section class="page">
    <h1>My Mentor</h1>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="card" v-if="groupStatus">
      <h2>Group Status</h2>
      <p><strong>Group ID:</strong> {{ groupStatus.groupId || '-' }}</p>
      <p><strong>Major ID:</strong> {{ groupStatus.majorId || '-' }}</p>
      <p><strong>Status:</strong> {{ groupStatus.status || '-' }}</p>
    </div>

    <div class="card" v-if="mentors.length">
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
          <tr v-for="m in mentors" :key="m.id">
            <td>{{ m.realName || '-' }}</td>
            <td>{{ m.username || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.phone || '-' }}</td>
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
          <tr v-for="r in records" :key="r.recordId">
            <td>{{ r.interviewDate || '-' }}</td>
            <td>{{ r.interviewTime || '-' }}</td>
            <td>{{ r.problemStatement || '-' }}</td>
            <td>{{ r.interviewSummary || '-' }}</td>
            <td>{{ r.followupAction || '-' }}</td>
          </tr>
          <tr v-if="records.length === 0">
            <td colspan="5" class="empty">No records.</td>
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

const groupStatus = ref<any>(null)
const mentors = ref<any[]>([])
const records = ref<InterviewRecord[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    const [mentorData, statusData, recordData] = await Promise.all([
      getMyMentor(),
      getMyGroupStatus(),
      getMyRecordsAsStudent(),
    ])

    groupStatus.value = statusData
    mentors.value = Array.isArray(mentorData?.mentor) ? mentorData.mentor : mentorData?.mentor ? [mentorData.mentor] : []
    records.value = recordData
  } catch (e: any) {
    error.value = e.message || 'Failed to load mentor information.'
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
