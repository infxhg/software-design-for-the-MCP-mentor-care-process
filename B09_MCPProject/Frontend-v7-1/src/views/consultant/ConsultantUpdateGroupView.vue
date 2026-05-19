<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Update Mentor Group</h1>
        <p class="desc">Add or remove students from a mentoring group.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <!-- Group selection -->
      <div class="form-item">
        <label>Group ID</label>
        <select v-model="selectedGroupId" @change="loadGroupMembers">
          <option value="">-- Choose a group --</option>
          <option
              v-for="g in groups"
              :key="g.groupId"
              :value="g.groupId"
          >
            {{ g.groupId }} (Mentor: {{ g.mentorName }})
          </option>
        </select>
      </div>

      <div v-if="selectedGroupId">
        <h2>Current Students in Group {{ selectedGroupId }}</h2>

        <table v-if="members.length > 0">
          <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Major</th>
            <th>Action</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="m in members" :key="m.studentId">
            <td>{{ m.studentId }}</td>
            <td>{{ m.name }}</td>
            <td>{{ m.major || 'N/A' }}</td>
            <td>
              <button
                  class="danger"
                  :disabled="removingId === m.studentId"
                  @click="removeMember(m.studentId)"
              >
                {{ removingId === m.studentId ? 'Removing...' : 'Remove' }}
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <p v-else class="empty">No students in this group.</p>

        <!-- Add student -->
        <div class="add-row">
          <label>Add Student ID</label>
          <div class="add-input">
            <input
                v-model="newStudentId"
                type="text"
                placeholder="Enter 9-digit student ID"
                @keyup.enter="addMember"
            />
            <button :disabled="adding" @click="addMember">
              {{ adding ? 'Adding...' : 'Add' }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listGroups,
  getGroupDetail,
  addStudentToGroup,
  removeStudentFromGroup,
} from '../../api/consultant'
import type { GroupSummary, GroupMember } from '../../api/consultant'

const router = useRouter()

const groups = ref<GroupSummary[]>([])
const selectedGroupId = ref('')
const members = ref<GroupMember[]>([])
const newStudentId = ref('')
const message = ref('')
const isError = ref(false)
const removingId = ref('')
const adding = ref(false)

const STUDENT_ID_PATTERN = /^\d{9}$/

onMounted(async () => {
  try {
    groups.value = await listGroups()
  } catch (err: any) {
    message.value = 'Failed to load groups: ' + (err.message || 'Unknown error')
    isError.value = true
  }
})

async function loadGroupMembers() {
  message.value = ''
  isError.value = false
  members.value = []

  if (!selectedGroupId.value) return

  try {
    const detail = await getGroupDetail(selectedGroupId.value)
    members.value = detail.members
  } catch (err: any) {
    message.value = 'Failed to load members: ' + (err.message || 'Unknown error')
    isError.value = true
  }
}

async function addMember() {
  message.value = ''
  isError.value = false

  const sid = newStudentId.value.trim()
  if (!STUDENT_ID_PATTERN.test(sid)) {
    message.value = 'Warning: Student ID must be 9 digits.'
    isError.value = true
    return
  }

  adding.value = true
  try {
    await addStudentToGroup(selectedGroupId.value, sid)
    await loadGroupMembers()
    newStudentId.value = ''
    message.value = 'Student added to group.'
  } catch (err: any) {
    message.value = err.message || 'Failed to add student.'
    isError.value = true
  } finally {
    adding.value = false
  }
}

async function removeMember(studentId: string) {
  if (!confirm(`Remove student ${studentId}? Historical info will be kept.`)) {
    return
  }

  message.value = ''
  isError.value = false
  removingId.value = studentId

  try {
    await removeStudentFromGroup(selectedGroupId.value, studentId)
    await loadGroupMembers()
    message.value = `Student ${studentId} removed.`
  } catch (err: any) {
    message.value = err.message || 'Failed to remove student.'
    isError.value = true
  } finally {
    removingId.value = ''
  }
}

function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { margin-top: 22px; }
.form-item { margin-top: 16px; max-width: 500px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
select, input {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
h2 { margin-top: 28px; font-size: 17px; }

table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.add-row { margin-top: 22px; }
.add-input { display: flex; gap: 10px; max-width: 500px; }
.add-input input { flex: 1; }

.empty { color: #6b7280; padding: 16px 0; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
