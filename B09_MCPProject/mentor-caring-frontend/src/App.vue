<template>
  <router-view v-if="isLoginPage" />

  <div v-else class="layout">
    <aside class="sidebar">
      <h2>MCS</h2>
      <p class="system-name">Mentor Caring System</p>

      <router-link to="/main">Home</router-link>

      <router-link v-if="canShow(['mentor', 'coordinator'])" to="/search-student">
        Search Student Info
      </router-link>

      <router-link v-if="canShow(['consultant', 'coordinator'])" to="/search-mentor">
        Search Mentor Info
      </router-link>
    </aside>

    <main class="main">
      <header class="topbar">
        <span>Current Role: {{ roleLabel }}</span>
        <button @click="logout">Logout</button>
      </header>

      <section class="page">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Role } from './data/mockData'
import { getRoleLabel } from './data/mockData'

const route = useRoute()
const router = useRouter()

const currentRole = ref<Role>((localStorage.getItem('role') as Role) || 'student')

const isLoginPage = computed(() => {
  return route.path === '/login'
})

watch(
  () => route.fullPath,
  () => {
    currentRole.value = ((localStorage.getItem('role') as Role) || 'student')
  },
  { immediate: true },
)

const roleLabel = computed(() => {
  return getRoleLabel(currentRole.value)
})

function canShow(roles: Role[]) {
  return roles.includes(currentRole.value)
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
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
  padding: 24px;
  background: #1f2937;
  color: white;
}

.sidebar h2 {
  margin: 0;
  font-size: 28px;
}

.system-name {
  margin-top: 6px;
  margin-bottom: 28px;
  color: #cbd5e1;
  font-size: 14px;
}

.sidebar a {
  display: block;
  padding: 12px;
  margin-bottom: 10px;
  color: white;
  text-decoration: none;
  border-radius: 8px;
}

.sidebar a.router-link-active {
  background: #2563eb;
}

.main {
  flex: 1;
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

.page {
  padding: 24px;
}
</style>
