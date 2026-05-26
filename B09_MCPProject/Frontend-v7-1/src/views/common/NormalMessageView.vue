<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Normal Message</h1>
        <p>
          Send messages according to your role permission.
          Current role: <strong>{{ roleLabel }}</strong>
        </p>
      </div>

      <button class="secondary-btn" type="button" :disabled="isLoading" @click="loadPageData">
        Refresh
      </button>
    </header>

    <p v-if="notice" class="message" :class="{ error: isError }">
      {{ notice }}
    </p>

    <section class="layout">
      <form class="card" @submit.prevent="handleSend">
        <h2>Send Message</h2>

        <p class="hint">
          Allowed receiver types:
          <strong>{{ allowedReceiverText }}</strong>
        </p>

        <label>
          Search receiver
          <div class="search-row">
            <input
              v-model="keyword"
              type="text"
              placeholder="Search by name, username, or student ID"
              @keyup.enter.prevent="loadReceivers"
            />
            <button class="secondary-btn" type="button" :disabled="isLoadingReceivers" @click="loadReceivers">
              Search
            </button>
          </div>
        </label>

        <label>
          Receiver
          <select v-model="selectedRecipientId" :disabled="isSending || receiverOptions.length === 0">
            <option value="">Select one receiver</option>
            <option
              v-for="receiver in receiverOptions"
              :key="receiver.id"
              :value="receiver.id"
            >
              {{ formatReceiver(receiver) }}
            </option>
          </select>
        </label>

        <label>
          Content
          <textarea
            v-model="content"
            :maxlength="MAX_MESSAGE_LENGTH"
            rows="7"
            placeholder="Enter message content"
            :disabled="isSending"
          />
        </label>

        <p class="counter">
          {{ content.trim().length }} / {{ MAX_MESSAGE_LENGTH }}
        </p>

        <button class="primary-btn" type="submit" :disabled="isSending">
          {{ isSending ? 'Sending...' : 'Send' }}
        </button>
      </form>

      <section class="card">
        <div class="card-header">
          <h2>My Messages</h2>
          <button class="secondary-btn" type="button" :disabled="isLoadingMessages" @click="loadMessages">
            Reload
          </button>
        </div>

        <div v-if="isLoadingMessages" class="empty-state">
          Loading messages...
        </div>

        <div v-else-if="messages.length === 0" class="empty-state">
          No messages.
        </div>

        <div v-else class="message-list">
          <article v-for="message in messages" :key="message.messageId || message.id" class="message-item">
            <div class="message-item-header">
              <strong>From: {{ message.senderId || message.fromUserId || message.from || '-' }}</strong>
              <span>{{ formatTime(message.createTime || message.createdAt || message.timestamp) }}</span>
            </div>

            <p>{{ message.content }}</p>

            <small>
              Status: {{ message.status || (message.read ? 'Read' : 'Unread') }}
            </small>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getAvailableReceivers,
  listMyMessages,
  sendNormalMessage,
  type AvailableReceiver,
  type MessageEntity,
} from '../../api/communication'
import {
  MAX_MESSAGE_LENGTH,
  getAllowedRecipientTypesForRole,
  getRecipientType,
  getRecipientTypeLabel,
  getRoleLabel,
  validateMessageBeforeSend,
} from '../../utils/communicationPolicy'

const messages = ref<MessageEntity[]>([])
const receiverOptions = ref<AvailableReceiver[]>([])
const selectedRecipientId = ref('')
const keyword = ref('')
const content = ref('')

const isLoading = ref(false)
const isLoadingReceivers = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const notice = ref('')
const isError = ref(false)

const currentRole = computed(() => localStorage.getItem('role') || 'unknown')
const roleLabel = computed(() => getRoleLabel(currentRole.value))

const allowedReceiverText = computed(() => {
  const allowedTypes = getAllowedRecipientTypesForRole(currentRole.value)

  if (!allowedTypes.length) {
    return 'None'
  }

  return allowedTypes.map(getRecipientTypeLabel).join(', ')
})

onMounted(() => {
  loadPageData()
})

async function loadPageData(): Promise<void> {
  isLoading.value = true

  try {
    await Promise.all([loadReceivers(), loadMessages()])
  } finally {
    isLoading.value = false
  }
}

async function loadReceivers(): Promise<void> {
  isLoadingReceivers.value = true

  try {
    const list = await getAvailableReceivers(keyword.value)
    receiverOptions.value = list
    selectedRecipientId.value = ''

    if (!list.length) {
      showNotice(
        'No available receivers found for your role. If this is unexpected, check backend receiver endpoints and role data.',
        false,
      )
    }
  } catch (error: any) {
    receiverOptions.value = []
    selectedRecipientId.value = ''
    showNotice(`Failed to load receivers: ${error?.message || 'Unknown error'}`, true)
  } finally {
    isLoadingReceivers.value = false
  }
}

async function loadMessages(): Promise<void> {
  isLoadingMessages.value = true

  try {
    messages.value = await listMyMessages()
  } catch (error: any) {
    messages.value = []
    showNotice(`Failed to load messages: ${error?.message || 'Unknown error'}`, true)
  } finally {
    isLoadingMessages.value = false
  }
}

async function handleSend(): Promise<void> {
  notice.value = ''
  isError.value = false

  const selectedIds = selectedRecipientId.value ? [selectedRecipientId.value] : []

  const validationMessage = validateMessageBeforeSend(
    currentRole.value,
    selectedIds,
    content.value,
    receiverOptions.value,
  )

  if (validationMessage) {
    showNotice(validationMessage, true)
    return
  }

  isSending.value = true

  try {
    await sendNormalMessage(selectedIds, content.value, receiverOptions.value)

    content.value = ''
    selectedRecipientId.value = ''
    showNotice('Message sent successfully.', false)
    await loadMessages()
  } catch (error: any) {
    showNotice(`Failed to send message: ${error?.message || 'Unknown error'}`, true)
  } finally {
    isSending.value = false
  }
}

function formatReceiver(receiver: AvailableReceiver): string {
  const name = receiver.realName || receiver.name || receiver.username || receiver.id
  const type = getRecipientType(receiver)
  const label = getRecipientTypeLabel(type)
  const extra = receiver.email ? `, ${receiver.email}` : ''

  return `${name} (${label}, ${receiver.id}${extra})`
}

function formatTime(value?: string | null): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString()
}

function showNotice(message: string, error: boolean): void {
  notice.value = message
  isError.value = error
}
</script>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #1f2937;
}

.page-header p {
  margin: 8px 0 0;
  color: #6b7280;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 20px;
}

.card {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.card h2 {
  margin: 0 0 16px;
  color: #111827;
  font-size: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.card-header h2 {
  margin: 0;
}

label {
  display: block;
  margin-bottom: 16px;
  color: #374151;
  font-weight: 600;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  color: #111827;
  background: #ffffff;
}

textarea {
  resize: vertical;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.primary-btn,
.secondary-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.secondary-btn {
  background: #e5e7eb;
  color: #111827;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.message {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #047857;
}

.message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.hint {
  margin: -4px 0 14px;
  color: #6b7280;
  font-size: 13px;
}

.counter {
  margin: -8px 0 14px;
  text-align: right;
  color: #6b7280;
  font-size: 13px;
}

.empty-state {
  padding: 36px 16px;
  text-align: center;
  color: #6b7280;
}

.message-list {
  display: grid;
  gap: 14px;
}

.message-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
}

.message-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  color: #374151;
}

.message-item-header span {
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.message-item p {
  margin: 12px 0;
  color: #111827;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-item small {
  color: #6b7280;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }

  .search-row {
    grid-template-columns: 1fr;
  }
}
</style>
