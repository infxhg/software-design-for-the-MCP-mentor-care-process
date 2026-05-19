<template>
  <div>
    <h1>Welcome, {{ username }}</h1>
    <p class="desc">Role: <strong>{{ roleLabel }}</strong></p>

    <div v-if="visibleCards.length > 0" class="cards">
      <router-link
          v-for="card in visibleCards"
          :key="card.title"
          :to="card.path"
          class="card"
      >
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
        <span class="link-text">{{ card.linkText }} →</span>
      </router-link>
    </div>

    <div v-else class="no-function">
      <h2>No available module</h2>
      <p>Your current role does not have access to any module.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Role } from '../types'
import { getRoleLabel } from '../types'

const role = (localStorage.getItem('role') as Role) || 'student'
const username = localStorage.getItem('username') || 'User'
const roleLabel = getRoleLabel(role)

interface DashboardCard {
  title: string
  description: string
  path: string
  linkText: string
  roles: Role[]
}

/**
 * Cards rendered on the dashboard.
 *
 * Each card is gated by the user's role. The cards correspond 1:1 to the
 * home-page entries in the UI Diagram for each role (1A–1F).
 */
const cards: DashboardCard[] = [
  // -------------------- Mentor (1A) --------------------
  { title: 'Search Student Info', description: 'Look up a student in your mentoring groups.', path: '/search-student', linkText: 'Open', roles: ['mentor', 'coordinator', 'consultant'] },
  { title: 'Export Records', description: 'Export interview records of your group as a Word file.', path: '/mentor/export-records', linkText: 'Open', roles: ['mentor'] },
  { title: 'Forward Cases', description: 'Forward a student case to the MCP Coordinator.', path: '/mentor/forward-case', linkText: 'Open', roles: ['mentor'] },
  { title: 'Interview Arrangement', description: 'Mark available time slots and arrange interviews.', path: '/mentor/interview-arrangement', linkText: 'Open', roles: ['mentor'] },
  { title: 'Communicate', description: 'Send messages or arrange interviews.', path: '/communication', linkText: 'Open', roles: ['mentor', 'coordinator', 'consultant'] },

  // -------------------- Student (1B) --------------------
  { title: 'Check Mentor Info', description: 'View your assigned mentor and contact information.', path: '/student/check-mentor', linkText: 'Open', roles: ['student'] },
  { title: 'Communication', description: 'Send messages or respond to interview invitations.', path: '/student/communication', linkText: 'Open', roles: ['student'] },

  // -------------------- Coordinator (1D) --------------------
  { title: 'Forward Cases', description: 'Forward received cases to the Faculty Consultant.', path: '/coordinator/forward-case', linkText: 'Open', roles: ['coordinator'] },
  { title: 'Search Mentor Info', description: 'Look up mentors in your department.', path: '/search-mentor', linkText: 'Open', roles: ['coordinator', 'consultant'] },

  // -------------------- Faculty Consultant (1C) --------------------
  { title: 'Import Students\' Name Lists', description: 'Upload a yearly student-mentor allocation Excel file.', path: '/consultant/import', linkText: 'Open', roles: ['consultant'] },
  { title: 'Change Mentors', description: 'Change the mentor assigned to a group.', path: '/consultant/change-mentors', linkText: 'Open', roles: ['consultant'] },
  { title: 'Update Mentor Group', description: 'Add or remove students from a mentoring group.', path: '/consultant/update-group', linkText: 'Open', roles: ['consultant'] },
  { title: 'Designate Coordinators', description: 'Assign MCP coordinators to departments.', path: '/consultant/designate-coordinators', linkText: 'Open', roles: ['consultant'] },
  { title: 'Department Management', description: 'Browse departments and manage their coordinators.', path: '/consultant/departments', linkText: 'Open', roles: ['consultant'] },
  { title: 'Group Management', description: 'Browse mentoring groups and manage members.', path: '/consultant/groups', linkText: 'Open', roles: ['consultant'] },
  { title: 'Export Records', description: 'Export interview records by academic year / department / mentor / student.', path: '/consultant/export-records', linkText: 'Open', roles: ['consultant'] },

  // -------------------- Administrator (1E) --------------------
  { title: 'Faculty Consultant Management', description: 'Add, change, or delete faculty consultants.', path: '/admin/consultants', linkText: 'Open', roles: ['admin'] },
  { title: 'Organization Management', description: 'Manage faculties, departments, and majors.', path: '/admin/organization', linkText: 'Open', roles: ['admin'] },
  { title: 'Supporting Staff Management', description: 'Manage supporting staff and their rights.', path: '/admin/supporting-staff', linkText: 'Open', roles: ['admin'] },

  // -------------------- Supporting Staff (1F) --------------------
  { title: 'View Log Info', description: 'Search and view user activity / interaction logs.', path: '/support/search-log', linkText: 'Open', roles: ['support'] },
  { title: 'Reply Users\' Questions', description: 'Respond to feedback submitted by users.', path: '/support/reply-feedback', linkText: 'Open', roles: ['support'] },

  // -------------------- Shared --------------------
  { title: 'Give Feedback', description: 'Send feedback to the system administrator.', path: '/feedback', linkText: 'Open', roles: ['mentor', 'student', 'coordinator', 'consultant', 'admin'] },
]

const visibleCards = computed(() => cards.filter((c) => c.roles.includes(role)))
</script>

<style scoped>
.desc {
  color: #6b7280;
  margin-bottom: 24px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
  margin-top: 16px;
}

.card {
  padding: 22px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  display: block;
}

.card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #111827;
}

.card p {
  color: #6b7280;
  margin: 8px 0 14px 0;
  font-size: 14px;
}

.link-text {
  display: inline-block;
  color: #2563eb;
  font-weight: 600;
  font-size: 14px;
}

.no-function {
  margin-top: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
.no-function p { color: #6b7280; }
</style>
