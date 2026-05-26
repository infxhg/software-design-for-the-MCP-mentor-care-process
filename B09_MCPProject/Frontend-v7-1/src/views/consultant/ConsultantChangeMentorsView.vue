<template>
  <div class="page">
    <h1>Change Mentors</h1>
    <p class="desc">
      Search a group by Group ID (and optionally Major ID), then assign a new mentor.
      <br />
      <span class="hint-inline">
        Group ID alone may match multiple groups (one per major in the same academic year);
        adding Major ID returns the single exact group.
      </span>
    </p>

    <section class="card search-card">
      <div class="form-row">
        <label>Group ID</label>
        <input
          v-model.trim="groupId"
          placeholder="Enter group ID, e.g. 2024-2025-Y1"
          @keyup.enter="handleSearchGroup"
        />
      </div>

      <!--
        修改点 (v9 NEW)：
        新增 Major ID 输入框 (optional)。
          - 只填 groupId  → 后端返回多个 group（同学年同年级，每个 major 一个）
          - groupId + majorId → 后端返回 1 个 group（精确定位）
        前端把 groupId 和 majorId 都透传给同一个接口 /api/mentoring/groups/search。
      -->
      <div class="form-row">
        <label>
          Major ID
          <span class="optional">(optional, used to precisely locate one group)</span>
        </label>
        <input
          v-model.trim="majorId"
          placeholder="Enter major ID, e.g. CST / AI"
          @keyup.enter="handleSearchGroup"
        />
      </div>

<<<<<<< HEAD
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
=======
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
      <button :disabled="loadingGroup || !groupId" @click="handleSearchGroup">
        {{ loadingGroup ? 'Searching...' : 'Search Group' }}
      </button>
    </section>

    <p v-if="searchMessage" class="message" :class="{ error: searchIsError }">
      {{ searchMessage }}
    </p>

    <!--
      修改点 (v9)：
      展示成 group 列表。每个 group 一张卡片，自带：
        - Group 元信息（groupId / name / major / current mentor）
        - 独立的 mentor 搜索框 + Search Mentor 按钮
        - 独立的 New Mentor 下拉 + Save Change 按钮
        - 独立的 message 区域
      多个 group 卡片之间状态隔离，互不影响。
    -->
    <section
      v-for="(card, index) in groupCards"
      :key="card.id"
      class="card group-card"
    >
      <h2>
        Group {{ groupCards.length > 1 ? `#${index + 1}` : '' }}
      </h2>

      <p>
        <strong>Group ID:</strong>
        {{ displayGroupId(card.group) || '-' }}
      </p>

      <p v-if="card.group.name">
        <strong>Name:</strong>
        {{ card.group.name }}
      </p>

      <p v-if="card.group.major">
        <strong>Major:</strong>
        {{ card.group.major }}
      </p>

      <p>
        <strong>Current Mentor ID:</strong>
        {{ getCurrentMentorId(card.group) || '-' }}
      </p>

      <div class="block">
        <label>Search Mentor</label>
        <div class="search-row">
          <input
            v-model.trim="card.mentorKeyword"
            placeholder="Enter mentor ID, name, or email"
            @keyup.enter="() => handleSearchMentor(card)"
          />
          <button
            :disabled="card.loadingMentors || !card.mentorKeyword"
            @click="() => handleSearchMentor(card)"
          >
            {{ card.loadingMentors ? 'Searching...' : 'Search Mentor' }}
          </button>
        </div>
      </div>

      <div class="block">
        <label>New Mentor</label>

        <select v-model="card.newMentorId">
          <option value="">Please select</option>
          <option
            v-for="mentor in card.mentorOptions"
            :key="mentor.mentorId"
            :value="mentor.mentorId"
          >
            {{ mentorLabel(mentor) }}
          </option>
        </select>

        <p class="hint">
          Selected mentor ID:
          <strong>{{ card.newMentorId || '-' }}</strong>
        </p>
      </div>

      <button :disabled="card.saving || !canSaveCard(card)" @click="() => handleSaveChange(card)">
        {{ card.saving ? 'Saving...' : 'Save Change' }}
      </button>

      <p v-if="card.message" class="message" :class="{ error: card.isError }">
        {{ card.message }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
<<<<<<< HEAD
const majorId = ref('')
const group = ref<GroupInfo | null>(null)

const mentorKeyword = ref('')
const mentorOptions = ref<MentorInfo[]>([])
const newMentorId = ref('')
=======
// 修改点 (v9 NEW)：新增 majorId 输入
const majorId = ref('')
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5

const loadingGroup = ref(false)
const searchMessage = ref('')
const searchIsError = ref(false)

/**
 * 修改点 (v9 NEW)：
 * 由「单个 group」改成「group 卡片列表」。
 * 每张卡片封装了一组 mentor 搜索 / 选择 / 保存的局部状态，
 * 多个卡片之间互不影响。
 *
 * id 字段用于 v-for :key，优先用真实 group 唯一标识，
 * 没有时用本地 index 兜底。
 */
interface GroupCardState {
  id: string
  group: GroupInfo
  mentorKeyword: string
  mentorOptions: MentorInfo[]
  newMentorId: string
  loadingMentors: boolean
  saving: boolean
  message: string
  isError: boolean
}

const groupCards = ref<GroupCardState[]>([])

function makeCard(group: GroupInfo, fallbackIndex: number): GroupCardState {
  const id =
    String((group as any).groupKey ?? '').trim() ||
    String((group as any).id ?? '').trim() ||
    String(group.groupId ?? '').trim() ||
    `group_${fallbackIndex}_${Date.now()}`

  return {
    id,
    group,
    mentorKeyword: '',
    mentorOptions: [],
    newMentorId: '',
    loadingMentors: false,
    saving: false,
    message: '',
    isError: false,
  }
}

function displayGroupId(group: GroupInfo): string {
  // 优先展示学年标识形式 (group.name 通常是 2024-2025-Y1 这种)，
  // 否则回退到 group.groupId / group.id
  const candidates = [
    (group as any).displayGroupId,
    group.name,
    group.groupId,
    (group as any).id,
  ]
  for (const c of candidates) {
    const s = String(c ?? '').trim()
    if (s) return s
  }
  return ''
}

function getCurrentMentorId(group: GroupInfo): string {
  const g: any = group || {}
  return (
    g.mentorId ||
    g.currentMentorId ||
    g.currentMentor ||
    g.mentor?.mentorId ||
    g.mentor?.id ||
    ''
  )
}

function canSaveCard(card: GroupCardState): boolean {
  return Boolean(
    card.group &&
      card.newMentorId &&
      card.newMentorId !== getCurrentMentorId(card.group),
  )
}

async function handleSearchGroup() {
  clearSearchMessage()
  groupCards.value = []

  if (!groupId.value) {
    showSearchError('Please enter a group ID.')
    return
  }

  loadingGroup.value = true

  try {
<<<<<<< HEAD
    const result: any = await searchGroup(groupId.value, majorId.value || undefined)
    const foundGroup = result?.group || result

    if (!foundGroup || !(foundGroup.groupId || foundGroup.id)) {
      showError('Group not found. Try adding Major ID if multiple groups share the same Group ID.')
=======
    /**
     * 修改点 (v9)：
     * 用 searchGroup(groupId, majorId) 调用同一个接口
     * GET /api/mentoring/groups/search?groupId=&majorId=
     * - 只填 groupId  → 后端返回多 group (data.groups[])
     * - groupId+majorId → 后端返回单 group (data.groups[] 长度 1，也可能是 data.group)
     *
     * 取 result.groups 数组（新版 searchGroup 已经会把多/单 group 都规范成数组）。
     * 老的 result.group 字段仍保留，作为最后的兜底。
     */
    const result: any = await searchGroup(
      groupId.value,
      majorId.value || undefined,
    )

    let groups: GroupInfo[] = []
    if (Array.isArray(result?.groups) && result.groups.length > 0) {
      groups = result.groups
    } else if (result?.group && (result.group.groupId || result.group.id)) {
      groups = [result.group]
    }

    if (groups.length === 0) {
      showSearchError('Group not found.')
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5
      return
    }

    groupCards.value = groups.map((g, idx) => makeCard(g, idx))

    if (majorId.value && groups.length > 1) {
      // 一般情况下带 majorId 应该精确到 1 个，提示一下让用户注意
      showSearchInfo(
        `Found ${groups.length} groups matching Group ID + Major ID — please check.`,
      )
    } else if (!majorId.value && groups.length > 1) {
      showSearchInfo(
        `Found ${groups.length} groups for this Group ID. Each card below corresponds to one major; assign mentor per group independently.`,
      )
    }
  } catch (err: any) {
    showSearchError(err?.message || 'Failed to search group.')
  } finally {
    loadingGroup.value = false
  }
}

async function handleSearchMentor(card: GroupCardState) {
  clearCardMessage(card)

  if (!card.mentorKeyword) {
    showCardError(card, 'Please enter a mentor ID, name, or email.')
    return
  }

  card.loadingMentors = true
  card.mentorOptions = []
  card.newMentorId = ''

  try {
    const list = await searchMentors(card.mentorKeyword)

    card.mentorOptions = list
      .map(normalizeMentor)
      .filter((mentor) => mentor.mentorId)

    if (card.mentorOptions.length === 0) {
      showCardError(card, 'No mentor found.')
      return
    }

    if (card.mentorOptions.length === 1) {
      card.newMentorId = card.mentorOptions[0].mentorId
    }
  } catch (err: any) {
    showCardError(card, err?.message || 'Failed to search mentor.')
  } finally {
    card.loadingMentors = false
  }
}

async function handleSaveChange(card: GroupCardState) {
  clearCardMessage(card)

  if (!card.group) {
    showCardError(card, 'Please search a group first.')
    return
  }

  if (!card.newMentorId) {
    showCardError(card, 'Please select a new mentor.')
    return
  }

  const currentMentorId = getCurrentMentorId(card.group)
  if (card.newMentorId === currentMentorId) {
    showCardError(card, 'The new mentor is the same as the current mentor.')
    return
  }

  card.saving = true

  try {
<<<<<<< HEAD
    const realGroupId = String((group.value as any).groupId || (group.value as any).id)
    const updated: any = await changeGroupMentor(
        realGroupId,
        newMentorId.value,
        majorId.value || undefined,
    )
=======
    /**
     * 修改点 (v9)：
     * 改 mentor 时 groupId 用 group 自身真实的唯一标识（优先 groupKey UUID，
     * 退化到 group.groupId / id），同时把 group 上携带的 majorId 透传过去，
     * 防止后端用学年标识形式拿到多个组而无法精确定位。
     */
    const realGroupId =
      String((card.group as any).groupKey ?? '').trim() ||
      String(card.group.groupId ?? '').trim() ||
      String((card.group as any).id ?? '').trim()
>>>>>>> 75b64c7fca6f28dbd6ad49b258018c732b1e2df5

    const groupMajorId =
      String((card.group as any).majorId ?? '').trim() ||
      String(card.group.major ?? '').trim() ||
      majorId.value ||
      undefined

    const updated: any = await changeGroupMentor(
      realGroupId,
      card.newMentorId,
      groupMajorId || undefined,
    )

    card.group = {
      ...card.group,
      ...updated,
      groupId: updated?.groupId || realGroupId,
      mentorId: updated?.mentorId || card.newMentorId,
      currentMentorId: updated?.currentMentorId || card.newMentorId,
    } as any

    showCardSuccess(card, 'Mentor changed successfully.')
    card.newMentorId = ''
    card.mentorKeyword = ''
    card.mentorOptions = []
  } catch (err: any) {
    showCardError(card, err?.message || 'Failed to change mentor.')
  } finally {
    card.saving = false
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

function clearSearchMessage() {
  searchMessage.value = ''
  searchIsError.value = false
}

function showSearchInfo(text: string) {
  searchMessage.value = text
  searchIsError.value = false
}

function showSearchError(text: string) {
  searchMessage.value = text
  searchIsError.value = true
}

function clearCardMessage(card: GroupCardState) {
  card.message = ''
  card.isError = false
}

function showCardSuccess(card: GroupCardState, text: string) {
  card.message = text
  card.isError = false
}

function showCardError(card: GroupCardState, text: string) {
  card.message = text
  card.isError = true
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

.hint-inline {
  color: #6b7280;
  font-size: 13px;
}

.card {
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.search-card .form-row {
  margin-bottom: 12px;
}

.group-card {
  border-left: 4px solid #2563eb;
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

.optional {
  color: #6b7280;
  font-weight: 400;
  font-size: 13px;
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
