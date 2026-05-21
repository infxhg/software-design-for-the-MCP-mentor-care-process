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
      <div class="form-item">
        <label>Group ID</label>
        <div class="search-row">
          <select v-model="selectedGroupId" :disabled="loadingGroups">
            <option value="">-- Select Group --</option>
            <option v-for="group in groups" :key="group.groupId" :value="group.groupId">
              {{ group.groupId }}{{ group.mentorName ? ` - ${group.mentorName}` : '' }}
            </option>
          </select>
          <button :disabled="!selectedGroupId || loadingDetail" @click="loadGroupDetail">
            {{ loadingDetail ? 'Loading...' : 'Load' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <section v-if="groupDetail" class="section">
        <h2>Group Information</h2>
        <div class="info-grid">
          <div><strong>Group ID:</strong> {{ groupDetail.groupId || selectedGroupId }}</div>
          <div><strong>Mentor:</strong> {{ groupDetail.mentorName || groupDetail.currentMentor || '-' }}</div>
          <div><strong>Major:</strong> {{ groupDetail.major || '-' }}</div>
          <div><strong>Department:</strong> {{ groupDetail.department || '-' }}</div>
        </div>

        <div class="add-row">
          <input
            v-model.trim="newStudentId"
            maxlength="20"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const groups = ref<any[]>([])
const selectedGroupId = ref('')
const groupDetail = ref<any | null>(null)
const students = ref<any[]>([])
const newStudentId = ref('')
const loadingGroups = ref(false)
const loadingDetail = ref(false)
const saving = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(loadGroups)

async function loadGroups() {
  loadingGroups.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.listGroups) {
      throw new Error('listGroups API is not available.')
    }

    const data = await consultantApi.listGroups()
    groups.value = normalizeArray(data).map((g: any) => ({
      ...g,
      groupId: String(g.groupId ?? g.id ?? ''),
      mentorName: g.mentorName ?? g.currentMentor ?? g.mentor?.name,
    }))
  } catch (err: any) {
    showError(err.message || 'Failed to load groups.')
  } finally {
    loadingGroups.value = false
  }
}

async function loadGroupDetail() {
  if (!selectedGroupId.value) {
    showError('Please select a group.')
    return
  }

  loadingDetail.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.getGroupDetail) {
      throw new Error('getGroupDetail API is not available.')
    }

    const data = await consultantApi.getGroupDetail(selectedGroupId.value)

    groupDetail.value = data?.group || data?.groupDetail || data || null
    students.value = normalizeMembers(data)
  } catch (err: any) {
    showError(err.message || 'Failed to load group detail.')
  } finally {
    loadingDetail.value = false
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
  clearMessage()

  const studentId = newStudentId.value.trim()
  if (!selectedGroupId.value) {
    showError('Please select a group first.')
    return
  }
  if (!studentId) {
    showError('Please enter student ID.')
    return
  }

  saving.value = true
  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.addStudentToGroup) {
      throw new Error('addStudentToGroup API is not available.')
    }

    await consultantApi.addStudentToGroup(selectedGroupId.value, studentId)
    newStudentId.value = ''
    showSuccess('Student added successfully.')
    await loadGroupDetail()
  } catch (err: any) {
    showError(err.message || 'Failed to add student.')
  } finally {
    saving.value = false
  }
}

async function removeStudent(studentId: string) {
  if (!selectedGroupId.value || !studentId) return

  const ok = window.confirm(`Remove student ${studentId} from this group?`)
  if (!ok) return

  saving.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    if (!consultantApi.removeStudentFromGroup) {
      throw new Error('removeStudentFromGroup API is not available.')
    }

    await consultantApi.removeStudentFromGroup(selectedGroupId.value, studentId)
    showSuccess('Student removed successfully.')
    await loadGroupDetail()
  } catch (err: any) {
    showError(err.message || 'Failed to remove student.')
  } finally {
    saving.value = false
  }
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.records)) return data.records
  return []
}

function goHome() {
  router.push('/main')
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
.form,
.section {
  margin-top: 22px;
}
.form-item {
  margin-top: 16px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
.search-row,
.add-row {
  display: flex;
  gap: 10px;
  max-width: 760px;
}
.search-row select,
.add-row input {
  flex: 1;
}
input,
select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 10px;
  margin: 12px 0 18px;
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
