<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Change Mentors</h1>
        <p class="desc">Change the mentor assigned to a group.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <!-- Search a group -->
      <div class="form-item">
        <label>Search by Group ID</label>
        <div class="search-row">
          <input
              v-model="searchGroupId"
              type="text"
              placeholder="Enter Group ID, e.g. B01"
              @keyup.enter="searchGroup"
          />
          <button @click="searchGroup">Search</button>
        </div>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">
        {{ message }}
      </p>

      <!-- Result table -->
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
        <tr v-for="g in filteredGroups" :key="g.groupId">
          <td>{{ g.groupId }}</td>

          <!-- 重点：这里不再直接显示 g.mentorName，而是用 mentorId 转名字 -->
          <td>{{ getCurrentMentorName(g) }}</td>

          <td>
            <select
                v-model="newMentorIds[g.groupId]"
                :disabled="savingId === g.groupId"
            >
              <option value="">-- Select Mentor --</option>
              <option
                  v-for="m in mentorList"
                  :key="m.id"
                  :value="m.id"
              >
                {{ m.name }}
              </option>
            </select>
          </td>

          <td>
            <button
                :disabled="!newMentorIds[g.groupId] || savingId === g.groupId"
                @click="saveChange(g.groupId)"
            >
              {{ savingId === g.groupId ? 'Saving...' : 'Save' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <p v-else-if="!isLoading" class="empty">
        No groups found. Try another Group ID or click Search to load all.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listGroups, changeGroupMentor } from '../../api/consultant'
import type { GroupSummary } from '../../api/consultant'

const router = useRouter()

type EditableGroup = GroupSummary & {
  groupId: string
  mentorId?: string
  mentorName?: string
  currentMentor?: string
  currentMentorId?: string
  mentor?: any
  [key: string]: any
}

const groups = ref<EditableGroup[]>([])
const searchGroupId = ref('')
const newMentorIds = reactive<Record<string, string>>({})
const message = ref('')
const isError = ref(false)
const isLoading = ref(true)
const savingId = ref('')

/**
 * 临时导师列表：
 * 因为后端现在只返回 mentorId，所以前端先用这个表把 ID 转成名字。
 *
 * 如果你们后端有更多 mentor，就继续往这里加。
 * 例如：
 * { id: 'M005', name: 'Tom Chen' }
 */
const mentorList = ref([
  { id: 'M001', name: 'Jack' },
  { id: 'M002', name: 'Peter' },
  { id: 'M003', name: 'Mark' },
  { id: 'M004', name: 'Mary Lee' },
])

const filteredGroups = computed(() => {
  const q = searchGroupId.value.trim().toLowerCase()
  if (!q) return groups.value

  return groups.value.filter((g) =>
      String(g.groupId || '').toLowerCase().includes(q),
  )
})

onMounted(async () => {
  await loadGroups()
})

async function loadGroups() {
  message.value = ''
  isError.value = false
  isLoading.value = true

  try {
    groups.value = (await listGroups()) as EditableGroup[]
  } catch (err: any) {
    message.value = 'Failed to load groups: ' + (err.message || 'Unknown error')
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function searchGroup() {
  message.value = ''
  isError.value = false

  if (filteredGroups.value.length === 0) {
    message.value = 'No matching group found.'
    isError.value = true
  }
}

/**
 * 有些后端可能返回：
 * mentorId: "M001"
 *
 * 有些旧数据可能返回：
 * mentorName: "Mentor#M001"
 *
 * 这个函数负责把它们统一变成 "M001"。
 */
function normalizeMentorId(value: unknown): string {
  if (value === null || value === undefined) return ''

  const raw = String(value).trim()
  if (!raw) return ''

  const match = raw.match(/#\s*([A-Za-z0-9_-]+)$/)
  if (match) return match[1]

  return raw
}

/**
 * 从 group 里尽量取出 mentorId。
 * 兼容多种后端字段名。
 */
function getGroupMentorId(group: EditableGroup): string {
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

  /**
   * 如果后端只给了 mentorName: "Mentor#M001"，
   * 也可以从这里解析出 M001。
   */
  const nameLikeCandidates = [
    group.mentorName,
    group.currentMentor,
    group.mentor,
  ]

  for (const item of nameLikeCandidates) {
    const id = normalizeMentorId(item)
    if (id && /^M\d+$/i.test(id)) return id
  }

  return ''
}

/**
 * 根据 mentorId 找 mentor name。
 */
function getMentorNameById(mentorId: string): string {
  const normalizedId = normalizeMentorId(mentorId)

  const mentor = mentorList.value.find(
      (m) => normalizeMentorId(m.id) === normalizedId,
  )

  return mentor?.name || ''
}

/**
 * 页面上显示 Current Mentor 时统一走这个函数。
 *
 * 优先级：
 * 1. 如果能拿到 mentorId，并且 mentorList 里有对应名字，显示名字
 * 2. 如果后端本来就返回了正常名字，显示后端名字
 * 3. 如果只有 ID，就显示 ID
 */
function getCurrentMentorName(group: EditableGroup): string {
  const mentorId = getGroupMentorId(group)

  if (mentorId) {
    const nameFromList = getMentorNameById(mentorId)
    if (nameFromList) return nameFromList
  }

  const possibleNames = [
    group.mentorName,
    group.currentMentor,
    group.mentor?.name,
    group.mentor?.mentorName,
  ]

  for (const item of possibleNames) {
    if (!item) continue

    const text = String(item).trim()
    if (!text) continue

    /**
     * 如果是 Mentor#M001 这种，就不要直接显示，
     * 继续尝试显示 ID 或名字。
     */
    if (/^Mentor#/.test(text)) continue

    return text
  }

  return mentorId || '-'
}

async function saveChange(groupId: string) {
  message.value = ''
  isError.value = false

  const newMentorId = newMentorIds[groupId]

  if (!newMentorId) {
    message.value = 'Warning: Please select a new mentor.'
    isError.value = true
    return
  }

  savingId.value = groupId

  try {
    await changeGroupMentor(groupId, newMentorId)

    const group = groups.value.find((g) => g.groupId === groupId)
    const newMentorName = getMentorNameById(newMentorId) || newMentorId

    /**
     * 重点：
     * 后端只返回 mentorId，所以保存成功后，
     * 前端本地直接把当前行的 mentorId / mentorName 更新掉。
     */
    if (group) {
      group.mentorId = newMentorId
      group.currentMentorId = newMentorId
      group.mentorName = newMentorName
      group.currentMentor = newMentorName
    }

    newMentorIds[groupId] = ''

    message.value = `Mentor of group ${groupId} updated to ${newMentorName}.`
  } catch (err: any) {
    message.value = err.message || 'Failed to change mentor.'
    isError.value = true
  } finally {
    savingId.value = ''
  }
}

function goHome() {
  router.push('/main')
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
  max-width: 625px;
}

.search-row input {
  flex: 1;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
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

select {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
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
