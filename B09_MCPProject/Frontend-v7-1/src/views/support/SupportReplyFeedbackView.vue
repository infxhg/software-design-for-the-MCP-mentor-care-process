<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Reply Users' Feedback</h1>
        <p class="desc">Respond to feedback submitted by users.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading feedback list...</div>

    <div v-else-if="items.length === 0" class="empty">
      No pending feedback at the moment.
    </div>

    <div v-else>
      <div
          v-for="item in items"
          :key="item.feedbackId"
          class="feedback-card"
      >
        <div class="feedback-head">
          <strong>{{ item.fromUser }} ({{ item.fromRole }})</strong>
          <span class="time">{{ item.submittedAt }}</span>
        </div>

        <p class="feedback-content">{{ item.content }}</p>

        <div v-if="item.status === 'pending'">
          <textarea
              v-model="replies[item.feedbackId]"
              rows="3"
              maxlength="500"
              placeholder="Enter your response..."
          ></textarea>

          <button
              :disabled="replyingId === item.feedbackId"
              @click="sendReply(item.feedbackId)"
          >
            {{ replyingId === item.feedbackId ? 'Sending...' : 'Send Reply' }}
          </button>
        </div>

        <div v-else class="replied">
          <p><strong>Replied:</strong> {{ item.reply }}</p>
        </div>
      </div>
    </div>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>

    <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface FeedbackItem {
  feedbackId: string
  fromUser: string
  fromRole: string
  content: string
  submittedAt: string
  status: 'pending' | 'replied'
  reply?: string
}

const items = ref<FeedbackItem[]>([])
const replies = reactive<Record<string, string>>({})
const isLoading = ref(true)
const message = ref('')
const isError = ref(false)
const replyingId = ref('')

onMounted(async () => {
  /**
   * Mock list. Real impl: GET /api/support/feedback
   */
  await new Promise((r) => setTimeout(r, 250))

  items.value = [
    {
      feedbackId: 'fb001',
      fromUser: 'Sugar',
      fromRole: 'student',
      content: 'The system sometimes loads slowly during peak hours.',
      submittedAt: '2026-04-15 14:30',
      status: 'pending',
    },
    {
      feedbackId: 'fb002',
      fromUser: 'Mary Lee',
      fromRole: 'mentor',
      content: 'Can we have a richer text editor in interview records?',
      submittedAt: '2026-04-10 09:15',
      status: 'replied',
      reply: 'Thanks for the suggestion, we are working on it.',
    },
  ]

  isLoading.value = false
})

async function sendReply(feedbackId: string) {
  message.value = ''
  isError.value = false

  const r = (replies[feedbackId] || '').trim()
  if (!r) {
    message.value = 'Warning: Reply content cannot be empty.'
    isError.value = true
    return
  }

  replyingId.value = feedbackId

  try {
    /**
     * Mock send. Real impl: POST /api/support/feedback/{id}/reply { content }
     */
    await new Promise((res) => setTimeout(res, 300))

    const item = items.value.find((i) => i.feedbackId === feedbackId)
    if (item) {
      item.status = 'replied'
      item.reply = r
    }
    replies[feedbackId] = ''
    message.value = 'Reply sent.'
  } catch (err: any) {
    message.value = err.message || 'Failed to send reply.'
    isError.value = true
  } finally {
    replyingId.value = ''
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.feedback-card {
  padding: 16px; margin-top: 14px;
  background: white; border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.feedback-head { display: flex; justify-content: space-between; }
.time { color: #6b7280; font-size: 13px; }

.feedback-content {
  margin: 10px 0; padding: 10px;
  background: #f9fafb; border-radius: 6px;
}

textarea {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-family: inherit; margin-bottom: 10px;
}

.replied {
  margin-top: 10px; padding: 10px;
  background: #dcfce7; color: #15803d; border-radius: 6px;
}

.buttons { margin-top: 22px; }
.empty, .loading { color: #6b7280; padding: 20px 0; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
