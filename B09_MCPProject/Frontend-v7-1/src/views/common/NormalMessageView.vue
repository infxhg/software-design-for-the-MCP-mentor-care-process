<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-text">
        <h1>Communication Center</h1>
        <p>
          Current Role:
          <strong>{{ roleLabel }}</strong>
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-outline" type="button" :disabled="isLoading" @click="loadPageData">
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button class="btn btn-outline" type="button" @click="goHome">Home</button>
      </div>
    </header>

    <div v-if="notice" class="notice-banner" :class="{ 'error-banner': isError }">
      {{ notice }}
      <button class="close-btn" type="button" @click="notice = ''">&times;</button>
    </div>

    <div v-if="isSupportOrAdmin" class="alert-box">
      Authorization Warning: Supporting Staff and Admin roles are not permitted to send messages.
    </div>

    <div v-else class="workspace">
      <section class="card compose-section">
        <div class="card-header">
          <h2>Compose Message</h2>
        </div>

        <form class="form-body" @submit.prevent="handleSend">
          <div v-if="isStudent" class="form-group">
            <label class="field-label">Your Mentor</label>

            <div v-if="isLoadingReceivers" class="info-box muted">
              Loading mentor...
            </div>

            <div v-else-if="receiverOptions.length > 0" class="info-box highlight">
              <strong>{{ receiverOptions[0].name || receiverOptions[0].realName || receiverOptions[0].username || 'Mentor' }}</strong>
              <div class="sub-text">
                Mentor ID: {{ receiverOptions[0].id }}
              </div>
              <div v-if="receiverOptions[0].email" class="sub-text">
                Email: {{ receiverOptions[0].email }}
              </div>
            </div>

            <div v-else class="info-box error">
              No assigned mentor found.
            </div>
          </div>

          <div v-else class="form-group">
            <label class="field-label">
              Search Recipient
            </label>

            <div class="input-group">
              <input
                  v-model="keyword"
                  type="text"
                  class="form-control"
                  :placeholder="searchPlaceholder"
                  :disabled="isSending || isLoadingReceivers"
                  @keyup.enter.prevent="searchReceivers"
              />

              <button
                  class="btn btn-secondary"
                  type="button"
                  :disabled="isSending || isLoadingReceivers"
                  @click="searchReceivers"
              >
                {{ isLoadingReceivers ? 'Searching...' : 'Search' }}
              </button>
            </div>

            <div class="hint-text">
              {{ searchHint }}
            </div>

            <label class="field-label mt-4">Select Target</label>

            <select
                v-model="selectedRecipientId"
                class="form-control"
                :disabled="isSending || receiverOptions.length === 0"
            >
              <option value="">
                -- Select Target ({{ receiverOptions.length }} found) --
              </option>

              <option v-for="opt in receiverOptions" :key="opt.id" :value="opt.id">
                {{ opt.name || opt.realName || opt.username || opt.id }}
                (ID: {{ opt.id }})
                <template v-if="opt.email">
                  - {{ opt.email }}
                </template>
              </option>
            </select>
          </div>

          <div class="form-group mt-4">
            <label class="field-label">Message Content</label>

            <textarea
                v-model="messageContent"
                rows="6"
                class="form-control"
                placeholder="Type your message here..."
                maxlength="1000"
                required
                :disabled="isSending || !selectedRecipientId"
            ></textarea>

            <div class="char-count">
              {{ messageContent.length }} / 1000
            </div>
          </div>

          <div class="form-actions mt-4">
            <button
                class="btn btn-primary w-100"
                type="submit"
                :disabled="isSending || !selectedRecipientId || !messageContent.trim()"
            >
              {{ isSending ? 'Sending...' : 'Send Message' }}
            </button>
          </div>
        </form>
      </section>

      <section class="card history-section">
        <div class="card-header space-between">
          <h2>Message History</h2>
          <span class="count-tag">{{ messagesList.length }}</span>
        </div>

        <div class="history-list">
          <div v-if="isLoadingHistory" class="empty-state">
            Loading history...
          </div>

          <div v-else-if="messagesList.length === 0" class="empty-state">
            No conversation history.
          </div>

          <div v-else class="message-items">
            <div
                v-for="(msg, index) in messagesList"
                :key="msg.id || msg.messageId || index"
                class="msg-box"
                :class="{ 'msg-outgoing': isMyOutgoing(msg) }"
            >
              <div class="msg-meta">
                <span class="sender-text">
                  <strong>{{ getSenderLabel(msg) }}</strong>
                  <template v-if="getReceiverLabel(msg)">
                    →
                    <strong>{{ getReceiverLabel(msg) }}</strong>
                  </template>
                </span>

                <span class="time-text">
                  {{ formatTime(msg.createTime || msg.createdAt || msg.timestamp) }}
                </span>
              </div>

              <div class="msg-text">
                {{ msg.content || msg.message || '-' }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRoleLabel, type Role } from '../../types'
import {
  getAvailableReceivers,
  listMyMessages,
  sendNormalMessage,
  type AvailableReceiver,
  type MessageEntity,
} from '../../api/communication'

const router = useRouter()

const role = normalizeRole((localStorage.getItem('role') as Role) || 'student') as Role
const roleLabel = getRoleLabel(role)

const currentUserId = getCurrentUserId()
const currentUsername = getCurrentUsername()

const isStudent = role === 'student'
const isMentor = role === 'mentor'
const isCoordinator = role === 'coordinator'
const isConsultant = role === 'consultant'
const isSupportOrAdmin = role === 'support' || role === 'admin'

const keyword = ref('')
const selectedRecipientId = ref('')
const messageContent = ref('')
const receiverOptions = ref<AvailableReceiver[]>([])
const messagesList = ref<MessageEntity[]>([])

const isLoading = ref(false)
const isLoadingReceivers = ref(false)
const isLoadingHistory = ref(false)
const isSending = ref(false)

const notice = ref('')
const isError = ref(false)

const searchPlaceholder = computed(() => {
  if (isMentor) return 'Enter your student ID, e.g. test_stu_in_01'
  if (isCoordinator) return 'Search mentor or student by name / email / ID'
  if (isConsultant) return 'Search student or coordinator by name / email / ID'
  return 'Search recipient'
})

const searchHint = computed(() => {
  if (isMentor) {
    return 'Mentor can only message students in their own MCP groups. Please search by exact student ID.'
  }

  if (isCoordinator) {
    return 'Coordinator can message mentors and students in the same department.'
  }

  if (isConsultant) {
    return 'Faculty Consultant can message coordinators and students.'
  }

  return ''
})

onMounted(() => {
  loadPageData()
})

function normalizeRole(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase()

  if (raw === 'student' || raw === 'stu') return 'student'
  if (raw === 'mentor') return 'mentor'
  if (raw === 'coordinator' || raw === 'mcp_coordinator') return 'coordinator'
  if (
      raw === 'consultant' ||
      raw === 'faculty_consultant' ||
      raw === 'facultyconsultant' ||
      raw === 'fc'
  ) {
    return 'consultant'
  }
  if (raw === 'support' || raw === 'supporting_staff') return 'support'
  if (raw === 'admin' || raw === 'administrator') return 'admin'

  return raw || 'student'
}

function getStoredUserInfo(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

function getCurrentUserId(): string {
  const info = getStoredUserInfo()

  return String(
      info.user?.id ??
      info.user?.userId ??
      info.userId ??
      info.id ??
      info.username ??
      localStorage.getItem('userId') ??
      localStorage.getItem('username') ??
      '',
  ).trim()
}

function getCurrentUsername(): string {
  const info = getStoredUserInfo()

  return String(
      info.user?.username ??
      info.username ??
      info.account ??
      info.realName ??
      info.name ??
      localStorage.getItem('username') ??
      '',
  ).trim()
}

async function loadPageData() {
  if (isSupportOrAdmin) return

  clearNotice()
  isLoading.value = true

  try {
    if (isStudent) {
      await loadStudentMentor()
    }

    await loadMessagesHistory()
  } catch (err: any) {
    showNotice(err?.message || 'Failed to initialize page data.', true)
  } finally {
    isLoading.value = false
  }
}

async function loadStudentMentor() {
  isLoadingReceivers.value = true
  receiverOptions.value = []
  selectedRecipientId.value = ''

  try {
    const receivers = await getAvailableReceivers('')
    receiverOptions.value = receivers

    if (receivers.length > 0) {
      selectedRecipientId.value = receivers[0].id
    }
  } catch (err: any) {
    console.error('Failed to load mentor:', err)
    showNotice(err?.message || 'No assigned mentor found.', true)
  } finally {
    isLoadingReceivers.value = false
  }
}

async function searchReceivers() {
  const kw = keyword.value.trim()

  if (!kw) {
    showNotice('Please enter a keyword or student ID.', true)
    return
  }

  isLoadingReceivers.value = true
  clearNotice()
  receiverOptions.value = []
  selectedRecipientId.value = ''

  try {
    const receivers = await getAvailableReceivers(kw)
    receiverOptions.value = receivers

    if (receivers.length === 0) {
      if (isMentor) {
        showNotice(
            'No student found. Mentor can only search students in their own MCP groups. Please check the exact student ID.',
            true,
        )
      } else {
        showNotice('No available recipient found.', true)
      }
      return
    }

    selectedRecipientId.value = receivers[0].id
  } catch (err: any) {
    showNotice(err?.message || 'Search failed.', true)
  } finally {
    isLoadingReceivers.value = false
  }
}

async function loadMessagesHistory() {
  isLoadingHistory.value = true

  try {
    const list = await listMyMessages()

    messagesList.value = [...list].sort((a, b) => {
      const left = new Date(a.createTime || a.createdAt || a.timestamp || 0).getTime()
      const right = new Date(b.createTime || b.createdAt || b.timestamp || 0).getTime()
      return right - left
    })
  } catch (err) {
    console.warn('History load issue:', err)
    messagesList.value = []
  } finally {
    isLoadingHistory.value = false
  }
}

async function handleSend() {
  const targetId = selectedRecipientId.value.trim()
  const text = messageContent.value.trim()

  if (!targetId || !text) return

  isSending.value = true
  clearNotice()

  try {
    await sendNormalMessage(targetId, text, receiverOptions.value)

    messageContent.value = ''
    showNotice('Message sent successfully.', false)

    await loadMessagesHistory()
  } catch (err: any) {
    showNotice(err?.message || 'Failed to send message.', true)
  } finally {
    isSending.value = false
  }
}

function isMyOutgoing(msg: MessageEntity): boolean {
  const senderValues = [
    msg.senderId,
    msg.fromUserId,
    msg.from,
    msg.senderName,
    msg.raw?.senderId,
    msg.raw?.fromUserId,
    msg.raw?.from,
  ]
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)

  const currentValues = [currentUserId, currentUsername]
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)

  return currentValues.some((value) => senderValues.includes(value))
}

function getSenderLabel(msg: MessageEntity): string {
  const value =
      msg.senderName ||
      msg.raw?.senderName ||
      msg.raw?.fromUserName ||
      msg.senderId ||
      msg.fromUserId ||
      msg.from

  if (!value && isMyOutgoing(msg)) return 'Me'
  return String(value || 'Unknown')
}

function getReceiverLabel(msg: MessageEntity): string {
  const value =
      msg.receiverName ||
      msg.raw?.receiverName ||
      msg.raw?.recipientName ||
      msg.recipientId ||
      msg.receiverId ||
      msg.toUserId

  return value ? String(value) : ''
}

function clearNotice() {
  notice.value = ''
  isError.value = false
}

function showNotice(text: string, isErr = false) {
  notice.value = text
  isError.value = isErr
}

function formatTime(val: string | undefined) {
  if (!val) return '-'

  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  color: #1e293b;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.header-text h1 {
  margin: 0;
  font-size: 26px;
}

.header-text p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}

.btn-outline {
  background: #fff;
  border-color: #cbd5e1;
  color: #334155;
}

.w-100 {
  width: 100%;
}

.notice-banner {
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-banner {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
}

.alert-box {
  padding: 20px;
  background: #fffbeb;
  border: 1px solid #fde047;
  color: #854d0e;
  border-radius: 8px;
}

.workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 10px 10px 0 0;
}

.card-header.space-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.count-tag {
  background: #e2e8f0;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.form-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 20px;
}

.field-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #2563eb;
}

.input-group {
  display: flex;
  gap: 8px;
}

.hint-text {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.info-box {
  padding: 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.info-box.highlight {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.info-box.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.info-box strong {
  display: block;
  color: #1e3a8a;
  margin-bottom: 4px;
}

.sub-text {
  font-size: 13px;
  color: #64748b;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}

.history-section {
  max-height: 650px;
}

.history-list {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: #f8fafc;
  border-radius: 0 0 10px 10px;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 40px 0;
}

.message-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg-box {
  padding: 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  max-width: 85%;
  align-self: flex-start;
}

.msg-outgoing {
  background: #eff6ff;
  border-color: #bfdbfe;
  align-self: flex-end;
}

.msg-meta {
  font-size: 12px;
  margin-bottom: 6px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.msg-outgoing .msg-meta {
  color: #3b82f6;
}

.msg-text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 800px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .input-group {
    flex-direction: column;
  }
}
</style>
