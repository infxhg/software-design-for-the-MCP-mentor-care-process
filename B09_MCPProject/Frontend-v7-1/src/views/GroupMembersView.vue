<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Group Members</h1>
        <p class="desc">Group ID: {{ displayGroupId }}</p>
      </div>

      <button class="secondary" @click="goBack">Back</button>
    </div>

    <div v-if="isLoading" class="loading">
      Loading group members...
    </div>

    <div v-else-if="students.length > 0">
      <table>
        <thead>
        <tr>
          <th>Student ID</th>
          <th>Major</th>
          <th>Status</th>
          <th>Group ID</th>
          <th>Records</th>
          <th>Operation</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="s in students" :key="String(s.studentId)">
          <td>{{ s.studentId }}</td>
          <td>{{ s.majorId || 'N/A' }}</td>
          <td>{{ s.status || 'N/A' }}</td>
          <td>{{ s.groupId || displayGroupId }}</td>
          <td>{{ s.interviewRecords?.length || 0 }} records</td>

          <td>
            <button class="link-button" @click="viewRecord(String(s.studentId))">
              View Record
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!errorMsg" class="empty">
      No students found in this group.
    </p>

    <p v-if="errorMsg" class="error">
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGroupMembers,
  getRecordsByGroup,
  searchGroup,
  type GroupMember,
  type StudentGroupRecord,
} from '../api/mentoring'

const route = useRoute()
const router = useRouter()

const routeParamId = String(route.params.groupId || '').trim()
const queryGid = String(route.query.gid || '').trim()
const majorId = String(route.query.majorId || '').trim() || undefined
const displayGroupId = computed(() => queryGid || routeParamId)

const students = ref<StudentGroupRecord[]>([])
const isLoading = ref(true)
const errorMsg = ref('')

const GROUP_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/

function validateGroupId(input: string): string {
  if (!input) return 'Group ID cannot be empty.'
  if (!GROUP_ID_PATTERN.test(input)) return 'Invalid Group ID format.'
  return ''
}

function memberToRow(member: GroupMember, groupLabel: string): StudentGroupRecord {
  return {
    studentId: String(member.studentId),
    majorId: member.majorId,
    status: member.status,
    groupId: member.groupId || groupLabel,
    interviewRecords: [],
  }
}

async function loadGroupMembers(): Promise<StudentGroupRecord[]> {
  const data = await searchGroup(routeParamId, majorId)

  if (data.members?.length) {
    return data.members.map((member) => memberToRow(member, displayGroupId.value))
  }

  const members = await getGroupMembers(routeParamId, majorId)
  if (members.length) {
    return members.map((member) => memberToRow(member, displayGroupId.value))
  }

  return getRecordsByGroup(routeParamId, majorId)
}

onMounted(async () => {
  try {
    const validationError = validateGroupId(routeParamId)
    if (validationError) {
      errorMsg.value = validationError
      return
    }

    students.value = await loadGroupMembers()
  } catch (err: any) {
    if (err.message?.includes('401')) {
      errorMsg.value = 'Session expired. Please login again.'
    } else if (err.message?.includes('403')) {
      errorMsg.value = 'Authorization warning: You do not have permission to view this group.'
    } else {
      errorMsg.value = err.message || 'Failed to load group members.'
    }
  } finally {
    isLoading.value = false
  }
})

function viewRecord(studentId: string) {
  router.push(`/student-record/${encodeURIComponent(studentId)}`)
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/search-mentor')
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.desc {
  color: #6b7280;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 22px;
}

th,
td {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

th {
  background: #f3f4f6;
}

.empty {
  margin-top: 18px;
  color: #6b7280;
}

.error {
  margin-top: 14px;
  color: #dc2626;
}

.loading {
  color: #6b7280;
  padding: 40px;
  text-align: center;
}

.link-button {
  background: transparent;
  color: #2563eb;
  padding: 0;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.link-button:hover {
  text-decoration: underline;
}

.secondary {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
}
</style>
