<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Change Mentors</h1>
        <p class="desc">Change the mentor assigned to a group.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <!-- Search a group -->
      <div class="form-item">
        <label>Search by Group ID</label>
        <div class="search-row">
          <input
              v-model="searchGroupId"
              type="text"
              placeholder="Enter Group ID, e.g. B01"
              @keyup.enter="searchGroup"
          />
          <button @click="searchGroup">Search</button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

      <!-- Result table -->
      <table v-if="filteredGroups.length > 0">
        <thead>
        <tr>
          <th>Group ID</th>
          <th>Current Mentor</th>
          <th>New Mentor</th>
          <th>Action</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="g in filteredGroups" :key="g.groupId">
          <td>{{ g.groupId }}</td>
          <td>{{ g.mentorName }}</td>
          <td>
            <select v-model="newMentorIds[g.groupId]">
              <option value="">-- Select Mentor --</option>
              <option
                  v-for="m in mentorList"
                  :key="m.id"
                  :value="m.id"
              >
                {{ m.name }}
              </option>
            </select>
          </td>
          <td>
            <button
                :disabled="!newMentorIds[g.groupId] || savingId === g.groupId"
                @click="saveChange(g.groupId)"
            >
              {{ savingId === g.groupId ? 'Saving...' : 'Save' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <p v-else-if="!isLoading" class="empty">
        No groups found. Try another Group ID or click Search to load all.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listGroups, changeGroupMentor } from '../../api/consultant'
import type { GroupSummary } from '../../api/consultant'

const router = useRouter()

const groups = ref<GroupSummary[]>([])
const searchGroupId = ref('')
const newMentorIds = reactive<Record<string, string>>({})
const message = ref('')
const isError = ref(false)
const isLoading = ref(true)
const savingId = ref('')

const mentorList = ref([
  { id: 'M001', name: 'Jack' },
  { id: 'M002', name: 'Peter' },
  { id: 'M003', name: 'Mark' },
  { id: 'M004', name: 'Mary Lee' },
])

const filteredGroups = computed(() => {
  const q = searchGroupId.value.trim().toLowerCase()
  if (!q) return groups.value
  return groups.value.filter((g) => g.groupId.toLowerCase().includes(q))
})

onMounted(async () => {
  try {
    groups.value = await listGroups()
  } catch (err: any) {
    message.value = 'Failed to load groups: ' + (err.message || 'Unknown error')
    isError.value = true
  } finally {
    isLoading.value = false
  }
})

function searchGroup() {
  message.value = ''
  isError.value = false
  // filteredGroups will auto-update via computed
  if (filteredGroups.value.length === 0) {
    message.value = 'No matching group found.'
    isError.value = true
  }
}

async function saveChange(groupId: string) {
  message.value = ''
  isError.value = false

  const newMentorId = newMentorIds[groupId]
  if (!newMentorId) {
    message.value = 'Warning: Please select a new mentor.'
    isError.value = true
    return
  }

  savingId.value = groupId
  try {
    await changeGroupMentor(groupId, newMentorId)

    // refresh group locally
    const g = groups.value.find((g) => g.groupId === groupId)
    const m = mentorList.value.find((m) => m.id === newMentorId)
    if (g && m) {
      g.mentorId = newMentorId
      g.mentorName = m.name
    }

    newMentorIds[groupId] = ''
    message.value = `Mentor of group ${groupId} updated to ${m?.name}.`
  } catch (err: any) {
    message.value = err.message || 'Failed to change mentor.'
    isError.value = true
  } finally {
    savingId.value = ''
  }
}

function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }

.search-row { display: flex; gap: 10px; max-width: 500px; }
.search-row input {
  flex: 1; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

table {
  width: 100%; border-collapse: collapse; margin-top: 18px;
}
th, td {
  padding: 10px; border: 1px solid #e5e7eb; text-align: left;
  vertical-align: middle;
}
th { background: #f3f4f6; }

select {
  width: 100%; padding: 8px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.empty { color: #6b7280; padding: 16px 0; }
</style>
