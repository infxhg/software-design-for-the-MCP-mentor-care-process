<template>
  <section class="page">
    <h1>Group Detail</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="group" class="card">
      <h2>{{ group.name || group.groupId }}</h2>
      <p><strong>Group ID:</strong> {{ group.groupId }}</p>
      <p><strong>Parent ID:</strong> {{ group.parentId || '-' }}</p>
      <p><strong>Faculty Org ID:</strong> {{ group.facultyOrgId || '-' }}</p>
      <p><strong>Mentor ID:</strong> {{ group.mentorId || '-' }}</p>

      <div class="inline">
        <input v-model.trim="newMentorId" placeholder="New mentor ID" />
        <button @click="changeMentor">Change Mentor</button>
      </div>

      <div class="inline">
        <input v-model.trim="newStudentId" placeholder="Student ID" />
        <button @click="addStudent">Add Student</button>
      </div>
    </div>

    <div class="card">
      <h2>Members</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Major</th>
            <th>Status</th>
            <th>Update Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.studentId">
            <td>{{ m.studentId }}</td>
            <td>{{ m.majorId || '-' }}</td>
            <td>{{ m.status || '-' }}</td>
            <td>{{ m.updateTime || '-' }}</td>
            <td><button class="danger" @click="removeStudent(m.studentId)">Remove</button></td>
          </tr>
          <tr v-if="members.length === 0">
            <td colspan="5" class="empty">No members.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  addStudentToGroup,
  changeGroupMentor,
  getGroupMembers,
  removeStudentFromGroup,
  searchGroup,
  type GroupInfo,
  type GroupMember,
} from '../../api/mentoring'

const route = useRoute()
const groupId = String(route.params.groupId || '')
const group = ref<GroupInfo | null>(null)
const members = ref<GroupMember[]>([])
const error = ref('')
const newMentorId = ref('')
const newStudentId = ref('')

async function load() {
  error.value = ''
  try {
    const data = await searchGroup(groupId)
    group.value = data.group || null
    members.value = data.members?.length ? data.members : await getGroupMembers(groupId)
  } catch (e: any) {
    error.value = e.message || 'Failed to load group.'
  }
}

async function changeMentor() {
  if (!newMentorId.value) return
  try {
    group.value = await changeGroupMentor(groupId, newMentorId.value)
    newMentorId.value = ''
  } catch (e: any) {
    error.value = e.message || 'Failed to change mentor.'
  }
}

async function addStudent() {
  if (!newStudentId.value) return
  try {
    await addStudentToGroup(groupId, newStudentId.value)
    newStudentId.value = ''
    await load()
  } catch (e: any) {
    error.value = e.message || 'Failed to add student.'
  }
}

async function removeStudent(studentId: string) {
  if (!window.confirm(`Remove ${studentId}?`)) return
  try {
    await removeStudentFromGroup(groupId, studentId)
    await load()
  } catch (e: any) {
    error.value = e.message || 'Failed to remove student.'
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.inline { display: flex; gap: 10px; align-items: center; margin: 12px 0; }
input { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.danger { color: #b42318; border-color: #f3b8b2; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
