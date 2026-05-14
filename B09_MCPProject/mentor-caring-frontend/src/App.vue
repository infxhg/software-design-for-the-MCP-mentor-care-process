<template>
  <router-view v-if="isLoginPage" />

  <div v-else class="layout">
    <aside class="sidebar">
      <h2>MCS</h2>
      <p class="role">Mentor Caring System</p>

      <router-link to="/main">Home</router-link>
      <router-link to="/messages">Messages</router-link>
      <router-link to="/appointments">Appointments</router-link>
      <router-link to="/records">Interview Records</router-link>
      <router-link to="/import">Import Data</router-link>
      <router-link to="/export">Export Records</router-link>
      <router-link to="/logs">Activity Logs</router-link>
    </aside>

    <main class="main">
      <header class="topbar">
        <span>Mentor Caring System</span>
        <button @click="logout">Logout</button>
      </header>

      <section class="page">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isLoginPage = computed(() => route.path === '/login')

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
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
  width: 240px;
  padding: 24px;
  background: #1f2937;
  color: white;
}

.sidebar h2 {
  margin-bottom: 4px;
}

.role {
  margin-bottom: 24px;
  color: #cbd5e1;
  font-size: 14px;
}

.sidebar a {
  display: block;
  padding: 10px 12px;
  margin-bottom: 8px;
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
  border: none;
  background: #ef4444;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}

.page {
  padding: 24px;
}
</style>
