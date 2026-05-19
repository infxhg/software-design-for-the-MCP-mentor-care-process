<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Detail</h1>
        <p class="desc">Group ID: {{ groupId }}</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading group detail...</div>

    <div v-else-if="group">
      <div class="info-row">
        <p><strong>Group ID:</strong> {{ group.groupId }}</p>
        <p><strong>Mentor:</strong> {{ group.mentorName }}</p>
        <p><strong>Major:</strong> {{ group.major || 'N/A' }}</p>
        <p><strong>Department:</strong> {{ group.department || 'N/A' }}</p>

        <router-link to="/consultant/change-mentors" class="action-link">
          Change Mentor
        </router-link>
      </div>

      <h2>Students in This Group</h2>

      <table v-if="members.length > 0">
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Major</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="m in members" :key="m.studentId">
          <td>{{ m.studentId }}</td>
          <td>{{ m.name }}</td>
          <td>{{ m.major || 'N/A' }}</td>
          <td>{{ m.status || 'N/A' }}</td>
          <td>
            <button
                class="danger"
                :disabled="removingId === m.studentId"
                @click="remove(m.studentId)"
            >
              {{ removingId === m.studentId ? '...' : 'Delete' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <p v-else class="empty">No students in this group.</p>

      <div class="add-block">
        <label>Add Student</label>
        <div class="add-row">
          <input
              v-model="newStudentId"
              type="text"
              placeholder="9-digit student ID"
          />
          <button :disabled="adding" @click="add">
            {{ adding ? 'Adding...' : 'Add' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>

    <div v-else>
      <p class="error">{{ errorMsg || 'Group not found.' }}</p>
    </div>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGroupDetail,
  addStudentToGroup,
  removeStudentFromGroup,
} from '../../api/consultant'
import type { GroupSummary, GroupMember } from '../../api/consultant'

const route = useRoute()
const router = useRouter()

const groupId = String(route.params.groupId || '').trim()

const group = ref<GroupSummary | null>(null)
const members = ref<GroupMember[]>([])
const isLoading = ref(true)
const errorMsg = ref('')
const message = ref('')
const isError = ref(false)
const newStudentId = ref('')
const removingId = ref('')
const adding = ref(false)

const STUDENT_ID_PATTERN = /^\d{9}$/

onMounted(load)

async function load() {
  isLoading.value = true
  try {
    const detail = await getGroupDetail(groupId)
    group.value = detail.group
    members.value = detail.members
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load group.'
  } finally {
    isLoading.value = false
  }
}

async function add() {
  message.value = ''
  isError.value = false

  if (!STUDENT_ID_PATTERN.test(newStudentId.value.trim())) {
    message.value = 'Warning: Student ID must be 9 digits.'
    isError.value = true
    return
  }

  adding.value = true
  try {
    await addStudentToGroup(groupId, newStudentId.value.trim())
    newStudentId.value = ''
    await load()
    message.value = 'Student added.'
  } catch (err: any) {
    message.value = err.message || 'Failed to add.'
    isError.value = true
  } finally {
    adding.value = false
  }
}

async function remove(studentId: string) {
  if (!confirm(`Remove student ${studentId} from this group?`)) return

  removingId.value = studentId
  message.value = ''
  try {
    await removeStudentFromGroup(groupId, studentId)
    await load()
    message.value = 'Student removed.'
  } catch (err: any) {
    message.value = err.message || 'Failed to remove.'
    isError.value = true
  } finally {
    removingId.value = ''
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.info-row {
  margin-top: 22px; padding: 16px;
  background: #f9fafb; border-radius: 8px;
}
.info-row p { margin: 4px 0; }
.action-link {
  display: inline-block; margin-top: 8px;
  color: #2563eb; font-weight: 600;
}

h2 { margin-top: 28px; font-size: 17px; }
table { width: 100%; border-collapse: collapse; margin-top: 14px; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f3f4f6; }

.add-block { margin-top: 24px; }
label { display: block; font-weight: 600; margin-bottom: 8px; }
.add-row { display: flex; gap: 10px; max-width: 500px; }
.add-row input {
  flex: 1; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

.empty { color: #6b7280; padding: 14px 0; }
.buttons { margin-top: 22px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.loading { color: #6b7280; padding: 30px; text-align: center; }
</style>
