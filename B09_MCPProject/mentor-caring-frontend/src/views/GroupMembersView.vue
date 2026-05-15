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
          <td>{{ student.name }}</td>
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
import { mentors, students } from '../data/mockData'

const route = useRoute()
const router = useRouter()

const groupId = route.params.groupId as string

const mentor = mentors.find((item) => item.groupId === groupId)

const groupStudents = computed(() => {
  if (!mentor) {
    return []
  }

  return students.filter((student) => mentor.students.includes(student.studentId))
})

function viewStudentRecord(studentId: string) {
  // 修改部分：
  // 原来可能是 /students/${studentId}/record
  // 现在统一改成 /student-record/:studentId
  router.push(`/student-record/${studentId}`)
}

function goBack() {
  // 修改部分：
  // 这里不要直接 push('/mentor-result')
  // 因为 /mentor-result 需要 query 参数，直接跳会丢失搜索结果
  // 用 router.back() 可以回到刚才带搜索结果的 MentorResult 页面
  router.back()
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
  align-items: center;
  justify-content: space-between;
}

.desc {
  color: #6b7280;
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

button {
  padding: 8px 14px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button.secondary {
  background: #6b7280;
}

.empty {
  margin-top: 18px;
  color: #6b7280;
}
</style>
