<template>
  <div class="page-card">
    <div v-if="mentor">
      <div class="header">
        <div>
          <h1>Group Members</h1>
          <p class="desc">Group ID: {{ mentor.groupId }}</p>
        </div>

        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div class="mentor-info">
        <p><strong>Mentor:</strong> {{ mentor.name }}</p>
        <p><strong>Email:</strong> {{ mentor.email }}</p>
        <p><strong>Major:</strong> {{ mentor.major }}</p>
      </div>

      <table>
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Major</th>
          <th>Status</th>
          <th>Operation</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="student in groupStudents" :key="student.studentId">
          <td>{{ student.studentId }}</td>
          <td>
            <button class="link-button" @click="viewStudentRecord(student.studentId)">
              {{ student.name }}
            </button>
          </td>
          <td>{{ student.major }}</td>
          <td>{{ student.status }}</td>
          <td>
            <button @click="viewStudentRecord(student.studentId)">View Record</button>
          </td>
        </tr>
        </tbody>
      </table>

      <p v-if="groupStudents.length === 0" class="empty">No students in this group.</p>
    </div>

    <div v-else>
      <h1>Group Not Found</h1>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findMentorByGroupId, getStudents } from '../data/mockData'

const route = useRoute()
const router = useRouter()

const groupId = route.params.groupId as string

const mentor = findMentorByGroupId(groupId)

const groupStudents = computed(() => {
  if (!mentor) {
    return []
  }

  return getStudents().filter((student) => mentor.students.includes(student.studentId))
})

function viewStudentRecord(studentId: string) {
  router.push(`/student-record/${studentId}`)
}

function goBack() {
  const savedQuery = sessionStorage.getItem('lastMentorSearchQuery')

  if (savedQuery) {
    router.push({
      path: '/mentor-result',
      query: JSON.parse(savedQuery),
    })
    return
  }

  router.push('/search-mentor')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mentor-info {
  margin-top: 18px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
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

.empty {
  margin-top: 18px;
  color: #6b7280;
}

.link-button {
  background: transparent;
  color: #2563eb;
  padding: 0;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
</style>
