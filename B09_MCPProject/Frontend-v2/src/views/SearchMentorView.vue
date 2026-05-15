<template>
  <div class="page-card">
    <h1>Search Mentor Info</h1>
    <p class="desc">
      Faculty Consultants and MCP Coordinators can search mentor information by mentor name, email, or group ID.
    </p>

    <div class="form">
      <!-- Coordinator needs to specify their department -->
      <div v-if="role === 'coordinator'" class="form-item">
        <label>Department</label>
        <select v-model="selectedOrg">
          <option value="">-- Select department --</option>
          <option v-for="unit in orgUnits" :key="unit.id" :value="unit.id">
            {{ unit.name }}
          </option>
        </select>
      </div>

      <div class="form-item">
        <label>Search Keyword (name, email, or group ID)</label>
        <input v-model="keyword" type="text" placeholder="Enter mentor name, email, or group ID" />
      </div>

      <div class="buttons">
        <button @click="searchMentor" :disabled="isLoading">
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>
    </div>

    <!-- Results -->
    <div v-if="results.length > 0" class="results-section">
      <h2>Search Results ({{ results.length }} found)</h2>

      <table>
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
          <tr v-for="mentor in results" :key="mentor.mentorId">
            <td><input v-model="selectedMentorId" type="radio" :value="mentor.mentorId" /></td>
            <td>{{ mentor.mentorId }}</td>
            <td>{{ mentor.mentorName }}</td>
            <td>{{ mentor.email }}</td>
            <td>{{ mentor.office }}</td>
            <td>{{ mentor.departmentName }}</td>
          </tr>
        </tbody>
      </table>

      <div class="actions">
        <button @click="showMembers">Show Members</button>
        <button class="secondary" @click="searchAgain">Search Again</button>
      </div>

      <p v-if="actionMsg" class="error">{{ actionMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRole } from '../types'
import { getMentorsByOrg, searchAllMentors, getOrgUnits } from '../api/org'
import type { MentorFromApi, OrgUnit } from '../api/org'

const router = useRouter()
const role = getRole()

const selectedOrg = ref('')
const keyword = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const actionMsg = ref('')
const selectedMentorId = ref('')

const results = ref<MentorFromApi[]>([])
const orgUnits = ref<OrgUnit[]>([])

onMounted(async () => {
  // Load department list for coordinators
  if (role === 'coordinator') {
    try {
      orgUnits.value = await getOrgUnits(2) // unitType 2 = DEPARTMENT
    } catch { /* ignore */ }
  }
})

async function searchMentor() {
  message.value = ''
  isError.value = false
  results.value = []
  actionMsg.value = ''
  selectedMentorId.value = ''

  const kw = keyword.value.trim()

  if (!kw && role === 'consultant') {
    // Faculty Consultant can search without keyword to get all mentors
  }

  if (role === 'coordinator' && !selectedOrg.value) {
    message.value = 'Please select a department first.'
    isError.value = true
    return
  }

  if (!kw) {
    message.value = 'Warning: Please enter mentor name, email, or group ID.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    let list: MentorFromApi[]

    if (role === 'consultant') {
      list = await searchAllMentors(kw)
    } else {
      list = await getMentorsByOrg(selectedOrg.value, kw)
    }

    if (list.length === 0) {
      message.value = 'No matching mentor information is found.'
      isError.value = true
      return
    }

    results.value = list
  } catch (err: any) {
    if (err.message?.includes('403')) {
      message.value = 'Authorization warning: You cannot view mentor information outside your scope.'
    } else {
      message.value = 'Search failed: ' + (err.message || 'Unknown error')
    }
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function showMembers() {
  actionMsg.value = ''
  if (!selectedMentorId.value) {
    actionMsg.value = 'Warning: Please select a group ID first.'
    return
  }
  // Use mentorId as groupId placeholder for navigation
  router.push(`/group-members/${selectedMentorId.value}`)
}

function searchAgain() {
  results.value = []
  keyword.value = ''
  message.value = ''
  isError.value = false
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.form { max-width: 500px; margin-top: 24px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 6px; font-weight: 600; }
input, select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;
}
.buttons { margin-top: 16px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }

.results-section { margin-top: 28px; }
.results-section h2 { margin-bottom: 14px; font-size: 18px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 11px 12px; border: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
th { background: #f3f4f6; font-weight: 600; }
tbody tr:hover { background: #f9fafb; }
.actions { margin-top: 20px; }
.actions button { margin-right: 10px; }
</style>
