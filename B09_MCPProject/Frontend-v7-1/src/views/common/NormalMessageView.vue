<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Normal Message</h1>
        <p class="desc">Send a normal text message to one or more receivers.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <section class="section">
      <h2>Inbox</h2>

      <p v-if="messages.length === 0" class="empty">No messages.</p>

      <ul v-else class="message-list">
        <li v-for="msg in messages" :key="msg.messageId" class="message-row">
          <div class="message-from">
            <strong>{{ msg.senderName }}</strong>
            <span class="time">{{ msg.timestamp }}</span>
          </div>
          <p class="message-content">{{ msg.content }}</p>
        </li>
      </ul>
    </section>

    <section class="section">
      <h2>Send a New Message</h2>

      <div class="form-item">
        <label>Receivers</label>
        <div class="receivers">
          <label
              v-for="r in availableReceivers"
              :key="r.id"
              class="receiver-checkbox"
          >
            <input
                type="checkbox"
                :value="r.id"
                v-model="selectedReceiverIds"
            />
            <span>{{ r.name }}</span>
          </label>
        </div>
      </div>

      <div class="form-item">
        <label>Message Content</label>
        <textarea
            v-model="messageContent"
            rows="5"
            maxlength="500"
            placeholder="Type your message..."
        ></textarea>
        <small>{{ messageContent.length }}/500</small>
      </div>

      <div class="buttons">
        <button :disabled="isLoading" @click="sendMessage">
          {{ isLoading ? 'Sending...' : 'Send' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listMyMessages, sendNormalMessage } from '../../api/communication'
import type { MessageEntity } from '../../api/communication'

const router = useRouter()

const messages = ref<MessageEntity[]>([])
const selectedReceiverIds = ref<string[]>([])
const messageContent = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

/**
 * 受众列表（mock 数据兜底）。
 *
 * 实际后端到位后应该按当前 role 动态拉：
 *   - mentor       → 我组内学生 + MCP coordinator
 *   - student      → 我的 mentor
 *   - coordinator  → 同系 mentor + faculty consultant
 *   - consultant   → 同 faculty 全部 coordinator + mentor
 */
const availableReceivers = ref<Array<{ id: string; name: string }>>([
  { id: '210000001', name: 'Sugar' },
  { id: '123456789', name: 'Bnbuer' },
  { id: '987654321', name: 'Uicer' },
])

onMounted(async () => {
  try {
    messages.value = await listMyMessages()
  } catch (err: any) {
    message.value = 'Failed to load messages: ' + (err.message || 'Unknown error')
    isError.value = true
  }
})

async function sendMessage() {
  message.value = ''
  isError.value = false

  try {
    isLoading.value = true
    await sendNormalMessage(selectedReceiverIds.value, messageContent.value)
    message.value = 'Message sent successfully.'
    messageContent.value = ''
    selectedReceiverIds.value = []
  } catch (err: any) {
    message.value = err.message || 'Failed to send message.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.section { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e7eb; }
.section h2 { font-size: 18px; margin-bottom: 14px; }

.message-list { list-style: none; padding: 0; }
.message-row {
  padding: 14px; margin-bottom: 10px;
  background: #f9fafb; border-radius: 8px;
}
.message-from { display: flex; justify-content: space-between; }
.time { color: #6b7280; font-size: 13px; }
.message-content { margin-top: 6px; color: #374151; }

.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
.receivers { display: flex; flex-wrap: wrap; gap: 14px; }
.receiver-checkbox { font-weight: normal; cursor: pointer; }
.receiver-checkbox input { margin-right: 4px; }

textarea {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-family: inherit;
}
small { color: #6b7280; }
.buttons { margin-top: 16px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.empty { color: #6b7280; }
</style>
