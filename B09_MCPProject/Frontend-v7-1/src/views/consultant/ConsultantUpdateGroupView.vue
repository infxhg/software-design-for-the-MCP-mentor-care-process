<template>
  <section class="page">
    <h1>Update Mentor Group</h1>

    <div class="card">
      <label>
        Group ID
        <input v-model.trim="groupId" placeholder="e.g. group_a1" />
      </label>
      <button class="primary" :disabled="loading || !groupId" @click="load">Load Group</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="group" class="card">
      <h2>{{ group.name || group.groupId }}</h2>
      <p><strong>Mentor ID:</strong> {{ group.mentorId || '-' }}</p>

      <div class="inline">
        <input v-model.trim="studentId" placeholder="Student ID to add" />
        <button :disabled="saving || !studentId" @click="addStudent">Add Student</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Major</th>
            <th>Status</th>
            <th>Group ID</th>
            <th>Update Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.studentId">
            <td>{{ m.studentId }}</td>
            <td>{{ m.majorId || '-' }}</td>
            <td>{{ m.status || '-' }}</td>
            <td>{{ m.groupId || '-' }}</td>
            <td>{{ m.updateTime || '-' }}</td>
            <td><button class="danger" @click="removeStudent(m.studentId)">Remove</button></td>
          </tr>
          <tr v-if="members.length === 0">
            <td colspan="6" class="empty">No members.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  addStudentToGroup,
  getGroupMembers,
  removeStudentFromGroup,
  searchGroup,
  type GroupInfo,
  type GroupMember,
} from '../../api/mentoring'

const groupId = ref('')
const studentId = ref('')
const group = ref<GroupInfo | null>(null)
const members = ref<GroupMember[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await searchGroup(groupId.value)
    group.value = data.group || null
    members.value = data.members?.length ? data.members : await getGroupMembers(groupId.value)
    if (!group.value) error.value = 'No group found.'
  } catch (e: any) {
    error.value = e.message || 'Failed to load group.'
  } finally {
    loading.value = false
  }
}

async function addStudent() {
  saving.value = true
  error.value = ''
  try {
    await addStudentToGroup(groupId.value, studentId.value)
    studentId.value = ''
    await load()
  } catch (e: any) {
    error.value = e.message || 'Failed to add student.'
  } finally {
    saving.value = false
  }
}

async function removeStudent(id: string) {
  if (!window.confirm(`Remove ${id} from this group?`)) return
  saving.value = true
  error.value = ''
  try {
    await removeStudentFromGroup(groupId.value, id)
    await load()
  } catch (e: any) {
    error.value = e.message || 'Failed to remove student.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
.inline { display: flex; gap: 10px; align-items: center; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.danger { color: #b42318; border-color: #f3b8b2; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
