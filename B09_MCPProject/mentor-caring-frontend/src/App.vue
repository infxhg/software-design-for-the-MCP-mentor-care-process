<template>
  <router-view v-if="isLoginPage" />

  <div v-else class="layout">
    <aside class="sidebar">
      <h2>MCS</h2>
      <p class="system-name">Mentor Caring System</p>

      <router-link to="/main">Home</router-link>
      <router-link to="/search-student">Search Student Info</router-link>
      <router-link to="/search-mentor">Search Mentor Info</router-link>
    </aside>

    <main class="main">
      <header class="topbar">
        <!-- 修改部分：这里显示 roleLabel，不直接显示 localStorage 里的值 -->
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

const route = useRoute()
const router = useRouter()

// 修改部分：用 ref 保存当前角色，不再只读取一次 localStorage
const currentRole = ref(localStorage.getItem('role') || 'student')

const isLoginPage = computed(() => {
  return route.path === '/login'
})

// 修改部分：每次路由变化都重新读取 localStorage
// 这样登录后从 /login 跳到 /main 时，Current Role 会自动更新
watch(
  () => route.fullPath,
  () => {
    currentRole.value = localStorage.getItem('role') || 'student'
  },
  { immediate: true },
)

// 修改部分：把 consultant 显示成 Faculty Consultant
const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    student: 'Student',
    mentor: 'Mentor',
    coordinator: 'MCP Coordinator',
    consultant: 'Faculty Consultant',
    admin: 'Administrator',
    support: 'Supporting Staff',
  }

  return roleMap[currentRole.value] || currentRole.value
})

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')

  // 修改部分：退出时同步清空当前显示角色
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
