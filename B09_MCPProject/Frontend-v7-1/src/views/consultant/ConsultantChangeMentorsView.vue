<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Change Mentors</h1>
        <p class="desc">Change the mentor assigned to a mentoring group.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Search by Group ID</label>
        <div class="search-row">
          <input
            v-model.trim="searchGroupId"
            type="text"
            placeholder="Enter Group ID, e.g. 2025-2026-Y2"
            @keyup.enter="searchGroup"
          />
          <button :disabled="loading" @click="searchGroup">Search</button>
          <button class="secondary" :disabled="loading" @click="resetSearch">
            Reset
          </button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <table v-if="filteredGroups.length > 0">
        <thead>
          <tr>
            <th>Group ID</th>
            <th>Current Mentor</th>
            <th>New Mentor</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="group in filteredGroups" :key="group.groupId">
            <td>{{ group.groupId }}</td>
            <td>{{ getMentorDisplayName(group) }}</td>
            <td>
              <select
                v-model="newMentorIds[group.groupId]"
                :disabled="savingGroupId === group.groupId"
              >
                <option value="">-- Select Mentor --</option>
                <option
                  v-for="mentor in mentorList"
                  :key="mentor.id"
                  :value="mentor.id"
                >
                  {{ mentor.name }}{{ mentor.email ? ` (${mentor.email})` : '' }}
                </option>
              </select>
            </td>
            <td>
              <button
                :disabled="!newMentorIds[group.groupId] || savingGroupId === group.groupId"
                @click="saveChange(group)"
              >
                {{ savingGroupId === group.groupId ? 'Saving...' : 'Save' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else-if="!loading" class="empty">
        No groups found.
      </p>

      <p v-if="loading" class="empty">Loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type GroupItem = {
  groupId: string
  mentorId?: string
  mentorName?: string
  currentMentor?: string
  currentMentorId?: string
  mentor?: any
  [key: string]: any
}

type MentorItem = {
  id: string
  name: string
  email?: string
  raw?: any
}

const groups = ref<GroupItem[]>([])
const mentorList = ref<MentorItem[]>([])
const searchGroupId = ref('')
const newMentorIds = reactive<Record<string, string>>({})
const loading = ref(false)
const savingGroupId = ref('')
const message = ref('')
const isError = ref(false)

const filteredGroups = computed(() => {
  const keyword = searchGroupId.value.trim().toLowerCase()
  if (!keyword) return groups.value
  return groups.value.filter((g) =>
    String(g.groupId || '').toLowerCase().includes(keyword),
  )
})

onMounted(async () => {
  await Promise.all([loadGroups(), loadMentors()])
})

async function loadGroups() {
  loading.value = true
  clearMessage()

  try {
    const consultantApi: any = await import('../../api/consultant')
    const fn = consultantApi.listGroups || consultantApi.searchGroupById

    if (!fn) {
      throw new Error('listGroups API is not available.')
    }

    const data = consultantApi.listGroups
      ? await consultantApi.listGroups()
      : await consultantApi.searchGroupById('')

    groups.value = normalizeGroups(data)
  } catch (err: any) {
    showError(err.message || 'Failed to load groups.')
  } finally {
    loading.value = false
  }
}

async function loadMentors() {
  try {
    const orgApi: any = await import('../../api/org')
    const fn =
      orgApi.searchAllMentors ||
      orgApi.listAllMentors ||
      orgApi.getAllMentors ||
      orgApi.searchMyDeptMentors

    if (!fn) {
      mentorList.value = []
      return
    }

    const data = await fn('')
    mentorList.value = normalizeMentors(data)
  } catch {
    mentorList.value = []
  }
}

function normalizeGroups(data: any): GroupItem[] {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list.map((item: any) => ({
    ...item,
    groupId: String(item.groupId ?? item.id ?? ''),
    mentorId: item.mentorId ?? item.currentMentorId ?? item.mentor?.id,
    mentorName: item.mentorName ?? item.currentMentor ?? item.mentor?.name,
  }))
}

function normalizeMentors(data: any): MentorItem[] {
  const list = Array.isArray(data) ? data : data?.data || data?.records || []
  return list
    .map((item: any) => {
      const id = String(
        item.mentorId ??
          item.id ??
          item.userId ??
          item.accountId ??
          item.email ??
          '',
      )

      return {
        id,
        name:
          item.mentorName ??
          item.name ??
          item.username ??
          item.fullName ??
          id,
        email: item.email,
        raw: item,
      }
    })
    .filter((m: MentorItem) => m.id)
}

function normalizeMentorId(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const match = raw.match(/#\s*([A-Za-z0-9_-]+)$/)
  return match ? match[1] : raw
}

function getGroupMentorId(group: GroupItem): string {
  const candidates = [
    group.mentorId,
    group.currentMentorId,
    group.mentorID,
    group.currentMentorID,
    group.mentor?.id,
    group.mentor?.mentorId,
  ]

  for (const item of candidates) {
    const id = normalizeMentorId(item)
    if (id) return id
  }

  const nameLikeCandidates = [group.mentorName, group.currentMentor]
  for (const item of nameLikeCandidates) {
    const id = normalizeMentorId(item)
    if (id && /^[A-Za-z]*\d+$/i.test(id)) return id
  }

  return ''
}

function getMentorNameById(mentorId: string): string {
  const id = normalizeMentorId(mentorId)
  const mentor = mentorList.value.find(
    (m) => normalizeMentorId(m.id) === id,
  )
  return mentor?.name || ''
}

function getMentorDisplayName(group: GroupItem): string {
  const mentorId = getGroupMentorId(group)

  if (mentorId) {
    const name = getMentorNameById(mentorId)
    if (name) return name
  }

  const fallback =
    group.mentorName ||
    group.currentMentor ||
    group.mentor?.name ||
    group.mentor?.mentorName

  if (fallback && !String(fallback).startsWith('Mentor#')) {
    return String(fallback)
  }

  return mentorId || '-'
}

async function searchGroup() {
  clearMessage()

  if (!searchGroupId.value.trim()) {
    showError('Please enter a Group ID, or click Reset to show all groups.')
    return
  }

  if (filteredGroups.value.length === 0) {
    showError('No matching group found.')
  }
}

function resetSearch() {
  searchGroupId.value = ''
  clearMessage()
}

async function saveChange(group: GroupItem) {
  clearMessage()

  const groupId = group.groupId
  const newMentorId = newMentorIds[groupId]

  if (!groupId) {
    showError('Invalid group ID.')
    return
  }

  if (!newMentorId) {
    showError('Please select a new mentor.')
    return
  }

  savingGroupId.value = groupId

  try {
    const consultantApi: any = await import('../../api/consultant')
    const fn = consultantApi.changeGroupMentor

    if (!fn) {
      throw new Error('changeGroupMentor API is not available.')
    }

    await fn(groupId, newMentorId)

    const newMentorName = getMentorNameById(newMentorId) || newMentorId

    group.mentorId = newMentorId
    group.currentMentorId = newMentorId
    group.mentorName = newMentorName
    group.currentMentor = newMentorName

    newMentorIds[groupId] = ''
    showSuccess(`Mentor of group ${groupId} updated to ${newMentorName}.`)
  } catch (err: any) {
    showError(err.message || 'Failed to change mentor.')
  } finally {
    savingGroupId.value = ''
  }
}

function goHome() {
  router.push('/main')
}

function clearMessage() {
  message.value = ''
  isError.value = false
}

function showSuccess(text: string) {
  message.value = text
  isError.value = false
}

function showError(text: string) {
  message.value = text
  isError.value = true
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form {
  margin-top: 22px;
}
.form-item {
  margin-top: 16px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
.search-row {
  display: flex;
  gap: 10px;
  max-width: 720px;
}
.search-row input {
  flex: 1;
}
input,
select,
textarea {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
select {
  width: 100%;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
}
th,
td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}
th {
  background: #f3f4f6;
}
.message {
  margin-top: 14px;
  color: #047857;
}
.error {
  color: #dc2626;
}
.empty {
  color: #6b7280;
  padding: 16px 0;
}
</style>
