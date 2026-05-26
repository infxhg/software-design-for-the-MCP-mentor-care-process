<template>
  <section class="page">
    <h1>Update Mentor Group</h1>

    <div class="card">
      <div class="field-row">
        <label class="field">
          Group ID
          <input v-model.trim="groupId" placeholder="e.g. 2024-2025-Y1" @keyup.enter="load" />
        </label>
        <label class="field">
          Major ID <span class="hint">(optional, for disambiguation)</span>
          <input v-model.trim="majorId" placeholder="e.g. CST / AI" @keyup.enter="load" />
        </label>
      </div>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading || !groupId" @click="load">
          {{ loading ? 'Loading…' : 'Load Group' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="group" class="card">
      <h2>{{ group.name || group.groupId }}</h2>
      <p><strong>Mentor ID:</strong> {{ group.mentorId || '-' }}</p>

      <div class="add-row">
        <input
          v-model.trim="studentId"
          class="add-input"
          placeholder="Student ID to add (9 digits, e.g. 330026143)"
          @keyup.enter="addStudent"
        />
        <button
          class="btn btn-success"
          :disabled="saving || !studentId"
          @click="addStudent"
        >
          {{ saving ? 'Saving…' : 'Add Student' }}
        </button>
      </div>
      <p v-if="addError" class="error add-error">{{ addError }}</p>

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
            <td>
              <button class="btn btn-danger" @click="removeStudent(m.studentId, m.majorId)">
                Remove
              </button>
            </td>
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
const majorId = ref('')
const studentId = ref('')
const group = ref<GroupInfo | null>(null)
const members = ref<GroupMember[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const addError = ref('')

/**
 * 修改点：正式 Student ID 是 9 位数字，例如 330026143。
 * 非法 ID 在调接口前直接拦截（ban 掉），不发请求。
 */
const STUDENT_ID_PATTERN = /^\d{9}$/

function validateStudentId(input: string): string {
  if (!input) return 'Student ID cannot be empty.'
  if (!STUDENT_ID_PATTERN.test(input)) {
    return 'Invalid Student ID. It must be exactly 9 digits.'
  }
  return ''
}

/** 把可选 majorId 规整为 undefined（空串不传给后端） */
function major(): string | undefined {
  return majorId.value || undefined
}

async function load() {
  loading.value = true
  error.value = ''
  addError.value = ''
  try {
    // 修改点：搜索接口新增 majorId（FC/Admin 精确定位，可选）
    const data = await searchGroup(groupId.value, major())
    group.value = data.group || null
    // 修改点：展示组员接口同样支持 majorId（不传则合并所有匹配组成员）
    members.value = data.members?.length
      ? data.members
      : await getGroupMembers(groupId.value, major())
    if (!group.value) error.value = 'No group found.'
  } catch (e: any) {
    error.value = e.message || 'Failed to load group.'
  } finally {
    loading.value = false
  }
}

async function addStudent() {
  // 修改点：9 位数字 ID 校验，非法直接拦截
  const validationError = validateStudentId(studentId.value)
  if (validationError) {
    addError.value = validationError
    return
  }

  saving.value = true
  addError.value = ''
  error.value = ''
  try {
    // 修改点：添加组员接口新增 majorId（歧义时必填，同时写入学生专业）
    await addStudentToGroup(groupId.value, studentId.value, major())
    studentId.value = ''
    await load()
  } catch (e: any) {
    addError.value = e.message || 'Failed to add student.'
  } finally {
    saving.value = false
  }
}

async function removeStudent(id: string, memberMajorId?: string | null) {
  if (!window.confirm(`Remove ${id} from this group?`)) return
  saving.value = true
  error.value = ''
  try {
    // 修改点：删除组员接口新增 majorId（歧义时必填）。
    // 优先用该成员行自带的 majorId，回退到顶部输入的 majorId。
    await removeStudentFromGroup(groupId.value, id, memberMajorId || major())
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
.card {
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 14px;
}

.field-row { display: flex; flex-wrap: wrap; gap: 16px; }
.field { display: grid; gap: 6px; font-weight: 600; flex: 1 1 220px; }
.field .hint { font-weight: 400; color: #94a3b8; font-size: 12px; }

input {
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}
input:focus { outline: none; border-color: #1f6feb; box-shadow: 0 0 0 3px rgba(31,111,235,.15); }

.actions { display: flex; }

.add-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.add-input { flex: 1 1 280px; min-width: 220px; }
.add-error { margin: 0; }

/* 修改点：统一按钮样式，原来无 class 的 Add Student 是白底白字几乎看不见。
   现在每个按钮都有明确的底色/文字色/hover/disabled 态。 */
.btn {
  padding: 9px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .15s ease, opacity .15s ease;
  white-space: nowrap;
}
.btn:disabled { opacity: .55; cursor: not-allowed; }

.btn-primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1a5fd0; }

.btn-success { background: #16a34a; border-color: #16a34a; color: #fff; }
.btn-success:hover:not(:disabled) { background: #128a3e; }

.btn-danger { background: #dc2626; border-color: #dc2626; color: #fff; padding: 6px 12px; }
.btn-danger:hover:not(:disabled) { background: #b91c1c; }

.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.empty { text-align: center; color: #777; }
</style>
