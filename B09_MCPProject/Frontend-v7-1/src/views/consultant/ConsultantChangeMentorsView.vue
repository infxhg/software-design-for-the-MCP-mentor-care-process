<template>
  <section class="page">
    <h1>Change Mentors</h1>
    <p class="muted">Search a group, then assign a new mentor.</p>

    <div class="card">
      <label>
        Group ID
        <input v-model.trim="groupId" placeholder="e.g. group_a1" />
      </label>
      <button class="primary" :disabled="loading || !groupId" @click="loadGroup">Search Group</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="group" class="card">
      <h2>Group</h2>
      <p><strong>Group ID:</strong> {{ group.groupId }}</p>
      <p><strong>Name:</strong> {{ group.name || '-' }}</p>
      <p><strong>Current Mentor ID:</strong> {{ group.mentorId || '-' }}</p>

      <label>
        Search Mentor
        <input v-model.trim="mentorKeyword" placeholder="mentor name / email / username" @keyup.enter="loadMentors" />
      </label>
      <button :disabled="mentorLoading" @click="loadMentors">Load Mentors</button>

      <label>
        New Mentor
        <select v-model="selectedMentorId">
          <option value="">Please select</option>
          <option v-for="m in mentors" :key="m.mentorId" :value="m.mentorId">
            {{ m.mentorName }} / {{ m.email }} / {{ m.departmentName }}
          </option>
        </select>
      </label>

      <button class="primary" :disabled="saving || !selectedMentorId" @click="save">
        {{ saving ? 'Saving...' : 'Save Change' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { changeGroupMentor, searchGroup } from '../../api/mentoring'
import { searchMentors, type MentorInfo } from '../../api/org'
import type { GroupInfo } from '../../api/mentoring'

const groupId = ref('')
const group = ref<GroupInfo | null>(null)
const mentors = ref<MentorInfo[]>([])
const selectedMentorId = ref('')
const mentorKeyword = ref('')
const loading = ref(false)
const mentorLoading = ref(false)
const saving = ref(false)
const error = ref('')

async function loadGroup() {
  loading.value = true
  error.value = ''
  group.value = null
  try {
    const data = await searchGroup(groupId.value)
    group.value = data.group || null
    selectedMentorId.value = ''
    if (!group.value) error.value = 'No group found.'
  } catch (e: any) {
    error.value = e.message || 'Failed to load group.'
  } finally {
    loading.value = false
  }
}

async function loadMentors() {
  mentorLoading.value = true
  error.value = ''
  try {
    mentors.value = await searchMentors(mentorKeyword.value)
  } catch (e: any) {
    error.value = e.message || 'Failed to load mentors.'
  } finally {
    mentorLoading.value = false
  }
}

async function save() {
  if (!group.value || !selectedMentorId.value) return
  saving.value = true
  error.value = ''
  try {
    group.value = await changeGroupMentor(group.value.groupId, selectedMentorId.value)
    alert('Mentor changed successfully.')
  } catch (e: any) {
    error.value = e.message || 'Failed to change mentor.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 24px; }
.card { margin-top: 16px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-weight: 600; }
input, select { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
button { width: fit-content; padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
.muted { color: #666; }
</style>
