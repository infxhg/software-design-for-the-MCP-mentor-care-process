<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Mentor Caring System</h1>
      <p>Please login to continue</p>

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
            <option value="coordinator">Coordinator</option>
            <option value="consultant">Faculty Consultant</option>
            <option value="admin">Administrator</option>
            <option value="support">Supporting Staff</option>
          </select>
        </div>

        <button type="submit">Login</button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const account = ref('')
const password = ref('')
const role = ref('student')
const errorMessage = ref('')

function login() {
  if (!account.value || !password.value) {
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
  width: 380px;
  padding: 32px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 8px;
}

p {
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
}

button {
  width: 100%;
  margin-top: 20px;
  padding: 10px;
  border: none;
  background: #2563eb;
  color: white;
  cursor: pointer;
  border-radius: 6px;
}

.error {
  margin-top: 12px;
  color: #dc2626;
}
</style>
