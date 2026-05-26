<template>
  <div class="page">
    <h1>Change Mentors</h1>
    <p class="desc">Search a group, then assign a new mentor.</p>

    <section class="card">
      <div class="field-row">
        <label class="field">
          Group ID
          <input
            v-model.trim="groupId"
            placeholder="e.g. 2024-2025-Y1"
            @keyup.enter="handleSearchGroup"
          />
        </label>
        <label class="field">
          Major ID <span class="hint">(optional, for disambiguation)</span>
          <input
            v-model.trim="majorId"
            placeholder="e.g. CST / AI"
            @keyup.enter="handleSearchGroup"
          />
        </label>
      </div>
      <button :disabled="loadingGroup || !groupId" @click="handleSearchGroup">
        {{ loadingGroup ? 'Searching...' : 'Search Group' }}
      </button>
    </section>

    <section v-if="group" class="card">
      <h2>Group</h2>

      <p>
        <strong>Group ID:</strong>
        {{ group.groupId || group.id || '-' }}
      </p>

      <p>
        <strong>Name:</strong>
        {{ group.name || '-' }}
      </p>

      <p>
        <strong>Current Mentor ID:</strong>
        {{ currentMentorId || '-' }}
      </p>

      <div class="block">
        <label>Search Mentor</label>
        <div class="search-row">
          <input
            v-model.trim="mentorKeyword"
            placeholder="Enter mentor ID, name, or email"
            @keyup.enter="handleSearchMentor"
          />
          <button :disabled="loadingMentors || !mentorKeyword" @click="handleSearchMentor">
            {{ loadingMentors ? 'Searching...' : 'Search Mentor' }}
          </button>
        </div>
      </div>

      <div class="block">
        <label>New Mentor</label>

        <select v-model="newMentorId">
          <option value="">Please select</option>
          <option
            v-for="mentor in mentorOptions"
            :key="mentor.mentorId"
            :value="mentor.mentorId"
          >
            {{ mentorLabel(mentor) }}
          </option>
        </select>

        <p class="hint">
          Selected mentor ID:
          <strong>{{ newMentorId || '-' }}</strong>
        </p>
      </div>

      <button :disabled="saving || !canSave" @click="handleSaveChange">
        {{ saving ? 'Saving...' : 'Save Change' }}
      </button>
    </section>

    <p v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  changeGroupMentor,
  searchGroup,
  type GroupInfo,
} from '../../api/consultant'
import {
  searchMentors,
  type MentorInfo,
} from '../../api/org'

const groupId = ref('')
const majorId = ref('')
const group = ref<GroupInfo | null>(null)

const mentorKeyword = ref('')
const mentorOptions = ref<MentorInfo[]>([])
const newMentorId = ref('')

const loadingGroup = ref(false)
const loadingMentors = ref(false)
const saving = ref(false)

const message = ref('')
const isError = ref(false)

const currentMentorId = computed(() => {
  const g: any = group.value || {}

  return (
    g.mentorId ||
    g.currentMentorId ||
    g.currentMentor ||
    g.mentor?.mentorId ||
    g.mentor?.id ||
    ''
  )
})

const canSave = computed(() => {
  return Boolean(group.value && newMentorId.value && newMentorId.value !== currentMentorId.value)
})

async function handleSearchGroup() {
  clearMessage()

  if (!groupId.value) {
    showError('Please enter a group ID.')
    return
  }

  loadingGroup.value = true
  group.value = null
  mentorOptions.value = []
  newMentorId.value = ''
  mentorKeyword.value = ''

  try {
    const result: any = await searchGroup(groupId.value, majorId.value || undefined)
    const foundGroup = result?.group || result

    if (!foundGroup || !(foundGroup.groupId || foundGroup.id)) {
      showError('Group not found. Try adding Major ID if multiple groups share the same Group ID.')
      return
    }

    group.value = foundGroup
  } catch (err: any) {
    showError(err?.message || 'Failed to search group.')
  } finally {
    loadingGroup.value = false
  }
}

async function handleSearchMentor() {
  clearMessage()

  if (!mentorKeyword.value) {
    showError('Please enter a mentor ID or name.')
    return
  }

  loadingMentors.value = true
  mentorOptions.value = []
  newMentorId.value = ''

  try {
    const list = await searchMentors(mentorKeyword.value)

    mentorOptions.value = list
      .map(normalizeMentor)
      .filter((mentor) => mentor.mentorId)

    if (mentorOptions.value.length === 0) {
      showError('No mentor found.')
      return
    }

    if (mentorOptions.value.length === 1) {
      newMentorId.value = mentorOptions.value[0].mentorId
    }
  } catch (err: any) {
    showError(err?.message || 'Failed to search mentor.')
  } finally {
    loadingMentors.value = false
  }
}

async function handleSaveChange() {
  clearMessage()

  if (!group.value) {
    showError('Please search a group first.')
    return
  }

  if (!newMentorId.value) {
    showError('Please select a new mentor.')
    return
  }

  if (newMentorId.value === currentMentorId.value) {
    showError('The new mentor is the same as the current mentor.')
    return
  }

  saving.value = true

  try {
    const realGroupId = String((group.value as any).groupId || (group.value as any).id)
    const updated: any = await changeGroupMentor(
        realGroupId,
        newMentorId.value,
        majorId.value || undefined,
    )

    group.value = {
      ...group.value,
      ...updated,
      groupId: updated?.groupId || realGroupId,
      mentorId: updated?.mentorId || newMentorId.value,
      currentMentorId: updated?.currentMentorId || newMentorId.value,
    } as any

    showSuccess('Mentor changed successfully.')
    newMentorId.value = ''
    mentorKeyword.value = ''
    mentorOptions.value = []
  } catch (err: any) {
    showError(err?.message || 'Failed to change mentor.')
  } finally {
    saving.value = false
  }
}

function normalizeMentor(raw: any): MentorInfo {
  const mentorId = String(raw?.mentorId || raw?.id || raw?.userId || raw?.username || '')
  const mentorName = String(raw?.mentorName || raw?.name || raw?.realName || raw?.username || mentorId)

  return {
    ...raw,
    id: raw?.id || mentorId,
    mentorId,
    mentorName,
    name: raw?.name || mentorName,
    email: raw?.email || '',
    office: raw?.office || '',
    groupId: raw?.groupId || '',
  }
}

function mentorLabel(mentor: MentorInfo): string {
  const name = mentor.mentorName || mentor.name || mentor.mentorId
  const email = mentor.email || ''
  const groupName = (mentor as any).groupName || mentor.groupId || ''

  return [name, email, groupName].filter(Boolean).join(' / ')
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
.page {
  max-width: 980px;
  margin: 0 auto;
}

h1 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 32px;
}

.desc {
  margin: 0 0 18px;
  color: #4b5563;
}

.card {
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

h2 {
  margin: 0 0 22px;
  color: #111827;
  font-size: 26px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 700;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
}

button {
  margin-top: 12px;
  padding: 9px 14px;
  border: none;
  border-radius: 5px;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: start;
}

.search-row button {
  margin-top: 0;
}

.block {
  margin-top: 18px;
}

.hint {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.message {
  margin-top: 14px;
  color: #047857;
}

.message.error {
  color: #dc2626;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

.field {
  display: block;
}

.hint {
  font-weight: 400;
  color: #6b7280;
  font-size: 12px;
}

@media (max-width: 720px) {
  .field-row {
    grid-template-columns: 1fr;
  }

  .search-row {
    grid-template-columns: 1fr;
  }
}
</style>
