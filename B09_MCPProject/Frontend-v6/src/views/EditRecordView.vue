<template>
  <div class="page-card">
    <div v-if="isLoading" class="loading">Loading student info...</div>

    <div v-else-if="student">
      <div class="header">
        <div>
          <h1>Edit Interview Record</h1>
          <p class="desc">Only Mentor can add, modify, delete, save, or cancel interview records.</p>
        </div>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <div v-if="!canEdit" class="warning-box">
        Authorization warning: You are not allowed to edit this interview record.
      </div>

      <div v-else>
        <div class="student-info">
          <p><strong>Student ID:</strong> {{ student.id }}</p>
          <p><strong>Username:</strong> {{ student.username }}</p>
          <p><strong>Name:</strong> {{ student.realName || student.username }}</p>
          <p><strong>Email:</strong> {{ student.email || 'N/A' }}</p>
          <p><strong>Phone:</strong> {{ student.phone || 'N/A' }}</p>
        </div>

        <p v-if="recordMessage" class="message" :class="{ error: isRecordError }">
          {{ recordMessage }}
        </p>

        <button @click="addRecord">Add Record</button>

        <div v-if="records.length === 0" class="empty">
          No interview records. Click Add Record to create one.
        </div>

        <div v-for="(record, index) in records" :key="record.recordId || index" class="record-form">
          <h3>Record {{ index + 1 }}</h3>

          <div class="form-grid">
            <div>
              <label>Date</label>
              <input v-model="record.interviewDate" type="date" />
            </div>

            <div>
              <label>Time</label>
              <input v-model="record.interviewTime" type="time" />
            </div>
          </div>

          <div class="form-item">
            <label>Problem Statement</label>
            <textarea
                v-model="record.problemStatement"
                maxlength="200"
                placeholder="Maximum 200 characters"
            ></textarea>
            <small>{{ (record.problemStatement || '').length }}/200</small>
          </div>

          <div class="form-item">
            <label>Interview Summary</label>
            <textarea
                v-model="record.interviewSummary"
                maxlength="300"
                placeholder="Maximum 300 characters"
            ></textarea>
            <small>{{ (record.interviewSummary || '').length }}/300</small>
          </div>

          <div class="form-item">
            <label>Follow-up Action</label>
            <textarea
                v-model="record.followupAction"
                maxlength="200"
                placeholder="Maximum 200 characters"
            ></textarea>
            <small>{{ (record.followupAction || '').length }}/200</small>
          </div>

          <button class="danger" @click="deleteRecord(index)">Delete</button>
        </div>

        <div class="actions">
          <button @click="saveRecords">Save</button>
          <button class="secondary" @click="cancelEdit">Cancel</button>
        </div>

        <p v-if="message" class="message" :class="{ error: isMsgError }">
          {{ message }}
        </p>
      </div>
    </div>

    <div v-else>
      <h1>Student Not Found</h1>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lookupStudent, fetchRecordsForStudent, createRecord, updateRecord } from '../api/mentoring'
import { getRole } from '../types'
import type { McpRecord } from '../api/mentoring'
import type { StudentFromApi } from '../api/org'

const route = useRoute()
const router = useRouter()

/**
 * 修改点：
 * URL 参数统一表示 student.id。
 */
const studentId = String(route.params.studentId || '').trim()

const student = ref<StudentFromApi | null>(null)
const records = ref<McpRecord[]>([])
const originalRecords = ref<McpRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')
const message = ref('')
const isMsgError = ref(false)

const recordMessage = ref('')
const isRecordError = ref(false)

const canEdit = computed(() => getRole() === 'mentor')

const STUDENT_ID_PATTERN = /^\d{9}$/

function validateStudentId(input: string): string {
  if (!input) {
    return 'Student ID cannot be empty.'
  }

  if (!STUDENT_ID_PATTERN.test(input)) {
    return 'Invalid Student ID format. Student ID should be 9 digits.'
  }

  return ''
}

/**
 * 修改点 (v6 task 2)：
 * 后端返回的 interviewDate 是 ISO datetime，例如
 *   "2024-05-14T16:00:00.000+00:00"
 * 而 <input type="date"> 只接受 "YYYY-MM-DD"，
 * 不做归一化会导致原本的日期不显示，看起来像空输入框。
 *
 * 这里把 record 字段统一归一化成 input 控件能用的格式。
 */
function normalizeDateForInput(d: any): string {
  if (!d) return ''
  const s = String(d)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function normalizeTimeForInput(t: any): string {
  if (!t) return ''
  const s = String(t)
  // 后端可能返回 "14:30:00" 或 "14:30"，<input type="time"> 都能吃，
  // 但为了 UI 一致性统一截断到 HH:MM。
  const m = s.match(/^(\d{2}:\d{2})/)
  return m ? m[1] : ''
}

function normalizeRecordForEdit(r: McpRecord): McpRecord {
  return {
    ...r,
    interviewDate: normalizeDateForInput(r.interviewDate),
    interviewTime: normalizeTimeForInput(r.interviewTime),
  }
}

onMounted(async () => {
  try {
    /**
     * 修改点：
     * 直接访问 /edit-record/:studentId 时也校验 ID。
     */
    const validationError = validateStudentId(studentId)
    if (validationError) {
      errorMsg.value = validationError
      return
    }

    /**
     * 修改点 (新接口 B09 / Mentor 权限收敛)：
     * EditRecordView 只有 mentor 角色能访问，
     * 走 lookupStudent → /mentoring/records/students/search?studentId=
     * 后端校验该学生必须在 mentor 自己负责的组里，
     * 否则返回 null（前端显示 "Student not found"），
     * 防止 mentor 通过手敲 URL 去编辑别人组的学生记录。
     */
    const studentResult = await lookupStudent(studentId)

    if (!studentResult) {
      errorMsg.value = 'Student not found.'
      return
    }

    student.value = studentResult

    try {
      /**
       * 修改点 (FIX)：
       * 之前调 getRecordsByStudent → /mentoring/records/student/{id}，
       * 这个接口 Mentor 没权限。这里改用 fetchRecordsForStudent
       * （mentor 走 /mentoring/records/mine，再按 studentId 过滤）。
       */
      const fetched = await fetchRecordsForStudent(studentId)
      /**
       * 修改点 (v6 task 2)：
       * 归一化 interviewDate / interviewTime 到 input 控件能识别的格式，
       * 否则编辑页打开时日期框会空白。
       */
      records.value = fetched.map(normalizeRecordForEdit)
      originalRecords.value = fetched.map(normalizeRecordForEdit)
    } catch (recordErr: any) {
      recordMessage.value = recordErr.message?.includes('403')
          ? 'Authorization warning: You do not have permission to load interview records.'
          : 'Existing interview records could not be loaded.'
      isRecordError.value = true
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load student.'
  } finally {
    isLoading.value = false
  }
})

function addRecord() {
  records.value.push({
    recordId: undefined,

    /**
     * FIX: Use the 9-digit studentId from URL, not student.value.id.
     */
    studentId: studentId,

    interviewDate: '',
    interviewTime: '',
    problemStatement: '',
    interviewSummary: '',
    followupAction: '',
  })
}

function deleteRecord(index: number) {
  records.value.splice(index, 1)
}

function validateRecords(): boolean {
  for (const r of records.value) {
    if (
        !r.interviewDate ||
        !r.problemStatement?.trim() ||
        !r.interviewSummary?.trim() ||
        !r.followupAction?.trim()
    ) {
      message.value = 'Validation warning: Required fields cannot be empty.'
      isMsgError.value = true
      return false
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.interviewDate)) {
      message.value = 'Validation warning: Invalid date format.'
      isMsgError.value = true
      return false
    }

    if (r.problemStatement.length > 200) {
      message.value = 'Length limit warning: Problem statement is too long.'
      isMsgError.value = true
      return false
    }

    if (r.interviewSummary.length > 300) {
      message.value = 'Length limit warning: Interview summary is too long.'
      isMsgError.value = true
      return false
    }

    if (r.followupAction.length > 200) {
      message.value = 'Length limit warning: Follow-up action is too long.'
      isMsgError.value = true
      return false
    }
  }

  return true
}

async function saveRecords() {
  message.value = ''
  isMsgError.value = false

  if (!validateRecords()) return

  try {
    for (const r of records.value) {
      if (r.recordId) {
        /**
         * FIX: Existing record → updateRecord() sends only
         * { recordId, interviewSummary, followupAction }
         */
        await updateRecord({
          recordId: r.recordId,
          interviewSummary: r.interviewSummary,
          followupAction: r.followupAction,
        })
      } else {
        /**
         * FIX: New record → createRecord() sends full body.
         * Use the 9-digit studentId from URL.
         */
        await createRecord({
          studentId: studentId,
          groupId: r.groupId || '',
          interviewDate: r.interviewDate,
          interviewTime: r.interviewTime,
          problemStatement: r.problemStatement,
          interviewSummary: r.interviewSummary,
          followupAction: r.followupAction,
        })
      }
    }

    message.value = 'Interview records saved successfully.'
    isMsgError.value = false

    // Reload to get server-assigned recordIds
    try {
      const fetched = await fetchRecordsForStudent(studentId)
      /**
       * 修改点 (v6 task 2)：
       * 保存后重载同样需要归一化，否则刚保存的记录展示完
       * 立刻被服务端原始 ISO 时间字符串覆盖，日期框又会空白。
       */
      records.value = fetched.map(normalizeRecordForEdit)
      originalRecords.value = records.value.map((r) => ({ ...r }))
    } catch {
      originalRecords.value = records.value.map((r) => ({ ...r }))
    }
  } catch (err: any) {
    message.value = 'Save failed: ' + (err.message || 'Unknown error')
    isMsgError.value = true
  }
}

function cancelEdit() {
  records.value = originalRecords.value.map((r) => ({ ...r }))
  message.value = 'Unsaved changes have been discarded.'
  isMsgError.value = false
}

function goBack() {
  router.push('/search-student')
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.student-info {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.student-info p {
  word-break: break-all;
}

.record-form {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  margin-top: 14px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

input,
textarea {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

textarea {
  min-height: 80px;
}

small {
  color: #6b7280;
}

button {
  margin-top: 14px;
  margin-right: 10px;
}

.actions {
  margin-top: 24px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.error {
  color: #dc2626;
}

.empty {
  margin-top: 20px;
  color: #6b7280;
}

.warning-box {
  margin-top: 20px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
}

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}
</style>
