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
          <p><strong>Student ID:</strong> {{ student.studentId || student.id || studentId }}</p>
          <p><strong>Username:</strong> {{ student.username }}</p>
          <p><strong>Name:</strong> {{ student.realName || student.username }}</p>
          <p><strong>Email:</strong> {{ student.email || 'N/A' }}</p>
          <p><strong>Phone:</strong> {{ student.phone || 'N/A' }}</p>
          <p><strong>Group ID:</strong> {{ student.groupId || 'N/A' }}</p>
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

          <!--
            修改点 (v9)：
            Delete 按钮在请求过程中禁用，避免重复点击发起多次 DELETE 请求。
          -->
          <button
              class="danger"
              :disabled="deletingIndex === index"
              @click="deleteRecord(index)"
          >
            {{ deletingIndex === index ? 'Deleting...' : 'Delete' }}
          </button>
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
import {
  lookupStudent,
  fetchRecordsForStudent,
  createRecord,
  updateRecord,
  deleteRecord as deleteRecordApi,
} from '../api/mentoring'
import { getRole } from '../types'
import { getStrictStudentIdValidationMessage } from '../api/mentoring'
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

/**
 * 修改点 (v9)：
 * 记录当前正在删除的条目下标，用于禁用对应的 Delete 按钮。
 * -1 表示当前没有在删除任何条目。
 */
const deletingIndex = ref<number>(-1)

const canEdit = computed(() => getRole() === 'mentor')

function validateStudentId(input: string): string {
  return getStrictStudentIdValidationMessage(input)
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
  return m?.[1] ?? ''
}

function normalizeTimeForInput(t: any): string {
  if (!t) return ''
  const s = String(t)
  // 后端可能返回 "14:30:00" 或 "14:30"，<input type="time"> 都能吃，
  // 但为了 UI 一致性统一截断到 HH:MM。
  const m = s.match(/^(\d{2}:\d{2})/)
  return m?.[1] ?? ''
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
    groupId: student.value?.groupId || '',
  })
}

function getRecordId(record: McpRecord): string {
  return String(record.recordId || record.id || '').trim()
}

function normalizeComparableText(value: unknown): string {
  return String(value || '').trim()
}

function findOriginalRecord(record: McpRecord): McpRecord | undefined {
  const id = getRecordId(record)
  if (!id) return undefined
  return originalRecords.value.find((item) => getRecordId(item) === id)
}

function hasRecordChanged(record: McpRecord): boolean {
  const original = findOriginalRecord(record)
  if (!original) return true

  return (
      normalizeComparableText(record.groupId || student.value?.groupId) !== normalizeComparableText(original.groupId || student.value?.groupId) ||
      normalizeComparableText(record.interviewDate) !== normalizeComparableText(original.interviewDate) ||
      normalizeComparableText(record.interviewTime) !== normalizeComparableText(original.interviewTime) ||
      normalizeComparableText(record.problemStatement) !== normalizeComparableText(original.problemStatement) ||
      normalizeComparableText(record.interviewSummary) !== normalizeComparableText(original.interviewSummary) ||
      normalizeComparableText(record.followupAction ?? record.followUpAction) !==
      normalizeComparableText(original.followupAction ?? original.followUpAction)
  )
}

/**
 * 修改点 (v9)：
 * 接入 DELETE /api/mentoring/records/{recordId} 接口。
 *
 * 两种情况分别处理：
 *   - 未保存的新增条目（recordId === undefined）
 *     → 不调接口，直接 splice，不需要二次确认（用户都没存过）。
 *   - 已持久化条目（有 recordId）
 *     → 二次确认 → 调 DELETE 接口 → 成功后从 records 和 originalRecords 都移除。
 *
 * originalRecords 也必须同步移除，否则点 Cancel 会把刚删的条目"复活"回 UI，
 * 但数据库里其实已经没有了。
 */
async function deleteRecord(index: number) {
  message.value = ''
  isMsgError.value = false

  const r = records.value[index]
  if (!r) return

  const recordId = getRecordId(r)

  // 未持久化条目：本地移除即可
  if (!recordId) {
    records.value.splice(index, 1)
    return
  }

  // 已持久化条目：先确认
  const ok = window.confirm(
      `Delete interview record #${index + 1}? This cannot be undone.`,
  )
  if (!ok) return

  const ridToDelete = recordId
  deletingIndex.value = index

  try {
    await deleteRecordApi(ridToDelete)

    // 成功 → 从两个数组里都移除
    // 用 recordId 反查 index，避免在 await 过程中数组被其它操作修改导致下标错位
    const liveIdx = records.value.findIndex((x) => getRecordId(x) === ridToDelete)
    if (liveIdx >= 0) {
      records.value.splice(liveIdx, 1)
    }

    const origIdx = originalRecords.value.findIndex((x) => getRecordId(x) === ridToDelete)
    if (origIdx >= 0) {
      originalRecords.value.splice(origIdx, 1)
    }

    message.value = 'Interview record deleted.'
    isMsgError.value = false
  } catch (err: any) {
    if (err.message?.includes('401')) {
      message.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403')) {
      message.value = 'Authorization warning: You are not allowed to delete this record.'
    } else if (err.message?.includes('404')) {
      // 后端已经没有这条 → 视为删除成功，把本地也清掉
      const liveIdx = records.value.findIndex((x) => getRecordId(x) === ridToDelete)
      if (liveIdx >= 0) records.value.splice(liveIdx, 1)
      const origIdx = originalRecords.value.findIndex((x) => getRecordId(x) === ridToDelete)
      if (origIdx >= 0) originalRecords.value.splice(origIdx, 1)

      message.value = 'Interview record deleted.'
      isMsgError.value = false
    } else {
      message.value = 'Delete failed: ' + (err.message || 'Unknown error')
      isMsgError.value = true
    }
  } finally {
    deletingIndex.value = -1
  }
}

function validateRecords(): boolean {
  for (const r of records.value) {
    if (
        !r.interviewDate ||
        !r.interviewTime ||
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

    if (!/^\d{2}:\d{2}$/.test(String(r.interviewTime))) {
      message.value = 'Validation warning: Invalid time format.'
      isMsgError.value = true
      return false
    }

    if ((r.problemStatement || '').length > 200) {
      message.value = 'Length limit warning: Problem statement is too long.'
      isMsgError.value = true
      return false
    }

    if ((r.interviewSummary || '').length > 300) {
      message.value = 'Length limit warning: Interview summary is too long.'
      isMsgError.value = true
      return false
    }

    if ((r.followupAction || '').length > 200) {
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

  if (records.value.length === 0) {
    message.value = 'No interview records to save.'
    isMsgError.value = false
    return
  }

  try {
    let createdCount = 0
    let replacedCount = 0
    let skippedCount = 0

    for (const r of records.value) {
      const base = {
        studentId: studentId,
        groupId: r.groupId || student.value?.groupId || '',
        interviewDate: r.interviewDate,
        interviewTime: r.interviewTime,
        problemStatement: r.problemStatement,
        interviewSummary: r.interviewSummary,
        followupAction: r.followupAction,
      }

      const recordId = getRecordId(r)

      if (recordId) {
        if (!hasRecordChanged(r)) {
          skippedCount += 1
          continue
        }

        // Updated API: POST /api/mentoring/records is create-only now.
        // updateRecord() in api/mentoring.ts simulates replace by creating the new
        // version first, then deleting the old recordId.
        await updateRecord({ recordId, ...base })
        replacedCount += 1
      } else {
        await createRecord(base)
        createdCount += 1
      }
    }

    const parts: string[] = []
    if (createdCount) parts.push(`${createdCount} created`)
    if (replacedCount) parts.push(`${replacedCount} replaced`)
    if (skippedCount) parts.push(`${skippedCount} unchanged`)

    message.value = `Interview records saved successfully${parts.length ? ` (${parts.join(', ')}).` : '.'}`
    isMsgError.value = false

    // Reload to get server-assigned recordIds
    try {
      const fetched = await fetchRecordsForStudent(studentId)
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
  /**
   * 修改点 (FIX)：
   * 之前直接 router.push('/search-student')，不带任何参数，
   * 导致搜索页重新挂载成空白页，用户得重新输入学生 ID。
   *
   * 现在把当前学生 ID 通过 query (?sid=) 带回去，
   * 搜索页 onMounted 时会自动回填并重新搜索一次，
   * 用户回到"已经搜过该学生"的页面，可以直接再次点 Edit。
   */
  router.push({ path: '/search-student', query: { sid: studentId } })
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

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
