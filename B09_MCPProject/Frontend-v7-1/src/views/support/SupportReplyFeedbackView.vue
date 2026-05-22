<template>
  <div class="reply-feedback-page">
    <div class="card">
      <div class="header-row">
        <div>
          <h1>Reply Users' Feedback</h1>
          <p class="desc">Respond to feedback submitted by users.</p>
        </div>

        <button class="secondary" type="button" @click="goHome">Home</button>
      </div>

      <div class="toolbar">
        <button class="primary" type="button" :disabled="loading" @click="loadFeedback">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <div v-if="loading" class="empty">Loading feedback...</div>

      <div v-else-if="feedbackList.length === 0" class="empty">
        No feedback found.
      </div>

      <div v-else class="feedback-list">
        <article v-for="item in feedbackList" :key="item.feedbackId" class="feedback-item">
          <div class="feedback-meta">
            <strong>{{ displayUser(item) }}</strong>
            <span>{{ formatDate(item.submittedAt || item.createTime || item.createdAt) }}</span>
          </div>

          <div class="content-box">
            {{ item.content || item.feedbackContent }}
          </div>

          <div v-if="isReplied(item)" class="reply-box">
            <strong>Replied:</strong>
            <span>{{ item.replyContent || item.reply }}</span>
          </div>

          <div v-else class="reply-form">
            <textarea
                v-model="replyDrafts[item.feedbackId]"
                rows="3"
                placeholder="Enter your response..."
                :disabled="replySavingId === item.feedbackId"
            />

            <button
                class="primary"
                type="button"
                :disabled="replySavingId === item.feedbackId || !replyDrafts[item.feedbackId]?.trim()"
                @click="sendReply(item)"
            >
              {{ replySavingId === item.feedbackId ? 'Sending...' : 'Send Reply' }}
            </button>
          </div>
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
import {
  listFeedback,
  replyFeedback,
  type FeedbackItem,
} from '../../api/user'

const router = useRouter()

const feedbackList = ref<FeedbackItem[]>([])
const replyDrafts = ref<Record<string, string>>({})
const loading = ref(false)
const replySavingId = ref('')
const error = ref('')
const success = ref('')

onMounted(() => {
  loadFeedback()
})

async function loadFeedback() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const rows = await listFeedback()
    feedbackList.value = rows
        .filter((item) => item.feedbackId)
        .sort((a, b) => {
          const at = new Date(a.submittedAt || a.createTime || a.createdAt || 0).getTime()
          const bt = new Date(b.submittedAt || b.createTime || b.createdAt || 0).getTime()
          return bt - at
        })

    const drafts: Record<string, string> = {}
    for (const item of feedbackList.value) {
      drafts[item.feedbackId] = ''
    }
    replyDrafts.value = drafts
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

async function sendReply(item: FeedbackItem) {
  const feedbackId = item.feedbackId
  const replyText = (replyDrafts.value[feedbackId] || '').trim()

  error.value = ''
  success.value = ''

  if (!feedbackId) {
    error.value = 'Invalid feedback ID.'
    return
  }

  if (!replyText) {
    error.value = 'Please enter your response before sending.'
    return
  }

  replySavingId.value = feedbackId

  try {
    const updated = await replyFeedback(feedbackId, replyText)

    feedbackList.value = feedbackList.value.map((row) => {
      if (row.feedbackId !== feedbackId) return row

      return {
        ...row,
        ...updated,
        feedbackId,
        reply: updated.reply || updated.replyContent || replyText,
        replyContent: updated.replyContent || updated.reply || replyText,
        status: updated.status || 'REPLIED',
      }
    })

    replyDrafts.value[feedbackId] = ''
    success.value = 'Reply sent successfully.'
  } catch (err) {
    console.error('[support feedback] failed to reply feedback:', err)
    error.value =
        err instanceof Error
            ? err.message || 'Failed to send reply.'
            : 'Failed to send reply.'
  } finally {
    replySavingId.value = ''
  }
}

function isReplied(item: FeedbackItem): boolean {
  const status = String(item.status || '').toUpperCase()
  return Boolean(item.reply || item.replyContent || status === 'REPLIED' || status === 'CLOSED')
}

function displayUser(item: FeedbackItem): string {
  const name =
      item.fromUser ||
      item.username ||
      item.userId ||
      item.fromUserId ||
      'Unknown User'

  const role = item.fromRole || item.role

  return role ? `${name} (${role})` : String(name)
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
.reply-feedback-page {
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

.feedback-meta span {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
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

.reply-form {
  margin-top: 10px;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 70px;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font: inherit;
  outline: none;
}

textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

textarea:disabled {
  background: #f8fafc;
  cursor: not-allowed;
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
  margin-top: 10px;
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

.success {
  margin: 12px 0;
  color: #047857;
}

.error {
  margin: 12px 0;
  color: #dc2626;
}

.bottom-actions {
  margin-top: 22px;
}
</style>
