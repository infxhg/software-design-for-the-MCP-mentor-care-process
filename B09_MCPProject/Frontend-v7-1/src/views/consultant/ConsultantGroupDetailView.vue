<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Detail</h1>
        <p class="desc">View and manage students in this mentoring group.</p>
      </div>
      <div class="actions">
        <button class="secondary" @click="goBack">Back</button>
        <button class="secondary" @click="goHome">Home</button>
      </div>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </p>

    <p v-if="loading" class="empty">Loading...</p>

    <section v-if="group" class="section">
      <h2>{{ group.groupId || groupId }}</h2>
      <div class="info-grid">
        <div><strong>Mentor:</strong> {{ group.mentorName || group.currentMentor || '-' }}</div>
        <div><strong>Major:</strong> {{ group.major || '-' }}</div>
        <div><strong>Department:</strong> {{ group.department || '-' }}</div>
        <div><strong>Students:</strong> {{ students.length }}</div>
      </div>

      <div class="toolbar">
        <button @click="goChangeMentor">Change Mentor</button>
      </div>

      <div class="add-row">
        <input
          v-model.trim="newStudentId"
          placeholder="Enter Student ID"
          @keyup.enter="addStudent"
        />
        <button :disabled="saving || !newStudentId" @click="addStudent">
          {{ saving ? 'Saving...' : 'Add Student' }}
        </button>
      </div>

      <table v-if="students.length > 0">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Major</th>
            <th>Status</th>
            <th>Records</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="student in students" :key="student.studentId">
            <td>{{ student.studentId }}</td>
            <td>{{ student.name || student.studentName || '-' }}</td>
            <td>{{ student.major || '-' }}</td>
            <td>{{ student.status || '-' }}</td>
            <td>{{ student.recordsCount ?? student.recordCount ?? '-' }}</td>
            <td>
              <button class="secondary" @click="viewRecord(student.studentId)">
                View Record
              </button>
              <button
                class="danger"
                :disabled="saving"
                @click="removeStudent(student.studentId)"
              >
                Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No students in this group.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const groupId = String(route.params.groupId || '')
const group = ref<any | null>(null)
const students = ref<any[]>([])
const newStudentId = ref('')
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(loadDetail)

async function loadDetail() {
  if (!groupId) {
    showError('Missing group ID.')
    return
  }

  loading.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.getGroupDetail) {
      throw new Error('getGroupDetail API is not available.')
    }

    const data = await consultantApi.getGroupDetail(groupId)
    group.value = data?.group || data?.groupDetail || data || { groupId }
    students.value = normalizeMembers(data)
  } catch (err: any) {
    showError(err.message || 'Failed to load group detail.')
  } finally {
    loading.value = false
  }
}

function normalizeMembers(data: any): any[] {
  const list =
    data?.members ||
    data?.students ||
    data?.groupMembers ||
    data?.data?.members ||
    data?.data?.students ||
    []

  return normalizeArray(list).map((item: any) => ({
    ...item,
    studentId: String(item.studentId ?? item.id ?? ''),
    name: item.name ?? item.studentName ?? item.username,
  }))
}

async function addStudent() {
  const studentId = newStudentId.value.trim()
  if (!studentId) {
    showError('Please enter student ID.')
    return
  }

  saving.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.addStudentToGroup) {
      throw new Error('addStudentToGroup API is not available.')
    }

    await consultantApi.addStudentToGroup(groupId, studentId)
    newStudentId.value = ''
    showSuccess('Student added successfully.')
    await loadDetail()
  } catch (err: any) {
    showError(err.message || 'Failed to add student.')
  } finally {
    saving.value = false
  }
}

async function removeStudent(studentId: string) {
  if (!studentId) return
  const ok = window.confirm(`Remove student ${studentId} from this group?`)
  if (!ok) return

  saving.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.removeStudentFromGroup) {
      throw new Error('removeStudentFromGroup API is not available.')
    }

    await consultantApi.removeStudentFromGroup(groupId, studentId)
    showSuccess('Student removed successfully.')
    await loadDetail()
  } catch (err: any) {
    showError(err.message || 'Failed to remove student.')
  } finally {
    saving.value = false
  }
}

function viewRecord(studentId: string) {
  router.push(`/student-record/${studentId}`)
}

function goChangeMentor() {
  router.push('/consultant/change-mentors')
}

function goBack() {
  router.push('/consultant/groups')
}

function goHome() {
  router.push('/main')
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.records)) return data.records
  return []
}

function clearMessage() {
  message.value = ''
  isError.value = false
}

function showSuccess(text: string) {
  message.value = text
  isError.value = false
}

function showError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.actions,
.toolbar,
.add-row {
  display: flex;
  gap: 10px;
}
.section {
  margin-top: 22px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 10px;
  margin: 12px 0 18px;
}
.add-row {
  max-width: 620px;
  margin: 16px 0;
}
.add-row input {
  flex: 1;
}
input {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
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
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
.empty {
  color: #6b7280;
}
.danger {
  background: #dc2626;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
