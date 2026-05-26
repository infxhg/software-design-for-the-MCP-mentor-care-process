<template>
  <div class="feedback-page">
    <div class="card">
      <div class="header-row">
        <div>
          <h1>View Users' Feedback</h1>
          <p class="desc">
            The current backend API supports viewing submitted feedback, but does not provide a
            reply/update endpoint. This page is read-only to avoid fake replies or Not Found errors.
          </p>
        </div>

        <button class="secondary" type="button" @click="goHome">Home</button>
      </div>

      <div class="toolbar">
        <button class="primary" type="button" :disabled="loading" @click="loadFeedback">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="loading" class="empty">Loading feedback...</div>

      <div v-else-if="feedbackList.length === 0" class="empty">
        No feedback found.
      </div>

      <div v-else class="feedback-list">
        <article
          v-for="item in feedbackList"
          :key="item.feedbackId || String(item.id)"
          class="feedback-item"
        >
          <div class="feedback-meta">
            <div>
              <strong>{{ displayUser(item) }}</strong>
              <span class="role" v-if="displayRole(item)">{{ displayRole(item) }}</span>
            </div>

            <div class="meta-right">
              <span :class="['status', statusClass(item)]">{{ statusText(item) }}</span>
              <span class="date">
                {{ formatDate(item.submittedAt || item.createTime || item.createdAt) }}
              </span>
            </div>
          </div>

          <div class="content-box">
            {{ item.content || item.feedbackContent || '-' }}
          </div>

          <div v-if="item.reply || item.replyContent" class="reply-box">
            <strong>Existing reply:</strong>
            <span>{{ item.replyContent || item.reply }}</span>
          </div>

          <p v-else class="readonly-note">
            Reply action is hidden because the backend API document only provides feedback submit/list
            endpoints, not a real reply endpoint.
          </p>
        </article>
      </div>

      <div class="bottom-actions">
        <button class="secondary" type="button" @click="goBack">Back</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listFeedback, type FeedbackItem } from '../../api/user'

const router = useRouter()

const feedbackList = ref<FeedbackItem[]>([])
const loading = ref(false)
const error = ref('')

onMounted(() => {
  loadFeedback()
})

async function loadFeedback() {
  loading.value = true
  error.value = ''

  try {
    const rows = await listFeedback()

    feedbackList.value = rows
      .filter((item) => Boolean(item.feedbackId || item.id || item.content || item.feedbackContent))
      .sort((a, b) => {
        const at = new Date(a.submittedAt || a.createTime || a.createdAt || 0).getTime()
        const bt = new Date(b.submittedAt || b.createTime || b.createdAt || 0).getTime()
        return bt - at
      })
  } catch (err) {
    console.error('[support feedback] failed to load feedback:', err)
    error.value =
      err instanceof Error
        ? err.message || 'Failed to load feedback.'
        : 'Failed to load feedback.'
  } finally {
    loading.value = false
  }
}

function displayUser(item: FeedbackItem): string {
  const name =
    item.fromUser ||
    item.username ||
    item.userId ||
    item.fromUserId ||
    'Unknown User'

  return String(name)
}

function displayRole(item: FeedbackItem): string {
  return String(item.fromRole || item.role || '').trim()
}

function statusText(item: FeedbackItem): string {
  const status = String(item.status || '').trim()

  if (status) return status.toUpperCase()
  if (item.reply || item.replyContent) return 'REPLIED'

  return 'PENDING'
}

function statusClass(item: FeedbackItem): string {
  const status = statusText(item)

  if (status === 'REPLIED' || status === 'CLOSED' || status === 'RESOLVED') {
    return 'status-done'
  }

  return 'status-pending'
}

function formatDate(value?: string): string {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.feedback-page {
  max-width: 960px;
  margin: 0 auto;
}

.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 48px 28px 28px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

h1 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: 32px;
  line-height: 1.2;
}

.desc {
  margin: 0;
  max-width: 720px;
  color: #64748b;
}

.toolbar {
  margin-top: 30px;
  margin-bottom: 16px;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feedback-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.feedback-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #0f172a;
}

.role {
  display: inline-block;
  margin-left: 8px;
  color: #64748b;
  font-size: 13px;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}

.status {
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-done {
  background: #dcfce7;
  color: #047857;
}

.content-box {
  margin-top: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  white-space: pre-wrap;
}

.reply-box {
  margin-top: 10px;
  padding: 14px 12px;
  background: #dcfce7;
  color: #047857;
  border-radius: 6px;
  white-space: pre-wrap;
}

.reply-box strong {
  display: block;
  margin-bottom: 6px;
}

.readonly-note {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 13px;
}

button {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
}

.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary {
  background: #6b7280;
}

.secondary:hover:not(:disabled) {
  background: #4b5563;
}

.empty {
  padding: 24px 0;
  color: #64748b;
}

.error {
  margin: 12px 0;
  color: #dc2626;
}

.bottom-actions {
  margin-top: 22px;
}
</style>
