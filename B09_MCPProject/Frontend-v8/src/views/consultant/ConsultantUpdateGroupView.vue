<template>
  <section class="page">
    <h1>Update Mentor Group</h1>

    <!--
      修改点：搜索区
      仅输入 Group ID → 后端返回该 FC 范围内所有匹配的小组（不同 major，
        也可能同 major 不同 mentor）；每个 group 以独立卡片展示
      加上 Major ID → 缩窄到该 major 下的小组（仍可能同 majorId 但 mentor 不同
        分成多组），同样以独立卡片展示
    -->
    <div class="card">
      <div class="field-row">
        <label class="field">
          Group ID
          <input
            v-model.trim="groupId"
            placeholder="e.g. 2024-2025-Y1"
            @keyup.enter="load"
          />
        </label>
        <label class="field">
          Major ID <span class="hint">(optional, to narrow down)</span>
          <input
            v-model.trim="majorId"
            placeholder="e.g. CST / AI"
            @keyup.enter="load"
          />
        </label>
      </div>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading || !groupId" @click="load">
          {{ loading ? 'Loading…' : 'Load Groups' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!loading && loaded && groupCards.length === 0 && !error" class="muted">
      No groups found.
    </p>

    <!-- 每个 group 一张卡片，互不影响 -->
    <div v-for="card in groupCards" :key="card.groupKey || card.fallbackId" class="card">
      <header class="group-header">
        <h2>{{ card.group.name || card.group.groupId }}</h2>
        <span v-if="card.group.major" class="badge">Major: {{ card.group.major }}</span>
      </header>

      <ul class="meta">
        <li><strong>Group ID:</strong> {{ card.group.groupId || '-' }}</li>
        <li><strong>Major:</strong> {{ card.group.major || card.group.majorId || '-' }}</li>
        <li>
          <strong>Mentor:</strong>
          {{ card.group.mentorName || card.group.mentorId || '-' }}
          <span v-if="card.group.mentorName && card.group.mentorId" class="hint">
            ({{ card.group.mentorId }})
          </span>
        </li>
        <!--
          修改点：移除 Group Key 展示行。
          groupKey 只是后端用于精确定位组的内部唯一标识符，
          不应暴露给用户；用户只需要看到 Group ID（学年-年级）+ Major + Mentor 即可。
          代码里仍然保留 card.groupKey 供 add / remove 接口使用。
        -->
      </ul>

      <div class="add-row">
        <input
          v-model.trim="card.newStudentId"
          class="add-input"
          placeholder="Student ID to add (9 digits, e.g. 330026143)"
          :disabled="!card.groupKey"
          @keyup.enter="addStudent(card)"
        />
        <button
          class="btn btn-success"
          :disabled="card.saving || !card.newStudentId || !card.groupKey"
          @click="addStudent(card)"
        >
          {{ card.saving ? 'Saving…' : 'Add Student' }}
        </button>
      </div>
      <p v-if="!card.groupKey" class="error">
        This group cannot be modified right now. Please reload or contact support.
      </p>
      <p v-if="card.message" :class="['add-message', card.messageType]">{{ card.message }}</p>

      <table class="table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Major</th>
            <th>Status</th>
            <th>Group ID</th>
            <th>Update Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in card.members" :key="m.studentId">
            <td>{{ m.studentId }}</td>
            <td>{{ m.majorId || m.major || '-' }}</td>
            <td>{{ m.status || '-' }}</td>
            <td>{{ m.groupId || '-' }}</td>
            <td>{{ m.updateTime || '-' }}</td>
            <td>
              <button
                class="btn btn-danger"
                :disabled="card.saving || !card.groupKey"
                @click="removeStudent(card, m.studentId)"
              >
                Remove
              </button>
            </td>
          </tr>
          <tr v-if="card.members.length === 0">
            <td colspan="6" class="empty">No members.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  addStudentToGroupByKey,
  getGroupMembers,
  removeStudentFromGroupByKey,
  searchGroup,
  type GroupInfo,
  type GroupMember,
} from '../../api/mentoring'

/**
 * 修改点：每张卡片的局部状态（多卡片场景下互不干扰）。
 * - groupKey：唯一标识，add/remove 走 by-key 接口靠它定位组
 * - members：仅属于该组的成员（按 groupKey/groupId+majorId+mentorId 过滤）
 * - newStudentId / saving / message：每张卡片自己的输入态和反馈
 */
interface GroupCard {
  fallbackId: string          // v-for 兜底 key
  groupKey: string
  group: GroupInfo
  members: GroupMember[]
  newStudentId: string
  saving: boolean
  message: string
  messageType: 'success' | 'error' | ''
}

const groupId = ref('')
const majorId = ref('')

const groupCards = ref<GroupCard[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')

const STUDENT_ID_PATTERN = /^\d{9}$/

function validateStudentId(input: string): string {
  if (!input) return 'Student ID cannot be empty.'
  if (!STUDENT_ID_PATTERN.test(input)) {
    return 'Invalid Student ID. It must be exactly 9 digits.'
  }
  return ''
}

function setCardMessage(card: GroupCard, type: 'success' | 'error', text: string) {
  card.message = text
  card.messageType = type
}

function clearCardMessage(card: GroupCard) {
  card.message = ''
  card.messageType = ''
}

/**
 * 修改点：把从后端拿到的扁平 members[] 分到各自的卡片下。
 * 匹配优先级：
 *   1) groupKey 严格相等（最可靠，唯一标识）
 *   2) groupId + majorId + mentorId 全等（无 groupKey 时退而求其次）
 *   3) groupId + majorId（仍可能跨 mentor，但能避开跨 major 的混淆）
 * 一个 member 只挂到第一个匹配的卡片下，避免重复。
 */
function bucketMembers(groups: GroupInfo[], members: GroupMember[]): Map<string, GroupMember[]> {
  const buckets = new Map<string, GroupMember[]>()
  groups.forEach((g, idx) => {
    const key = String((g as any).groupKey || '') || `__idx_${idx}`
    buckets.set(key, [])
  })

  for (const m of members) {
    const memberKey = String((m as any).groupKey || '').trim()
    const memberMentor = String((m as any).mentorId || '').trim()
    const memberGroupId = String(m.groupId || '').trim()
    const memberMajor = String(m.majorId || '').trim()

    let matchedIdx = -1

    if (memberKey) {
      matchedIdx = groups.findIndex((g) => String((g as any).groupKey || '') === memberKey)
    }

    if (matchedIdx < 0 && memberMentor) {
      matchedIdx = groups.findIndex(
        (g) =>
          String(g.mentorId || '') === memberMentor &&
          String(g.groupId || '') === memberGroupId &&
          (!memberMajor || String((g as any).majorId || g.major || '') === memberMajor),
      )
    }

    if (matchedIdx < 0) {
      matchedIdx = groups.findIndex(
        (g) =>
          String(g.groupId || '') === memberGroupId &&
          (!memberMajor || String((g as any).majorId || g.major || '') === memberMajor),
      )
    }

    if (matchedIdx < 0) matchedIdx = 0 // 最后兜底挂到第一张

    const g = groups[matchedIdx]
    const key = String((g as any).groupKey || '') || `__idx_${matchedIdx}`
    const list = buckets.get(key)
    if (list) list.push(m)
  }

  return buckets
}

function buildCard(group: GroupInfo, members: GroupMember[], idx: number): GroupCard {
  const groupKey = String((group as any).groupKey || '').trim()
  return reactive({
    fallbackId: groupKey || `group_${idx}_${Date.now()}`,
    groupKey,
    group,
    members,
    newStudentId: '',
    saving: false,
    message: '',
    messageType: '',
  }) as GroupCard
}

async function load() {
  loading.value = true
  loaded.value = false
  error.value = ''
  groupCards.value = []

  try {
    const result = await searchGroup(groupId.value, majorId.value || undefined)

    let groups: GroupInfo[] = []
    if (Array.isArray(result?.groups) && result.groups.length > 0) {
      groups = result.groups
    } else if (result?.group) {
      groups = [result.group]
    }

    if (groups.length === 0) {
      loaded.value = true
      return
    }

    // 把扁平 members 分桶到对应卡片
    const flatMembers = Array.isArray(result?.members) ? result.members : []
    const buckets = bucketMembers(groups, flatMembers)

    groupCards.value = groups.map((g, idx) => {
      const key = String((g as any).groupKey || '') || `__idx_${idx}`
      const bucketed = buckets.get(key) || []
      return buildCard(g, bucketed, idx)
    })

    /**
     * 修改点：如果 search 没把成员一起回来（flatMembers 空），
     * 且只有一张卡，可以退化到老接口 getGroupMembers(groupId, majorId) 补一次；
     * 多张卡时不再额外请求，避免对同一 groupId 多次调用拿不到细分。
     */
    if (flatMembers.length === 0 && groupCards.value.length === 1) {
      try {
        const single = groupCards.value[0]
        const fallback = await getGroupMembers(
          single.group.groupId || groupId.value,
          (single.group as any).majorId || single.group.major || majorId.value || undefined,
        )
        single.members = fallback
      } catch {
        // 静默：组本身能展示，仅成员列表为空，不阻塞主流程
      }
    }

    loaded.value = true
  } catch (e: any) {
    error.value = e?.message || 'Failed to load groups.'
  } finally {
    loading.value = false
  }
}

async function addStudent(card: GroupCard) {
  clearCardMessage(card)

  const validationError = validateStudentId(card.newStudentId)
  if (validationError) {
    setCardMessage(card, 'error', validationError)
    return
  }
  if (!card.groupKey) {
    // 修改点：不向用户暴露 "Group key" 这种数据库术语
    setCardMessage(card, 'error', 'This group cannot be modified right now. Please reload.')
    return
  }

  card.saving = true
  try {
    await addStudentToGroupByKey(card.groupKey, card.newStudentId)
    const justAdded = card.newStudentId
    card.newStudentId = ''
    setCardMessage(card, 'success', `Student ${justAdded} added.`)
    await refreshCard(card)
  } catch (e: any) {
    setCardMessage(card, 'error', e?.message || 'Failed to add student.')
  } finally {
    card.saving = false
  }
}

async function removeStudent(card: GroupCard, studentId: string) {
  if (!card.groupKey) {
    // 修改点：不向用户暴露 "Group key" 这种数据库术语
    setCardMessage(card, 'error', 'This group cannot be modified right now. Please reload.')
    return
  }
  if (!window.confirm(`Remove ${studentId} from this group?`)) return

  clearCardMessage(card)
  card.saving = true
  try {
    await removeStudentFromGroupByKey(card.groupKey, studentId)
    setCardMessage(card, 'success', `Student ${studentId} removed.`)
    await refreshCard(card)
  } catch (e: any) {
    setCardMessage(card, 'error', e?.message || 'Failed to remove student.')
  } finally {
    card.saving = false
  }
}

/**
 * 修改点：单卡片成员列表局部刷新。
 * 用整组搜索拿到最新 members[] 再按 groupKey 把当前卡片的桶取出，
 * 避免一张卡的增删导致其它卡片状态丢失。
 */
async function refreshCard(card: GroupCard) {
  try {
    const result = await searchGroup(groupId.value, majorId.value || undefined)
    const groups: GroupInfo[] =
      Array.isArray(result?.groups) && result.groups.length > 0
        ? result.groups
        : result?.group
          ? [result.group]
          : []
    const flat = Array.isArray(result?.members) ? result.members : []
    const buckets = bucketMembers(groups, flat)
    const newList = buckets.get(card.groupKey) || []
    card.members = newList

    const updatedGroup = groups.find((g) => String((g as any).groupKey || '') === card.groupKey)
    if (updatedGroup) {
      Object.assign(card.group, updatedGroup)
    }
  } catch {
    // 失败也不致命：保持现有 members 即可
  }
}
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.muted { color: #94a3b8; margin-top: 12px; }

.card {
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 14px;
}

.group-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.group-header h2 { margin: 0; }
.badge {
  display: inline-block;
  padding: 3px 10px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.meta { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.meta li { font-size: 14px; color: #334155; }
.meta code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
}

.field-row { display: flex; flex-wrap: wrap; gap: 16px; }
.field { display: grid; gap: 6px; font-weight: 600; flex: 1 1 220px; }
.field .hint { font-weight: 400; color: #94a3b8; font-size: 12px; }
.hint { color: #94a3b8; font-weight: 400; font-size: 12px; }

input {
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font: inherit;
}
input:focus { outline: none; border-color: #1f6feb; box-shadow: 0 0 0 3px rgba(31,111,235,.15); }
input:disabled { background: #f1f5f9; color: #94a3b8; }

.actions { display: flex; }

.add-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.add-input { flex: 1 1 280px; min-width: 220px; }
.add-message { margin: 0; font-size: 14px; }
.add-message.success { color: #15803d; }
.add-message.error { color: #b42318; }

.btn {
  padding: 9px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .15s ease, opacity .15s ease;
  white-space: nowrap;
}
.btn:disabled { opacity: .55; cursor: not-allowed; }

.btn-primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1a5fd0; }

.btn-success { background: #16a34a; border-color: #16a34a; color: #fff; }
.btn-success:hover:not(:disabled) { background: #128a3e; }

.btn-danger { background: #dc2626; border-color: #dc2626; color: #fff; padding: 6px 12px; }
.btn-danger:hover:not(:disabled) { background: #b91c1c; }

.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; }
th { background: #f8fafc; }
.error { color: #b42318; }
.inline-error { font-weight: 400; margin-left: 4px; }
.empty { text-align: center; color: #777; }
</style>
