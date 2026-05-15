<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Mentor Search Result</h1>
        <p class="desc">Select a group ID and click Show Members.</p>
      </div>

      <button class="secondary" @click="searchAgain">Search Again</button>
    </div>

    <table v-if="results.length > 0">
      <thead>
      <tr>
        <th>Select</th>
        <th>Mentor ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Office</th>
        <th>Major</th>
        <th>Group ID</th>
      </tr>
      </thead>

      <tbody>
      <tr v-for="mentor in results" :key="mentor.mentorId">
        <td>
          <input v-model="selectedGroupId" type="radio" :value="mentor.groupId" />
        </td>
        <td>{{ mentor.mentorId }}</td>
        <td>{{ mentor.name }}</td>
        <td>{{ mentor.email }}</td>
        <td>{{ mentor.office }}</td>
        <td>{{ mentor.major }}</td>
        <td>{{ mentor.groupId }}</td>
      </tr>
      </tbody>
    </table>

    <p v-else class="empty">No mentor information found.</p>

    <div class="actions">
      <button @click="showMembers">Show Members</button>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mentors } from '../data/mockData'

const route = useRoute()
const router = useRouter()

const selectedGroupId = ref('')
const message = ref('')

const results = computed(() => {
  const name = String(route.query.name || '').trim().toLowerCase()
  const email = String(route.query.email || '').trim().toLowerCase()
  const groupId = String(route.query.groupId || '').trim().toUpperCase()

  return mentors.filter((mentor) => {
    const matchName = name && mentor.name.toLowerCase().includes(name)
    const matchEmail = email && mentor.email.toLowerCase() === email
    const matchGroup = groupId && mentor.groupId === groupId

    return matchName || matchEmail || matchGroup
  })
})

function showMembers() {
  message.value = ''

  if (!selectedGroupId.value) {
    message.value = 'Warning: Please select a group ID first.'
    return
  }

  sessionStorage.setItem(
    'lastMentorSearchQuery',
    JSON.stringify({
      name: route.query.name || '',
      email: route.query.email || '',
      groupId: route.query.groupId || '',
    }),
  )

  router.push(`/group-members/${selectedGroupId.value}`)
}

function searchAgain() {
  router.push('/search-mentor')
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 22px;
}

th,
td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

th {
  background: #f3f4f6;
}

.actions {
  margin-top: 20px;
}

.actions button {
  margin-right: 10px;
}

.error {
  margin-top: 14px;
  color: #dc2626;
}

.empty {
  color: #6b7280;
}
</style>
