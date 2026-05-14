<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Mentor Caring System</h1>
      <p class="subtitle">Please login to continue</p>

      <form @submit.prevent="login">
        <div class="form-item">
          <label>Account</label>
          <input v-model="account" type="text" placeholder="Enter account" />
        </div>

        <div class="form-item">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="Enter password" />
        </div>

        <div class="form-item">
          <label>Role</label>
          <select v-model="role">
            <option value="student">Student</option>
            <option value="mentor">Mentor</option>
            <option value="coordinator">MCP Coordinator</option>
            <option value="consultant">Faculty Consultant</option>
            <option value="admin">Administrator</option>
            <option value="support">Supporting Staff</option>
          </select>
        </div>

        <button type="submit">Login</button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>

      <div class="hint">
        <p>Suggested test roles:</p>
        <p>Mentor: search S001</p>
        <p>Coordinator: search S001</p>
        <p>Consultant: search mentor info</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Role } from '../data/mockData'

const router = useRouter()

const account = ref('')
const password = ref('')
const role = ref<Role>('mentor')
const errorMessage = ref('')

function login() {
  if (!account.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Please enter account and password.'
    return
  }

  localStorage.setItem('token', 'mock-token')
  localStorage.setItem('role', role.value)

  router.push('/main')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
}

.login-card {
  width: 400px;
  padding: 32px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
}

h1 {
  margin: 0;
  font-size: 26px;
}

.subtitle {
  margin-top: 8px;
  color: #6b7280;
}

.form-item {
  margin-top: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

input,
select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

button {
  width: 100%;
  margin-top: 22px;
  padding: 11px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.error {
  margin-top: 12px;
  color: #dc2626;
}

.hint {
  margin-top: 20px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
  color: #4b5563;
  font-size: 13px;
}
</style>
