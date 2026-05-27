<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Mentor Caring System</h1>
      <p class="subtitle">Please login to continue</p>

      <form @submit.prevent="login">
        <div class="form-item">
          <label>Account (username or email)</label>
          <input v-model="account" type="text" placeholder="Enter account" />
        </div>

        <div class="form-item">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="Enter password" />
        </div>

        <!--
          修改点 (v6 task 1)：
          删除原本的 "Fallback Role" 下拉。
          原本设计是 getUserInfo 失败时让用户手选一个角色继续，
          但这相当于客户端层让用户自由切换角色 (admin/consultant/...),
          虽然后端 JWT 仍会拦截敏感操作，但 UI 会显示错误的菜单，
          体验差且容易误导。

          新行为：getUserInfo 失败 → 直接 fail 整个登录流程，
          清掉 token，提示用户重试。
        -->

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-if="successInfo" class="success">{{ successInfo }}</p>
      </form>

      <div class="hint">
        <p>Use your BNBU account to login.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, getUserInfoApi, mapBackendRole } from '../api/user'

const router = useRouter()

const account = ref('')
const password = ref('')
const errorMessage = ref('')
const successInfo = ref('')
const isLoading = ref(false)

async function login() {
  errorMessage.value = ''
  successInfo.value = ''

  if (!account.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Please enter account and password.'
    return
  }

  isLoading.value = true

  try {
    // Step 1: Login to get JWT token
    const token = await loginApi(account.value.trim(), password.value.trim())
    localStorage.setItem('token', token)
    localStorage.setItem('username', account.value.trim())

    successInfo.value = 'Login successful! Loading user info...'

    /**
     * 修改点 (v6 task 1)：
     * 之前 getUserInfo 失败会用 fallbackRole 兜底进入系统。
     * 现在失败直接 fail：清掉 token / username，
     * 让用户重新登录而不是带着错误状态进入系统。
     */
    let userInfo
    try {
      userInfo = await getUserInfoApi(account.value.trim())
    } catch (infoErr: any) {
      // 清理已经写进去的 token，让用户回到干净的未登录状态
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      throw new Error(
          'Login succeeded but user info could not be loaded. '
          + 'Please try again. ('
          + (infoErr?.message || 'unknown error')
          + ')',
      )
    }

    const frontendRole = mapBackendRole(userInfo.roles || [])
    localStorage.setItem('role', frontendRole)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    // Step 3: Navigate to main page
    router.push('/main')
  } catch (err: any) {
    errorMessage.value = err.message || 'Login failed. Check server connection.'
    successInfo.value = ''
  } finally {
    isLoading.value = false
  }
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
  width: 440px;
  padding: 32px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
}

h1 { margin: 0; font-size: 26px; }
.subtitle { margin-top: 8px; color: #6b7280; }

.form-item { margin-top: 16px; }

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 14px;
}

input[type="text"],
input[type="password"],
select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

button[type="submit"] {
  width: 100%;
  margin-top: 22px;
  padding: 11px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
}

button:disabled { background: #93c5fd; cursor: wait; }
.error { margin-top: 12px; color: #dc2626; font-size: 14px; }
.success { margin-top: 12px; color: #059669; font-size: 14px; }

.hint {
  margin-top: 16px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
  color: #4b5563;
  font-size: 13px;
}
.hint p { margin: 4px 0; }
</style>
