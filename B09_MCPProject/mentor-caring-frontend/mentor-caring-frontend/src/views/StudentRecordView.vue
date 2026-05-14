<template>
  <div class="page-card">
    <div v-if="student">
      <div class="header">
        <div>
          <h1>Student Record</h1>
          <p class="desc">Detailed student record selected from group member list.</p>
        </div>

        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div class="info-grid">
        <div>
          <strong>Student ID</strong>
          <p>{{ student.studentId }}</p>
        </div>

        <div>
          <strong>Name</strong>
          <p>{{ student.name }}</p>
        </div>

        <div>
          <strong>Major</strong>
          <p>{{ student.major }}</p>
        </div>

        <div>
          <strong>Status</strong>
          <p>{{ student.status }}</p>
        </div>

        <div>
          <strong>Group ID</strong>
          <p>{{ student.groupId }}</p>
        </div>

        <div>
          <strong>Mentor ID</strong>
          <p>{{ student.mentorId }}</p>
        </div>
      </div>

      <h2>Interview Records</h2>

      <table v-if="student.records.length > 0">
        <thead>
        <tr>
          <th>Record ID</th>
          <th>Date</th>
          <th>Time</th>
          <th>Problem Statement</th>
          <th>Interview Summary</th>
          <th>Follow-up Action</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="record in student.records" :key="record.recordId">
          <td>{{ record.recordId }}</td>
          <td>{{ record.date }}</td>
          <td>{{ record.time }}</td>
          <td>{{ record.problemStatement }}</td>
          <td>{{ record.interviewSummary }}</td>
          <td>{{ record.followupAction }}</td>
        </tr>
        </tbody>
      </table>

      <p v-else class="empty">No interview records.</p>
    </div>

    <div v-else>
      <h1>Student Not Found</h1>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { findStudentById } from '../data/mockData'

const route = useRoute()
const router = useRouter()

const studentId = route.params.studentId as string
const student = findStudentById(studentId)

function goBack() {
  if (student) {
    router.push(`/groups/${student.groupId}/members`)
  } else {
    router.push('/mentors/search')
  }
}
</script>

<style scoped>
.page-card {
  background: white;
  padding: 28px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.desc {
  color: #6b7280;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 24px;
  margin-bottom: 28px;
}

.info-grid div {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.info-grid p {
  margin-bottom: 0;
}

button {
  padding: 9px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button.secondary {
  background: #6b7280;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
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
  color: #6b7280;
}
</style>
