<template>
  <section class="page-card">
    <div class="header">
      <div>
        <h1>Communication</h1>
        <p class="desc">
          Search allowed recipients, send messages, and read message details. Reading a message detail marks it as read.
        </p>
      </div>
      <button class="secondary" :disabled="loadingMessages" @click="loadMessages">
        {{ loadingMessages ? 'Loading...' : 'Refresh Messages' }}
      </button>
    </div>

    <section class="grid">
      <div class="card">
        <h2>Compose Message</h2>
        <p class="hint">
          Current role: <strong>{{ role }}</strong>.
          Mentor should search by Student ID or name; Student can usually leave the keyword empty to find their mentor.
        </p>

        <label>
          Recipient Keyword
          <input
            v-model.trim="receiverKeyword"
            placeholder="Student ID / name / email"
            @keyup.enter="searchReceivers"
          />
        </label>

        <div class="actions">
          <button class="secondary" :disabled="loadingReceivers" @click="searchReceivers">
            {{ loadingReceivers ? 'Searching...' : 'Search Recipients' }}
          </button>
        </div>

        <label>
          Recipients
          <select v-model="selectedRecipientIds" multiple size="6">
            <option v-for="receiver in receivers" :key="receiver.id" :value="receiver.id">
              {{ receiverLabel(receiver) }}
            </option>
          </select>
        </label>

        <label>
          Message Content
          <textarea
            v-model="content"
            rows="6"
            maxlength="500"
            placeholder="Maximum 500 characters"
          />
          <small>{{ content.length }}/500</small>
        </label>

        <p v-if="composeMessage" class="message" :class="{ error: composeError }">
          {{ composeMessage }}
        </p>

        <button class="primary" :disabled="sending" @click="send">
          {{ sending ? 'Sending...' : 'Send Message' }}
        </button>
      </div>

      <div class="card">
        <div class="bar">
          <h2>Unread</h2>
          <span class="unread">{{ unreadCount }}</span>
        </div>

        <div v-if="selectedMessage" class="detail">
          <h3>Selected Message</h3>
          <p><strong>From:</strong> {{ selectedMessage.senderName || selectedMessage.senderId || selectedMessage.fromUserId || '-' }}</p>
          <p><strong>To:</strong> {{ selectedMessage.receiverName || selectedMessage.receiverId || selectedMessage.toUserId || '-' }}</p>
          <p><strong>Time:</strong> {{ formatDateTime(selectedMessage.createTime || selectedMessage.createdAt || selectedMessage.timestamp) }}</p>
          <p class="content">{{ selectedMessage.content || selectedMessage.message }}</p>
        </div>

        <p v-else class="empty">Select a message from the list to view details.</p>
      </div>
    </section>

    <section class="card">
      <div class="bar">
        <h2>Message List</h2>
        <span class="hint">{{ messages.length }} message(s)</span>
      </div>

      <p v-if="listMessage" class="message error">{{ listMessage }}</p>

      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>From</th>
            <th>To</th>
            <th>Content</th>
            <th>Status</th>
            <th>Operation</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="msg in messages" :key="msg.messageId || msg.id">
            <td>{{ formatDateTime(msg.createTime || msg.createdAt || msg.timestamp) }}</td>
            <td>{{ msg.senderName || msg.senderId || msg.fromUserId || '-' }}</td>
            <td>{{ msg.receiverName || msg.receiverId || msg.toUserId || '-' }}</td>
            <td>{{ truncate(msg.content || msg.message, 90) }}</td>
            <td>{{ msg.read === false ? 'Unread' : msg.status || 'Read/Unknown' }}</td>
            <td>
              <button class="secondary small" @click="openMessage(msg.messageId || msg.id)">View</button>
            </td>
          </tr>

          <tr v-if="messages.length === 0">
            <td colspan="6" class="empty">No messages.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getAvailableReceivers,
  getMessageDetail,
  getUnreadMessageCount,
  listMyMessages,
  sendNormalMessage,
  type AvailableReceiver,
  type MessageEntity,
} from '../api/communication'
import { getRole } from '../types'

const role = getRole()

const receiverKeyword = ref('')
const receivers = ref<AvailableReceiver[]>([])
const selectedRecipientIds = ref<string[]>([])
const content = ref('')

const messages = ref<MessageEntity[]>([])
const selectedMessage = ref<MessageEntity | null>(null)
const unreadCount = ref(0)

const loadingReceivers = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)

const composeMessage = ref('')
const composeError = ref(false)
const listMessage = ref('')

onMounted(async () => {
  await Promise.all([loadMessages(), searchReceivers()])
})

async function searchReceivers() {
  composeMessage.value = ''
  composeError.value = false
  loadingReceivers.value = true

  try {
    receivers.value = await getAvailableReceivers(receiverKeyword.value)
    selectedRecipientIds.value = selectedRecipientIds.value.filter((id) =>
      receivers.value.some((receiver) => receiver.id === id),
    )

    if (receivers.value.length === 0) {
      composeMessage.value = role === 'mentor'
        ? 'No recipients found. For Mentor, enter a student ID/name in your groups and search.'
        : 'No recipients found for your current role and keyword.'
      composeError.value = true
    }
  } catch (err: any) {
    composeMessage.value = toFriendlyError(err, 'Failed to load recipients.')
    composeError.value = true
  } finally {
    loadingReceivers.value = false
  }
}

async function loadMessages() {
  listMessage.value = ''
  loadingMessages.value = true

  try {
    const [list, count] = await Promise.all([
      listMyMessages(),
      getUnreadMessageCount().catch(() => 0),
    ])

    messages.value = list.sort((a, b) =>
      String(b.createTime || b.createdAt || b.timestamp || '').localeCompare(
        String(a.createTime || a.createdAt || a.timestamp || ''),
      ),
    )
    unreadCount.value = count
  } catch (err: any) {
    listMessage.value = toFriendlyError(err, 'Failed to load messages.')
  } finally {
    loadingMessages.value = false
  }
}

async function openMessage(messageId: string) {
  if (!messageId) return

  try {
    selectedMessage.value = await getMessageDetail(messageId)
    await loadMessages()
  } catch (err: any) {
    window.alert(toFriendlyError(err, 'Failed to load message detail.'))
  }
}

async function send() {
  composeMessage.value = ''
  composeError.value = false

  const validation = validateMessage()
  if (validation) {
    composeMessage.value = validation
    composeError.value = true
    return
  }

  sending.value = true

  try {
    await sendNormalMessage(selectedRecipientIds.value, content.value, receivers.value)
    content.value = ''
    selectedRecipientIds.value = []
    composeMessage.value = 'Message sent successfully.'
    composeError.value = false
    await loadMessages()
  } catch (err: any) {
    composeMessage.value = toFriendlyError(err, 'Send failed.')
    composeError.value = true
  } finally {
    sending.value = false
  }
}

function validateMessage(): string {
  const text = content.value.trim()

  if (selectedRecipientIds.value.length === 0) return 'Please select at least one recipient.'
  if (!text) return 'Message content cannot be empty.'
  if (text.length > 500) return 'Message content cannot exceed 500 characters.'
  if (/<script|<\/script|javascript:|on\w+=|<iframe|<\/iframe/i.test(text)) {
    return 'Message content contains unsafe HTML or script.'
  }

  const uniqueIds = new Set(selectedRecipientIds.value)
  if (uniqueIds.size !== selectedRecipientIds.value.length) return 'Duplicate recipients are not allowed.'

  return ''
}

function receiverLabel(receiver: AvailableReceiver): string {
  const name = receiver.realName || receiver.name || receiver.username || receiver.id
  const roleText = receiver.type || receiver.role || 'user'
  const extra = receiver.email ? ` · ${receiver.email}` : ''
  return `${name} (${roleText})${extra}`
}

function formatDateTime(value: unknown): string {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function truncate(value: unknown, length: number): string {
  const text = String(value ?? '')
  return text.length > length ? `${text.slice(0, length)}...` : text
}

function toFriendlyError(err: any, fallback: string): string {
  const text = String(err?.message || err || '')
  if (/401|unauthor/i.test(text)) return 'Session expired or unauthorized. Please login again.'
  if (/403|forbidden|permission|access/i.test(text)) {
    return 'Authorization warning: you are not allowed to perform this communication action.'
  }
  return text || fallback
}
</script>

<style scoped>
.header,
.actions,
.bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header,
.bar {
  justify-content: space-between;
}

.desc,
.hint,
.empty,
small {
  color: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(260px, 0.8fr);
  gap: 16px;
  margin-top: 18px;
}

.card {
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-sizing: border-box;
}

textarea {
  resize: vertical;
}

button {
  width: fit-content;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.secondary {
  background: #f8fafc;
}

.small {
  padding: 6px 10px;
  font-size: 12px;
}

.unread {
  min-width: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  text-align: center;
  font-weight: 700;
}

.detail {
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.content {
  white-space: pre-wrap;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
}

.message {
  color: #047857;
}

.error {
  color: #b42318;
}

@media (max-width: 900px) {
  .header,
  .bar,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
