<template>
  <div class="message-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Communication</p>
        <h1>Normal Message</h1>
        <p class="subtitle">Send and receive normal text messages.</p>
      </div>

      <div class="header-actions">
        <span class="unread-pill">{{ unreadCount }} unread</span>
        <button class="secondary" type="button" @click="goHome">Home</button>
      </div>
    </header>

    <p v-if="notice" class="notice" :class="{ error: isError }">
      {{ notice }}
    </p>

    <section class="role-panel">
      <div
          v-for="item in scopeCards"
          :key="item.role"
          class="scope-card"
          :class="{ active: currentRole === item.role }"
      >
        <span>{{ item.title }}</span>
        <strong>{{ item.description }}</strong>
      </div>
    </section>

    <section class="chat-shell">
      <aside class="chat-sidebar">
        <div class="sidebar-block">
          <h2>Send Message</h2>

          <p class="scope-note">
            {{ currentScopeText }}
          </p>

          <label for="receiverIds">Receiver IDs</label>
          <input
              id="receiverIds"
              v-model.trim="manualReceiverIds"
              autocomplete="off"
              placeholder="e.g. test_stu_in_01, test_coord_01"
          />

          <div v-if="parsedReceiverIds.length" class="receiver-list">
            <span
                v-for="receiverId in parsedReceiverIds"
                :key="receiverId"
                class="receiver-chip"
            >
              {{ receiverId }}
              <button type="button" @click="removeReceiver(receiverId)">×</button>
            </span>
          </div>

          <p class="hint">
            Multiple receiver IDs can be separated by comma, space, or semicolon.
          </p>
        </div>

        <div class="sidebar-block">
          <h2>Filter History</h2>

          <label for="peerFilter">User ID</label>
          <input
              id="peerFilter"
              v-model.trim="peerFilter"
              placeholder="Filter by sender or receiver ID"
          />

          <label for="historyKeyword">Keyword</label>
          <input
              id="historyKeyword"
              v-model.trim="historyKeyword"
              placeholder="Search message content"
          />

          <button class="secondary full-width" type="button" @click="clearHistoryFilters">
            Clear Filters
          </button>
        </div>

        <div v-if="recentPeers.length" class="sidebar-block">
          <h2>Recent Users</h2>

          <div
              v-for="peer in recentPeers"
              :key="peer"
              class="peer-row"
          >
            <button class="peer-main" type="button" @click="filterByPeer(peer)">
              {{ peer }}
            </button>

            <button class="text-button" type="button" @click="appendReceiver(peer)">
              Use
            </button>
          </div>
        </div>
      </aside>

      <main class="chat-main">
        <div class="chat-topbar">
          <div>
            <h2>{{ conversationTitle }}</h2>
            <p>
              {{ filteredMessages.length }}
              message{{ filteredMessages.length === 1 ? '' : 's' }}
            </p>
          </div>

          <button class="secondary" type="button" :disabled="loadingMessages" @click="loadAllHistory">
            {{ loadingMessages ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div class="history-window">
          <div v-if="loadingMessages" class="empty-state">
            Loading messages...
          </div>

          <div v-else-if="filteredMessages.length === 0" class="empty-state">
            No messages yet.
          </div>

          <template v-else>
            <article
                v-for="msg in filteredMessages"
                :key="msg.localKey"
                class="bubble-row"
                :class="{ mine: isMine(msg) }"
            >
              <div class="bubble">
                <div class="bubble-meta">
                  <strong>{{ displaySender(msg) }}</strong>
                  <span>{{ formatTime(msg.createTime || msg.timestamp || msg.createdAt) }}</span>
                </div>

                <p>{{ msg.content || '-' }}</p>

                <div class="bubble-extra">
                  <span v-if="getSenderId(msg)">From: {{ getSenderId(msg) }}</span>
                  <span v-if="getRecipientIds(msg).length">
                    To: {{ getRecipientIds(msg).join(', ') }}
                  </span>
                </div>

                <div v-if="getSenderId(msg)" class="bubble-actions">
                  <button class="text-button" type="button" @click="copyText(getSenderId(msg))">
                    Copy Sender ID
                  </button>
                </div>
              </div>
            </article>
          </template>
        </div>

        <div class="composer">
          <div class="composer-target">
            <strong>Receivers:</strong>
            <span v-if="parsedReceiverIds.length">{{ parsedReceiverIds.join(', ') }}</span>
            <span v-else class="muted">No receiver selected</span>
          </div>

          <textarea
              v-model="content"
              rows="4"
              maxlength="500"
              placeholder="Type your message..."
              @keydown.ctrl.enter.prevent="send"
              @keydown.meta.enter.prevent="send"
          />

          <div class="composer-footer">
            <span>{{ content.length }}/500</span>

            <div class="composer-actions">
              <button class="secondary" type="button" @click="resetMessage">
                Reset Message
              </button>

              <button type="button" :disabled="sending || !canSend" @click="send">
                {{ sending ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </div>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getUnreadMessageCount,
  listMyMessages,
  sendNormalMessage,
  type MessageEntity,
} from '../../api/communication'
import type { Role } from '../../types'

type MessageForView = MessageEntity & {
  localKey: string
  senderName?: string
  senderUsername?: string
  fromUserName?: string
  fromName?: string
}

type ScopeCard = {
  role: Role
  title: string
  description: string
}

const router = useRouter()

const messages = ref<MessageForView[]>([])
const manualReceiverIds = ref('')
const content = ref('')
const notice = ref('')

const isError = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)

const unreadCount = ref(0)
const historyKeyword = ref('')
const peerFilter = ref('')

const scopeCards: ScopeCard[] = [
  {
    role: 'student',
    title: 'Student',
    description: 'Communicate with assigned mentor',
  },
  {
    role: 'mentor',
    title: 'Mentor',
    description: 'Communicate with students and MCP coordinator',
  },
  {
    role: 'coordinator',
    title: 'MCP Coordinator',
    description: 'Communicate with mentors, students and faculty consultant',
  },
  {
    role: 'consultant',
    title: 'Faculty Consultant',
    description: 'Communicate with coordinators and mentors',
  },
]

const currentRole = computed<Role>(() => normalizeRole(localStorage.getItem('role') || 'student'))

const currentScopeText = computed(() => {
  switch (currentRole.value) {
    case 'student':
      return 'Students can send normal messages to their assigned mentor.'

    case 'mentor':
      return 'Mentors can send normal messages to students in their group and the MCP coordinator.'

    case 'coordinator':
      return 'MCP coordinators can communicate with mentors, students and faculty consultants.'

    case 'consultant':
      return 'Faculty consultants can communicate with coordinators and mentors.'

    default:
      return 'Normal messages are limited to related users.'
  }
})

const parsedReceiverIds = computed(() => parseReceiverIds(manualReceiverIds.value))

const canSend = computed(() => {
  return parsedReceiverIds.value.length > 0 && content.value.trim().length > 0
})

const filteredMessages = computed(() => {
  const keyword = historyKeyword.value.trim().toLowerCase()
  const peer = peerFilter.value.trim().toLowerCase()

  return messages.value.filter((msg) => {
    const senderId = getSenderId(msg)
    const recipientIds = getRecipientIds(msg)

    const searchableText = [
      senderId,
      msg.senderName,
      msg.senderUsername,
      msg.fromUserName,
      msg.fromName,
      recipientIds.join(','),
      msg.content,
      msg.createTime,
      msg.createdAt,
      msg.timestamp,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

    const matchKeyword = !keyword || searchableText.includes(keyword)

    const matchPeer =
        !peer ||
        senderId.toLowerCase().includes(peer) ||
        recipientIds.some((id) => id.toLowerCase().includes(peer))

    return matchKeyword && matchPeer
  })
})

const recentPeers = computed(() => {
  const currentIds = getCurrentUserIdentifiers()
  const set = new Set<string>()

  messages.value.forEach((msg) => {
    const senderId = getSenderId(msg)

    if (senderId && !currentIds.includes(senderId)) {
      set.add(senderId)
    }

    getRecipientIds(msg).forEach((id) => {
      if (id && !currentIds.includes(id)) {
        set.add(id)
      }
    })
  })

  return Array.from(set).slice(0, 8)
})

const conversationTitle = computed(() => {
  return peerFilter.value.trim() ? `Messages with ${peerFilter.value.trim()}` : 'All Messages'
})

onMounted(async () => {
  await loadAllHistory()
})

async function loadAllHistory() {
  await Promise.all([loadMessages(), loadUnreadCount()])
}

async function loadMessages() {
  loadingMessages.value = true

  try {
    const remoteMessages = await listMyMessages()
    messages.value = remoteMessages.map(toViewMessage).sort(sortByTime)
  } catch (err: any) {
    messages.value = []
    showError(toFriendlyError(err, 'Failed to load messages.'))
  } finally {
    loadingMessages.value = false
  }
}

async function loadUnreadCount() {
  try {
    unreadCount.value = await getUnreadMessageCount()
  } catch {
    unreadCount.value = 0
  }
}

async function send() {
  clearNotice()

  const receiverIds = parsedReceiverIds.value
  const messageContent = content.value.trim()

  if (receiverIds.length === 0) {
    showError('Please enter at least one receiver ID.')
    return
  }

  if (!messageContent) {
    showError('Please enter message content.')
    return
  }

  sending.value = true

  try {
    await sendNormalMessage(receiverIds, messageContent)

    content.value = ''
    showSuccess('Message sent successfully.')

    await loadAllHistory()
  } catch (err: any) {
    showError(toFriendlySendError(err))
  } finally {
    sending.value = false
  }
}

function appendReceiver(receiverId: string) {
  if (!receiverId) return

  const current = parsedReceiverIds.value

  if (!current.includes(receiverId)) {
    manualReceiverIds.value = [...current, receiverId].join(', ')
  }
}

function removeReceiver(receiverId: string) {
  manualReceiverIds.value = parsedReceiverIds.value
      .filter((id) => id !== receiverId)
      .join(', ')
}

function filterByPeer(peerId: string) {
  peerFilter.value = peerId
}

function resetMessage() {
  content.value = ''
  clearNotice()
}

function clearHistoryFilters() {
  historyKeyword.value = ''
  peerFilter.value = ''
}

function parseReceiverIds(value: string): string[] {
  return Array.from(
      new Set(
          value
              .split(/[,\s;，；]+/)
              .map((item) => item.trim())
              .filter(Boolean),
      ),
  )
}

function toViewMessage(item: MessageEntity): MessageForView {
  const senderId = getSenderId(item)
  const recipientKey = getRecipientIds(item).join('-')
  const time = item.createTime || item.createdAt || item.timestamp || ''
  const id = String(
      item.id ||
      item.messageId ||
      `${senderId}-${recipientKey}-${time}-${item.content}`,
  )

  return {
    ...item,
    id,
    messageId: String(item.messageId || id),
    localKey: id,
  }
}

function sortByTime(a: MessageForView, b: MessageForView) {
  const aTime = timeValue(a.createTime || a.timestamp || a.createdAt)
  const bTime = timeValue(b.createTime || b.timestamp || b.createdAt)

  return aTime - bTime
}

function timeValue(value?: string): number {
  if (!value) return 0

  const date = new Date(value)
  const time = date.getTime()

  return Number.isNaN(time) ? 0 : time
}

function getSenderId(msg: MessageEntity): string {
  return String(msg.senderId || msg.fromUserId || msg.from || '').trim()
}

function getRecipientIds(msg: MessageEntity): string[] {
  const values = [
    ...(msg.recipientIds || []),
    ...(msg.receiverIds || []),
    msg.recipientId,
    msg.receiverId,
    msg.toUserId,
  ]

  return Array.from(
      new Set(
          values
              .map((value) => String(value || '').trim())
              .filter(Boolean),
      ),
  )
}

function isMine(msg: MessageEntity): boolean {
  const senderId = getSenderId(msg)

  if (!senderId) return false

  return getCurrentUserIdentifiers().includes(senderId)
}

function displaySender(msg: MessageForView): string {
  if (isMine(msg)) return 'Me'

  const raw = (msg.raw || {}) as Record<string, any>

  return (
      msg.senderName ||
      msg.senderUsername ||
      msg.fromUserName ||
      msg.fromName ||
      raw.senderName ||
      raw.senderUsername ||
      raw.fromUserName ||
      raw.fromName ||
      getSenderId(msg) ||
      'Unknown sender'
  )
}

function formatTime(value?: string): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function normalizeRole(role: string): Role {
  const value = role.toLowerCase()

  if (
      value === 'student' ||
      value === 'mentor' ||
      value === 'coordinator' ||
      value === 'consultant' ||
      value === 'admin' ||
      value === 'support'
  ) {
    return value
  }

  return 'student'
}

function getCurrentUserIdentifiers(): string[] {
  const result = new Set<string>()

  try {
    const raw = localStorage.getItem('userInfo')
    const parsed = raw ? JSON.parse(raw) : {}

    const candidates = [
      parsed?.user?.id,
      parsed?.user?.userId,
      parsed?.user?.username,
      parsed?.user?.account,
      parsed?.id,
      parsed?.userId,
      parsed?.username,
      parsed?.account,
      localStorage.getItem('userId'),
      localStorage.getItem('username'),
    ]

    candidates.forEach((value) => {
      const text = String(value || '').trim()
      if (text) result.add(text)
    })
  } catch {
    const userId = String(localStorage.getItem('userId') || '').trim()
    const username = String(localStorage.getItem('username') || '').trim()

    if (userId) result.add(userId)
    if (username) result.add(username)
  }

  return Array.from(result)
}

function toFriendlyError(err: any, fallback: string): string {
  return String(err?.message || err || fallback)
}

function toFriendlySendError(err: any): string {
  const text = String(err?.message || err || '')

  if (/permission|forbidden|403|access/i.test(text)) {
    return 'You are not allowed to send this message. Please check whether the receiver is related to your role.'
  }

  return text || 'Failed to send message.'
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    showSuccess('Copied.')
  } catch {
    showError('Failed to copy.')
  }
}

function goHome() {
  router.push('/main')
}

function clearNotice() {
  notice.value = ''
  isError.value = false
}

function showSuccess(text: string) {
  notice.value = text
  isError.value = false
}

function showError(text: string) {
  notice.value = text
  isError.value = true
}
</script>

<style scoped>
.message-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 8px 0 32px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 32px;
  line-height: 1.2;
}

.subtitle {
  margin: 10px 0 0;
  color: #6b7280;
  font-size: 15px;
}

.header-actions,
.composer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unread-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
}

.notice {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
}

.notice.error {
  background: #fef2f2;
  color: #dc2626;
}

.role-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.scope-card {
  min-height: 76px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-sizing: border-box;
}

.scope-card span {
  display: block;
  margin-bottom: 6px;
  color: #111827;
  font-weight: 700;
}

.scope-card strong {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.scope-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.chat-shell {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}

.chat-sidebar,
.chat-main {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.chat-sidebar {
  padding: 16px;
}

.sidebar-block + .sidebar-block {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #f3f4f6;
}

.sidebar-block h2,
.chat-topbar h2 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 18px;
}

.scope-note,
.hint {
  margin: 0 0 14px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.hint {
  margin-top: 10px;
}

label {
  display: block;
  margin: 12px 0 7px;
  color: #374151;
  font-weight: 700;
  font-size: 13px;
}

input,
textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 11px;
  color: #111827;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}

input:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.receiver-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.receiver-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
  font-weight: 600;
}

.receiver-chip button {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #3730a3;
  cursor: pointer;
}

.peer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.peer-main {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  border-radius: 9px;
  padding: 8px 10px;
  text-align: left;
}

.full-width {
  width: 100%;
  margin-top: 14px;
}

.chat-main {
  display: flex;
  min-height: 620px;
  overflow: hidden;
  flex-direction: column;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-topbar p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.history-window {
  flex: 1;
  min-height: 360px;
  max-height: 520px;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(#f9fafb, #ffffff);
}

.empty-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  background: #ffffff;
}

.bubble-row {
  display: flex;
  margin-bottom: 14px;
}

.bubble-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: min(680px, 82%);
  padding: 13px 15px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.bubble-row.mine .bubble {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.bubble-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
  color: #4b5563;
  font-size: 12px;
}

.bubble p {
  margin: 0;
  white-space: pre-wrap;
  color: #111827;
  line-height: 1.55;
}

.bubble-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}

.bubble-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.text-button {
  border: none;
  background: transparent;
  color: #2563eb;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.composer {
  padding: 18px 20px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.composer-target {
  margin-bottom: 10px;
  color: #374151;
  font-size: 13px;
}

.composer-target strong {
  margin-right: 6px;
}

.muted {
  color: #9ca3af;
}

.composer textarea {
  resize: vertical;
  min-height: 104px;
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  color: #6b7280;
  font-size: 13px;
}

button {
  border: none;
  border-radius: 9px;
  padding: 9px 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button.secondary {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1024px) {
  .role-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chat-shell {
    grid-template-columns: 1fr;
  }

  .chat-main {
    min-height: 560px;
  }
}

@media (max-width: 640px) {
  .page-header,
  .chat-topbar,
  .composer-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .role-panel {
    grid-template-columns: 1fr;
  }

  .peer-row {
    grid-template-columns: 1fr;
  }

  .bubble {
    max-width: 100%;
  }
}
</style>
