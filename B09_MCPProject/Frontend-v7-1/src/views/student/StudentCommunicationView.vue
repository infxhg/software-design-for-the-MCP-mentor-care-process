<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Communication</h1>
        <p>
          Current role:
          <strong>{{ roleLabel }}</strong>
        </p>
      </div>

      <button class="secondary-btn" type="button" :disabled="isLoadingMessages" @click="loadMessages">
        Refresh Messages
      </button>
    </header>

    <p v-if="messageText" class="message" :class="{ error: isError }">
      {{ messageText }}
    </p>

    <section class="layout">
      <article class="card send-card">
        <h2>Send Message</h2>

        <div v-if="!canCurrentRoleSend" class="empty-state warning">
          Authorization warning: Your role cannot send messages.
        </div>

        <template v-else>
          <div v-if="isStudentRole" class="fixed-receiver-box">
            <p class="fixed-receiver-title">Receiver</p>

            <div v-if="isLoadingReceivers" class="small-loading">
              Loading assigned mentor...
            </div>

            <div v-else-if="receiverOptions.length > 0">
              <strong>{{ formatReceiver(receiverOptions[0]) }}</strong>
              <p class="hint">
                Student can only communicate with the assigned mentor.
              </p>
            </div>

            <div v-else class="empty-state warning">
              No assigned mentor was found for this student.
            </div>
          </div>

          <template v-else>
            <label>
              Search Receiver
              <div class="search-row">
                <input
                    v-model="receiverKeyword"
                    type="text"
                    placeholder="Search by name, username, or ID"
                    @keyup.enter="loadReceivers"
                />

                <button
                    class="secondary-btn"
                    type="button"
                    :disabled="isLoadingReceivers"
                    @click="loadReceivers"
                >
                  Search
                </button>
              </div>
            </label>

            <label>
              Receiver
              <select
                  v-model="selectedRecipientIds"
                  multiple
                  size="7"
                  :disabled="isLoadingReceivers"
              >
                <option
                    v-for="receiver in receiverOptions"
                    :key="receiver.id"
                    :value="receiver.id"
                >
                  {{ formatReceiver(receiver) }}
                </option>
              </select>
            </label>
          </template>

          <p class="hint">
            Allowed receiver types:
            <strong>{{ allowedRecipientText || 'None' }}</strong>
          </p>

          <label>
            Message Content
            <textarea
                v-model="messageContent"
                rows="7"
                maxlength="500"
                placeholder="Enter message content"
            />
          </label>

          <div class="counter">
            {{ messageContent.trim().length }} / 500
          </div>

          <button
              class="primary-btn"
              type="button"
              :disabled="isSending || isLoadingReceivers || selectedRecipientIds.length === 0"
              @click="handleSend"
          >
            Send
          </button>
        </template>
      </article>

      <article class="card messages-card">
        <div class="card-title-row">
          <h2>My Messages</h2>
          <span>{{ messages.length }} item(s)</span>
        </div>

        <div v-if="isLoadingMessages" class="empty-state">
          Loading messages...
        </div>

        <div v-else-if="messages.length === 0" class="empty-state">
          No messages found.
        </div>

        <div v-else class="message-list">
          <section v-for="item in messages" :key="item.messageId || item.id" class="message-item">
            <div class="message-item-header">
              <strong>
                From: {{ item.senderId || item.fromUserId || item.from || '-' }}
              </strong>
              <span>
                {{ formatTime(item.createTime || item.createdAt || item.timestamp) }}
              </span>
            </div>

            <p>{{ item.content }}</p>

            <button
                v-if="canCurrentRoleSend && (item.senderId || item.fromUserId || item.from)"
                class="small-btn"
                type="button"
                @click="selectReplyTarget(item.senderId || item.fromUserId || item.from || '')"
            >
              Reply
            </button>
          </section>
        </div>
      </article>
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
  getAllowedRecipientTypesForRole,
  getRecipientTypeLabel,
  getRoleLabel,
  normalizeFrontendRole,
  validateMessageBeforeSend,
} from '../../utils/communicationPolicy'

const rawRole = ref(localStorage.getItem('role') || '')

const role = computed(() => normalizeFrontendRole(rawRole.value))
const isStudentRole = computed(() => role.value === 'student')
const roleLabel = computed(() => getRoleLabel(role.value))

const allowedRecipientTypes = computed(() => getAllowedRecipientTypesForRole(role.value))

const allowedRecipientText = computed(() =>
    allowedRecipientTypes.value.map((type) => getRecipientTypeLabel(type)).join(', '),
)

const canCurrentRoleSend = computed(() => allowedRecipientTypes.value.length > 0)

const messages = ref<MessageEntity[]>([])
const receiverOptions = ref<AvailableReceiver[]>([])
const selectedRecipientIds = ref<string[]>([])
const receiverKeyword = ref('')
const messageContent = ref('')

const isLoadingMessages = ref(false)
const isLoadingReceivers = ref(false)
const isSending = ref(false)

const messageText = ref('')
const isError = ref(false)

onMounted(async () => {
  await loadMessages()

  if (canCurrentRoleSend.value) {
    await loadReceivers()
  } else {
    messageText.value = 'Authorization warning: Your role cannot send messages.'
    isError.value = true
  }
})

async function loadMessages(): Promise<void> {
  isLoadingMessages.value = true

  try {
    messages.value = await listMyMessages()
  } catch (error: any) {
    messages.value = []
    messageText.value = `Failed to load messages: ${error?.message || 'Unknown error'}`
    isError.value = true
  } finally {
    isLoadingMessages.value = false
  }
}

async function loadReceivers(): Promise<void> {
  if (!canCurrentRoleSend.value) {
    receiverOptions.value = []
    selectedRecipientIds.value = []
    return
  }

  isLoadingReceivers.value = true
  messageText.value = ''
  isError.value = false

  try {
    receiverOptions.value = await getAvailableReceivers(
        isStudentRole.value ? '' : receiverKeyword.value,
    )

    const validIds = new Set(receiverOptions.value.map((receiver) => receiver.id))
    selectedRecipientIds.value = selectedRecipientIds.value.filter((id) => validIds.has(id))

    if (isStudentRole.value) {
      if (receiverOptions.value.length === 0) {
        selectedRecipientIds.value = []
        messageText.value = 'Authorization warning: No assigned mentor was found for this student.'
        isError.value = true
        return
      }

      selectedRecipientIds.value = [receiverOptions.value[0].id]
      return
    }

    if (receiverOptions.value.length === 0) {
      messageText.value = 'No available receivers found.'
      isError.value = false
    }
  } catch (error: any) {
    receiverOptions.value = []
    selectedRecipientIds.value = []
    messageText.value = `Failed to load receivers: ${error?.message || 'Unknown error'}`
    isError.value = true
  } finally {
    isLoadingReceivers.value = false
  }
}

async function handleSend(): Promise<void> {
  messageText.value = ''
  isError.value = false

  const validationMessage = validateMessageBeforeSend(
      role.value,
      selectedRecipientIds.value,
      messageContent.value,
      receiverOptions.value,
  )

  if (validationMessage) {
    messageText.value = validationMessage
    isError.value = true
    return
  }

  isSending.value = true

  try {
    await sendNormalMessage(selectedRecipientIds.value, messageContent.value, receiverOptions.value)

    messageText.value = 'Message sent successfully.'
    isError.value = false
    messageContent.value = ''

    if (!isStudentRole.value) {
      selectedRecipientIds.value = []
    }

    await loadMessages()
  } catch (error: any) {
    messageText.value = `Failed to send message: ${error?.message || 'Unknown error'}`
    isError.value = true
  } finally {
    isSending.value = false
  }
}

function selectReplyTarget(senderId: string): void {
  const id = String(senderId || '').trim()

  if (!id) {
    messageText.value = 'Warning: Cannot determine message sender.'
    isError.value = true
    return
  }

  const receiver = receiverOptions.value.find((item) => item.id === id || item.userId === id)

  if (!receiver) {
    messageText.value =
        'Warning: This sender is not in your allowed receiver list. Reply is not allowed.'
    isError.value = true
    return
  }

  selectedRecipientIds.value = [receiver.id]
  messageText.value = `Reply target selected: ${formatReceiver(receiver)}`
  isError.value = false
}

function formatReceiver(receiver: AvailableReceiver): string {
  const name = receiver.realName || receiver.name || receiver.username || receiver.id
  const type = getRecipientTypeLabel(receiver.role || receiver.type)

  return `${name} (${type}, ${receiver.id})`
}

function formatTime(value?: string): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString()
}
</script>

<style scoped>
.page {
  max-width: 1180px;
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
  color: #111827;
}

.page-header p {
  margin: 8px 0 0;
  color: #6b7280;
}

.layout {
  display: grid;
  grid-template-columns: 420px 1fr;
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

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title-row span {
  color: #6b7280;
  font-size: 14px;
}

label {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font: inherit;
  background: #ffffff;
}

textarea {
  resize: vertical;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.fixed-receiver-box {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
}

.fixed-receiver-title {
  margin: 0 0 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}

.small-loading {
  color: #6b7280;
  font-size: 14px;
}

button {
  min-height: 38px;
  padding: 8px 16px;
  border: 0;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.primary-btn {
  width: 100%;
  background: #2563eb;
  color: #ffffff;
}

.secondary-btn {
  background: #e5e7eb;
  color: #111827;
}

.small-btn {
  min-height: 30px;
  padding: 6px 12px;
  background: #eff6ff;
  color: #1d4ed8;
}

.message {
  padding: 12px 14px;
  margin: 0 0 16px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #047857;
}

.message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.hint {
  margin: 8px 0 14px;
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

.empty-state.warning {
  background: #fef2f2;
  border-radius: 12px;
  color: #b91c1c;
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

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
