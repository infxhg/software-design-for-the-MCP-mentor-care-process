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

    <template v-else>
      <div v-if="groupCard" class="info-card">
        <h2>Group</h2>
        <div class="info-row">
          <span class="label">Group Label:</span>
          <span>{{ groupCard.groupLabel || groupCard.name || groupCard.groupId || '-' }}</span>
        </div>
        <div v-if="groupCard.facultyOrgId" class="info-row">
          <span class="label">Faculty Org:</span>
          <span>{{ groupCard.facultyOrgId }}</span>
        </div>
        <div class="info-row">
          <span class="label">Student Count:</span>
          <span>{{ studentCount }}</span>
        </div>
      </div>

      <div v-if="mentorCard" class="info-card">
        <h2>Assigned Mentor</h2>
        <div class="info-row">
          <span class="label">Mentor ID:</span>
          <span>{{ mentorCard.mentorId || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Name:</span>
          <span>{{ mentorCard.mentorName || '-' }}</span>
        </div>
        <div v-if="mentorCard.email" class="info-row">
          <span class="label">Email:</span>
          <span>{{ mentorCard.email }}</span>
        </div>
        <div v-if="mentorCard.office" class="info-row">
          <span class="label">Office:</span>
          <span>{{ mentorCard.office }}</span>
        </div>
        <div v-if="mentorCard.departmentName" class="info-row">
          <span class="label">Department:</span>
          <span>{{ mentorCard.departmentName }}</span>
        </div>
      </div>

      <div v-if="students.length > 0">
        <h2 v-if="groupCard">Student Members</h2>

        <table>
          <thead>
          <tr>
            <th>Student ID</th>
            <template v-if="viewMode === 'records'">
              <th>Major</th>
              <th>Status</th>
              <th>Group ID</th>
              <th>Records</th>
            </template>
            <th>Operation</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="s in students" :key="String(s.studentId)">
            <td>{{ s.studentId }}</td>
            <template v-if="viewMode === 'records'">
              <td>{{ s.majorId || 'N/A' }}</td>
              <td>{{ s.status || 'N/A' }}</td>
              <td>{{ s.groupId || displayGroupId }}</td>
              <td>{{ s.interviewRecords?.length || 0 }} records</td>
            </template>

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
    </template>
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
import { getGroupByKey, type GroupByKeyGroup, type MentorInfo } from '../api/org'

const route = useRoute()
const router = useRouter()

const routeParamId = String(route.params.groupId || '').trim()
const queryGid = String(route.query.gid || '').trim()
const majorId = String(route.query.majorId || '').trim() || undefined

function looksLikeGroupKey(value: string): boolean {
  return /^[A-Za-z0-9]{20,}$/.test(value)
}

const viewMode = ref<'records' | 'byKey'>(looksLikeGroupKey(routeParamId) ? 'byKey' : 'records')

const students = ref<StudentGroupRecord[]>([])
const groupCard = ref<GroupByKeyGroup | null>(null)
const mentorCard = ref<MentorInfo | null>(null)
const studentCount = ref(0)

const isLoading = ref(true)
const errorMsg = ref('')

const displayGroupId = computed(() => {
  if (groupCard.value) {
    const fromServer =
      groupCard.value.groupLabel || groupCard.value.name || groupCard.value.groupId
    if (fromServer && String(fromServer).trim()) {
      return String(fromServer).trim()
    }
  }
  return String(route.query.gid || '').trim() || routeParamId
})

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

async function loadGroupMembersByRecords(groupLabel: string): Promise<StudentGroupRecord[]> {
  const data = await searchGroup(routeParamId, majorId)

  if (data.members?.length) {
    return data.members.map((member) => memberToRow(member, groupLabel))
  }

  const members = await getGroupMembers(routeParamId, majorId)
  if (members.length) {
    return members.map((member) => memberToRow(member, groupLabel))
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

    if (viewMode.value === 'byKey') {
      const data = await getGroupByKey(routeParamId)
      groupCard.value = data.group || null
      mentorCard.value = data.mentor || null
      studentCount.value = data.studentCount
      students.value = data.studentMemberIds.map(
        (sid) => ({ studentId: sid } as StudentGroupRecord),
      )
    } else {
      students.value = await loadGroupMembersByRecords(displayGroupId.value)
    }
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

.info-card {
  margin-top: 18px;
  padding: 14px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.info-card h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #111827;
}

.info-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  padding: 4px 0;
}

.info-row .label {
  color: #6b7280;
  font-weight: 600;
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
