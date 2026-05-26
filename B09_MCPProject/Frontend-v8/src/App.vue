<template>
  <router-view v-if="isLoginPage" />

  <div v-else class="layout">
    <aside class="sidebar">
      <h2>MCS</h2>
      <p class="system-name">Mentor Caring System</p>

      <nav class="nav">
        <router-link to="/main">Home</router-link>

        <!-- ============ Mentor ============ -->
        <template v-if="role === 'mentor'">
          <p class="nav-group">Mentor</p>
          <router-link to="/search-student">Search Student Info</router-link>
          <router-link to="/mentor/export-records">Export Records</router-link>
          <router-link to="/mentor/forward-case">Forward Cases</router-link>
          <router-link to="/communication">Communicate</router-link>
          <router-link to="/mentor/interview-arrangement">Interview Arrangement</router-link>
          <router-link to="/feedback">Give Feedback</router-link>
        </template>

        <!-- ============ Student ============ -->
        <template v-if="role === 'student'">
          <p class="nav-group">Student</p>
          <router-link to="/student/check-mentor">Check Mentor Info</router-link>
          <router-link to="/student/communication">Communication</router-link>
          <router-link to="/feedback">Give Feedback</router-link>
        </template>

        <!-- ============ Coordinator ============ -->
        <template v-if="role === 'coordinator'">
          <p class="nav-group">MCP Coordinator</p>
          <router-link to="/coordinator/forward-case">Forward Cases</router-link>
          <router-link to="/search-mentor">Search Mentor Info</router-link>
          <router-link to="/search-student">Search Student Info</router-link>
          <router-link to="/communication">Communicate</router-link>
          <router-link to="/feedback">Give Feedback</router-link>
        </template>

        <!-- ============ Faculty Consultant ============ -->
        <template v-if="role === 'consultant'">
          <p class="nav-group">Faculty Consultant</p>
          <router-link to="/search-student">Search Students Info</router-link>
          <router-link to="/search-mentor">Search Mentors Info</router-link>
          <router-link to="/consultant/import">Import Students' Name Lists</router-link>
          <router-link to="/consultant/change-mentors">Change Mentors</router-link>
          <router-link to="/consultant/update-group">Update Mentor Group</router-link>
          <router-link to="/consultant/designate-coordinators">Designate Coordinators</router-link>
          <router-link to="/consultant/departments">Department Management</router-link>
          <router-link to="/consultant/groups">Group Management</router-link>
          <router-link to="/consultant/export-records">Export Records</router-link>
          <router-link to="/consultant/search-log">View Student Log Info</router-link>
          <router-link to="/communication">Communicate</router-link>
          <router-link to="/feedback">Give Feedback</router-link>
        </template>

        <!-- ============ Administrator ============ -->
        <template v-if="role === 'admin'">
          <p class="nav-group">Administrator</p>
          <router-link to="/admin/consultants">Faculty Consultant Management</router-link>
          <router-link to="/admin/organization">Organization Management</router-link>
          <router-link to="/admin/supporting-staff">Supporting Staff Management</router-link>
          <router-link to="/feedback">Give Feedback</router-link>
        </template>

        <!-- ============ Supporting Staff ============ -->
        <template v-if="role === 'support'">
          <p class="nav-group">Supporting Staff</p>
          <router-link to="/support/search-log">View Log Info</router-link>
          <router-link to="/support/reply-feedback">View Users' Feedback</router-link>
        </template>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <span>Welcome: <strong>{{ username }}</strong> ({{ roleLabel }})</span>
        <button @click="logout">Logout</button>
      </header>

      <section class="page">
        <router-view />
      </section>
    </main>
  </div>

  <!--
    Dev-only floating panel.
    Visible in both login page and inside the app, but only when running
    `npm run dev` (i.e. `import.meta.env.DEV === true`).
    Strip out automatically in production build.
  -->
  <DevFloatingPanel />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Role } from './types'
import { getRoleLabel } from './types'
import DevFloatingPanel from './devtools/DevFloatingPanel.vue'

const route = useRoute()
const router = useRouter()

const currentRole = ref<Role>((localStorage.getItem('role') as Role) || 'student')
const username = ref<string>(localStorage.getItem('username') || 'User')

const isLoginPage = computed(() => route.path === '/login')

watch(
  () => route.fullPath,
  () => {
    currentRole.value = (localStorage.getItem('role') as Role) || 'student'
    username.value = localStorage.getItem('username') || 'User'
  },
  { immediate: true },
)

const role = computed(() => currentRole.value)
const roleLabel = computed(() => getRoleLabel(currentRole.value))

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('userInfo')
  localStorage.removeItem('username')
  currentRole.value = 'student'
  router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fb;
}

.sidebar {
  width: 260px;
  padding: 24px 18px;
  background: #1f2937;
  color: white;
  overflow-y: auto;
}

.sidebar h2 {
  margin: 0;
  font-size: 28px;
}

.system-name {
  margin-top: 6px;
  margin-bottom: 20px;
  color: #cbd5e1;
  font-size: 14px;
}

.nav {
  display: flex;
  flex-direction: column;
}

.nav-group {
  margin: 18px 0 8px 0;
  color: #9ca3af;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.sidebar a {
  display: block;
  padding: 9px 12px;
  margin-bottom: 4px;
  color: #e5e7eb;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.15s;
}

.sidebar a:hover {
  background: #374151;
}

.sidebar a.router-link-active {
  background: #2563eb;
  color: white;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 64px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar button {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.topbar button:hover {
  background: #dc2626;
}

.page {
  padding: 24px;
  flex: 1;
}
</style>
