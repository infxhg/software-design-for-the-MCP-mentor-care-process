<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Export Records</h1>
        <p class="desc">Export interview records for your group or a selected student.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Export Scope</label>
        <select v-model="scope">
          <option value="group">All students in my group</option>
          <option value="student">Chosen student</option>
        </select>
      </div>

      <div v-if="scope === 'student'" class="form-item">
        <label>Student</label>
        <select v-if="students.length > 0" v-model="studentId">
          <option value="">-- Select Student --</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name }} ({{ student.id }})
          </option>
        </select>
        <input
          v-else
          v-model.trim="studentId"
          placeholder="Enter Student ID"
        />
      </div>

      <div v-if="scope === 'group'" class="form-item">
        <label>Group ID</label>
        <select v-if="groups.length > 0" v-model="groupId">
          <option value="">-- Select Group --</option>
          <option v-for="group in groups" :key="group.groupId" :value="group.groupId">
            {{ group.groupId }}
          </option>
        </select>
        <input
          v-else
          v-model.trim="groupId"
          placeholder="Enter Group ID"
        />
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <button :disabled="exporting" @click="exportRecords">
        {{ exporting ? 'Exporting...' : 'Export Word' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const scope = ref<'group' | 'student'>('group')
const studentId = ref('')
const groupId = ref('')
const students = ref<{ id: string; name: string }[]>([])
const groups = ref<any[]>([])
const exporting = ref(false)
const message = ref('')
const isError = ref(false)

onMounted(async () => {
  await Promise.all([loadStudents(), loadGroups()])
})

async function loadStudents() {
  try {
    const mentoringApi: any = await import('../../api/mentoring')
    const orgApi: any = await import('../../api/org')
    const fn =
      mentoringApi.getMentorStudents ||
      mentoringApi.getMyStudents ||
      mentoringApi.getMyGroupStudents ||
      orgApi.getAllStudents ||
      orgApi.searchAllStudents

    if (!fn) return

    const data = fn === orgApi.searchAllStudents ? await fn('') : await fn()
    students.value = normalizeStudents(data)
  } catch {
    students.value = []
  }
}

async function loadGroups() {
  try {
    const mentoringApi: any = await import('../../api/mentoring')
    const consultantApi: any = await import('../../api/consultant')
    const fn =
      mentoringApi.getMyGroups ||
      mentoringApi.getGroupsByCurrentMentor ||
      consultantApi.listGroups

    if (!fn) return

    const data = await fn()
    groups.value = normalizeArray(data).map((g: any) => ({
      ...g,
      groupId: String(g.groupId ?? g.id ?? ''),
    }))

    if (groups.value.length === 1) {
      groupId.value = groups.value[0].groupId
    }
  } catch {
    groups.value = []
  }
}

async function exportRecords() {
  clearMessage()

  if (scope.value === 'student' && !studentId.value) {
    showError('Please select or enter a student.')
    return
  }

  if (scope.value === 'group' && !groupId.value) {
    showError('Please select or enter a group ID.')
    return
  }

  exporting.value = true

  try {
    const mentoringApi: any = await import('../../api/mentoring')
    const consultantApi: any = await import('../../api/consultant')

    let blob: Blob | null = null

    if (scope.value === 'student') {
      const fn =
        mentoringApi.exportStudentRecords ||
        consultantApi.exportStudentRecords ||
        consultantApi.exportRecordsByStudent

      if (!fn) throw new Error('Student export API is not available.')
      blob = await fn(studentId.value)
    } else {
      const fn =
        mentoringApi.exportGroupRecords ||
        consultantApi.exportGroupRecords ||
        consultantApi.exportRecordsByGroup

      if (!fn) throw new Error('Group export API is not available.')
      blob = await fn(groupId.value)
    }

    if (!(blob instanceof Blob)) {
      blob = new Blob([blob as any], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    }

    downloadBlob(blob, `mentor-records-${Date.now()}.docx`)
    showSuccess('Export started.')
  } catch (err: any) {
    showError(err.message || 'Failed to export records.')
  } finally {
    exporting.value = false
  }
}

function normalizeStudents(data: any) {
  return normalizeArray(data)
    .map((item: any) => ({
      id: String(item.studentId ?? item.id ?? ''),
      name: item.studentName ?? item.name ?? item.username ?? item.studentId,
    }))
    .filter((item: any) => item.id)
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.records)) return data.records
  return []
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
.form {
  margin-top: 22px;
  max-width: 680px;
}
.form-item {
  margin-top: 16px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
input,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
button {
  margin-top: 18px;
}
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
