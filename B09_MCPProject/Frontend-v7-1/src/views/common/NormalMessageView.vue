<template>
  <div class="message-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Communication</p>
        <h1>Normal Message</h1>
        <p class="subtitle">Send and receive text messages with your related users.</p>
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
          <h2>Start Chat</h2>

          <label for="receiverIds">Receiver IDs</label>
          <input
            id="receiverIds"
            v-model.trim="manualReceiverIds"
            autocomplete="off"
            placeholder="e.g. test_mentor_01, test_stu_out_01"
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

          <div class="quick-buttons">
            <button
              v-for="example in receiverExamples"
              :key="example.value"
              type="button"
              class="quick-button"
              @click="appendReceiver(example.value)"
            >
              {{ example.label }}
            </button>
          </div>
        </div>

        <div class="sidebar-block">
          <h2>Filter History</h2>

          <label for="peerFilter">Peer ID</label>
          <input
            id="peerFilter"
            v-model.trim="peerFilter"
            placeholder="Filter by user ID"
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
          <h2>Recent Peers</h2>

          <button
            v-for="peer in recentPeers"
            :key="peer"
            class="peer-button"
            type="button"
            @click="selectPeer(peer)"
          >
            {{ peer }}
          </button>
        </div>
      </aside>

      <main class="chat-main">
        <div class="chat-topbar">
          <div>
            <h2>{{ conversationTitle }}</h2>
            <p>{{ filteredMessages.length }} message{{ filteredMessages.length === 1 ? '' : 's' }}</p>
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
              :class="{ mine: msg.isLocalSent }"
            >
              <div class="bubble">
                <div class="bubble-meta">
                  <strong>{{ displaySender(msg) }}</strong>
                  <span>{{ formatTime(msg.createTime || msg.timestamp) }}</span>
                </div>

                <p>{{ msg.content || '-' }}</p>

                <div class="bubble-extra">
                  <span v-if="msg.senderId">From: {{ msg.senderId }}</span>
                  <span v-if="msg.recipientIds?.length">To: {{ msg.recipientIds.join(', ') }}</span>
                </div>

                <div v-if="!msg.isLocalSent" class="bubble-actions">
                  <button
                    v-if="msg.senderId"
                    class="text-button"
                    type="button"
                    @click="replyTo(msg.senderId)"
                  >
                    Reply
                  </button>

                  <button
                    v-if="msg.senderId"
                    class="text-button"
                    type="button"
                    @click="copyText(msg.senderId)"
                  >
                    Copy ID
                  </button>

                  <button
                    v-if="msg.messageId"
                    class="text-button"
                    type="button"
                    @click="markRead(msg)"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </article>
          </template>
        </div>

        <div class="composer">
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
              <button class="secondary" type="button" @click="resetForm">
                Reset
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
  getMessageDetail,
  getUnreadMessageCount,
  listMyMessages,
  sendNormalMessage,
  type MessageEntity,
} from '../../api/communication'

type MessageForView = MessageEntity & {
  localKey: string
  isLocalSent?: boolean
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

const currentRole = computed(() => localStorage.getItem('role') || '')

const scopeCards = [
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

const parsedReceiverIds = computed(() => parseReceiverIds(manualReceiverIds.value))

const canSend = computed(() => {
  return parsedReceiverIds.value.length > 0 && content.value.trim().length > 0
})

const receiverExamples = computed(() => {
  switch (currentRole.value) {
    case 'student':
      return [{ label: 'Mentor example', value: 'test_mentor_01' }]

    case 'mentor':
      return [
        { label: 'Student example', value: 'test_stu_out_01' },
        { label: 'Coordinator example', value: 'test_coord_01' },
      ]

    case 'coordinator':
      return [
        { label: 'Mentor example', value: 'test_mentor_01' },
        { label: 'Student example', value: 'test_stu_out_01' },
        { label: 'Consultant example', value: 'test_faculty_01' },
      ]

    case 'consultant':
      return [
        { label: 'Coordinator example', value: 'test_coord_01' },
        { label: 'Mentor example', value: 'test_mentor_01' },
      ]

    default:
      return [
        { label: 'Student example', value: 'test_stu_out_01' },
        { label: 'Mentor example', value: 'test_mentor_01' },
      ]
  }
})

const filteredMessages = computed(() => {
  const keyword = historyKeyword.value.trim().toLowerCase()
  const peer = peerFilter.value.trim().toLowerCase()

  return messages.value.filter((msg) => {
    const searchableText = [
      msg.senderId,
      msg.senderName,
      msg.recipientIds?.join(','),
      msg.content,
      msg.createTime,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchKeyword = !keyword || searchableText.includes(keyword)

    const matchPeer =
      !peer ||
      String(msg.senderId || '').toLowerCase().includes(peer) ||
      (msg.recipientIds || []).some((id) => id.toLowerCase().includes(peer))

    return matchKeyword && matchPeer
  })
})

const recentPeers = computed(() => {
  const currentUser = getCurrentUserIdOrUsername()
  const set = new Set<string>()

  messages.value.forEach((msg) => {
    if (msg.senderId && msg.senderId !== currentUser) {
      set.add(msg.senderId)
    }

    ;(msg.recipientIds || []).forEach((id) => {
      if (id && id !== currentUser) set.add(id)
    })
  })

  return Array.from(set).slice(0, 8)
})

const conversationTitle = computed(() => {
  return peerFilter.value.trim() ? `Chat with ${peerFilter.value.trim()}` : 'All Messages'
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
    const localSentMessages = loadLocalSentMessages()

    messages.value = mergeMessages(
      remoteMessages.map(toViewMessage),
      localSentMessages,
    ).sort(sortByTime)
  } catch {
    messages.value = loadLocalSentMessages().sort(sortByTime)
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

    addLocalSentMessage(receiverIds, messageContent)

    manualReceiverIds.value = ''
    content.value = ''

    showSuccess('Message sent successfully.')
    await loadUnreadCount()
  } catch (err: any) {
    showError(toFriendlySendError(err))
  } finally {
    sending.value = false
  }
}

function addLocalSentMessage(receiverIds: string[], messageContent: string) {
  const now = new Date().toISOString()
  const localKey = `local-sent-${Date.now()}`

  const localMessage: MessageForView = {
    id: localKey,
    messageId: localKey,
    localKey,
    senderId: getCurrentUserIdOrUsername(),
    senderName: 'Me',
    recipientIds: receiverIds,
    content: messageContent,
    createTime: now,
    timestamp: now,
    isLocalSent: true,
    read: true,
  }

  appendLocalSentMessage(localMessage)
  messages.value = mergeMessages(messages.value, [localMessage]).sort(sortByTime)
}

async function markRead(msg: MessageForView) {
  if (msg.isLocalSent || !msg.messageId) return

  try {
    const detail = await getMessageDetail(msg.messageId)
    const index = messages.value.findIndex((item) => item.localKey === msg.localKey)

    if (index >= 0) {
      messages.value[index] = {
        ...messages.value[index],
        ...detail,
        localKey: messages.value[index].localKey,
        read: true,
      }
    }

    await loadUnreadCount()
  } catch {
    // Keep the page quiet if detail is not available.
  }
}

function replyTo(senderId: string) {
  appendReceiver(senderId)
  peerFilter.value = senderId
}

function selectPeer(peerId: string) {
  peerFilter.value = peerId
  manualReceiverIds.value = peerId
}

function appendReceiver(receiverId: string) {
  const current = [...parsedReceiverIds.value]

  if (!current.includes(receiverId)) {
    current.push(receiverId)
  }

  manualReceiverIds.value = current.join(', ')
}

function removeReceiver(receiverId: string) {
  manualReceiverIds.value = parsedReceiverIds.value
    .filter((id) => id !== receiverId)
    .join(', ')
}

function resetForm() {
  manualReceiverIds.value = ''
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
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function toViewMessage(item: MessageEntity): MessageForView {
  const id = String(
    item.id ||
      item.messageId ||
      `${item.senderId || 'unknown'}-${item.createTime || Date.now()}`,
  )

  return {
    ...item,
    id,
    messageId: String(item.messageId || id),
    localKey: id,
  }
}

function mergeMessages(...groups: MessageForView[][]): MessageForView[] {
  const map = new Map<string, MessageForView>()

  groups.flat().forEach((msg) => {
    const key = msg.localKey || msg.messageId || msg.id
    if (!key) return
    map.set(key, msg)
  })

  return Array.from(map.values())
}

function sortByTime(a: MessageForView, b: MessageForView) {
  const aTime = new Date(a.createTime || a.timestamp || 0).getTime()
  const bTime = new Date(b.createTime || b.timestamp || 0).getTime()
  return aTime - bTime
}

function displaySender(msg: MessageForView): string {
  if (msg.isLocalSent) return 'Me'
  return msg.senderName || msg.senderId || 'Unknown sender'
}

function formatTime(value?: string): string {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function getCurrentUserIdOrUsername(): string {
  const raw = localStorage.getItem('userInfo')

  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      return (
        parsed?.user?.id ||
        parsed?.id ||
        parsed?.userId ||
        parsed?.user?.username ||
        parsed?.username ||
        localStorage.getItem('username') ||
        ''
      )
    } catch {
      // ignore
    }
  }

  return localStorage.getItem('userId') || localStorage.getItem('username') || ''
}

function getLocalSentStorageKey(): string {
  return `mcs_local_sent_messages_${getCurrentUserIdOrUsername() || 'anonymous'}`
}

function loadLocalSentMessages(): MessageForView[] {
  try {
    const raw = localStorage.getItem(getLocalSentStorageKey())
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.map((item) => ({
      ...item,
      localKey: item.localKey || item.messageId || item.id || `local-${Date.now()}`,
      isLocalSent: true,
    }))
  } catch {
    return []
  }
}

function appendLocalSentMessage(message: MessageForView) {
  const next = mergeMessages(loadLocalSentMessages(), [message])
    .sort(sortByTime)
    .slice(-100)

  localStorage.setItem(getLocalSentStorageKey(), JSON.stringify(next))
}

function toFriendlySendError(err: any): string {
  const text = String(err?.message || err || '')

  if (/permission|forbidden|403|access/i.test(text)) {
    return 'Message sending is not allowed for this account. Please try another account or check the receiver ID.'
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
  grid-template-columns: 310px minmax(0, 1fr);
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

.receiver-list,
.quick-buttons {
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

.quick-button,
.peer-button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  border-radius: 9px;
  padding: 8px 10px;
  cursor: pointer;
}

.peer-button {
  display: block;
  width: 100%;
  margin-top: 8px;
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

  .bubble {
    max-width: 100%;
  }
}
</style>
