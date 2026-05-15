<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Mentor Search Result</h1>
        <p class="desc">Select a mentor and click Show Members to view group members.</p>
      </div>
      <button class="secondary" @click="searchAgain">Search Again</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <table v-else-if="results.length > 0">
      <thead>
        <tr>
          <th>Select</th>
          <th>Mentor ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Office</th>
          <th>Department</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in results" :key="m.mentorId">
          <td><input v-model="selectedMentorId" type="radio" :value="m.mentorId" /></td>
          <td>{{ m.mentorId }}</td>
          <td>{{ m.mentorName }}</td>
          <td>{{ m.email }}</td>
          <td>{{ m.office }}</td>
          <td>{{ m.departmentName }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">No mentor information found. Please go back and search again.</p>

    <div class="actions">
      <button @click="showMembers">Show Members</button>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole } from '../types'
import { getMentorsByOrg, searchAllMentors } from '../api/org'
import type { MentorFromApi } from '../api/org'

const route = useRoute()
const router = useRouter()
const role = getRole()

const selectedMentorId = ref('')
const message = ref('')
const results = ref<MentorFromApi[]>([])
const isLoading = ref(true)

onMounted(async () => {
  const kw = String(route.query.keyword || route.query.name || '').trim()
  try {
    if (role === 'consultant') {
      results.value = await searchAllMentors(kw || undefined)
    } else {
      const orgId = String(route.query.orgId || '').trim()
      if (orgId) {
        results.value = await getMentorsByOrg(orgId, kw || undefined)
      }
    }
  } catch { /* ignore */ }
  isLoading.value = false
})

function showMembers() {
  message.value = ''
  if (!selectedMentorId.value) {
    message.value = 'Warning: Please select a group ID first.'
    return
  }
  router.push(`/group-members/${selectedMentorId.value}`)
}

function searchAgain() { router.push('/search-mentor') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; }
table { width: 100%; border-collapse: collapse; margin-top: 22px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }
.actions { margin-top: 20px; }
.actions button { margin-right: 10px; }
.error { margin-top: 14px; color: #dc2626; }
.empty { color: #6b7280; }
.loading { color: #6b7280; padding: 40px; text-align: center; }
</style>
