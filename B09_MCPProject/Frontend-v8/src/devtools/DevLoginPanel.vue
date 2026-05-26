<!--
  Dev-only fake-login panel.
  Renders only in `import.meta.env.DEV === true` (i.e. `npm run dev`).
  Mount it once inside LoginView.vue.

  作用：
  在登录页底部加一个"开发者快捷登录"卡片，
  点角色按钮 → 直接以那个角色进入 /main，
  不调任何后端接口，方便离线 UI 测试。
-->
<template>
  <div v-if="isDev" class="dev-panel">
    <h3>🛠️ Dev Login (offline UI test)</h3>
    <p class="hint">
      This panel is visible only in development mode. Pick any role below to
      enter the system without calling the backend.
    </p>

    <div class="roles">
      <button
          v-for="r in DEV_ROLES"
          :key="r.role"
          class="role-btn"
          :class="r.role"
          @click="enterAs(r.role)"
      >
        {{ r.label }}
      </button>
    </div>

    <details class="advanced">
      <summary>Direct page jump (skip login & go to any view)</summary>
      <div class="jump-row">
        <input v-model="jumpPath" placeholder="e.g. /admin/consultants" />
        <select v-model="jumpRole">
          <option v-for="r in DEV_ROLES" :key="r.role" :value="r.role">
            {{ r.label }}
          </option>
        </select>
        <button @click="jump">Go</button>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Role } from '../types'
import { DEV_ROLES, devLoginAs } from './devAuth'

const router = useRouter()
const isDev = import.meta.env.DEV

const jumpPath = ref('/main')
const jumpRole = ref<Role>('admin')

function enterAs(role: Role) {
  if (devLoginAs(role)) {
    router.push('/main')
  }
}

function jump() {
  if (devLoginAs(jumpRole.value)) {
    router.push(jumpPath.value || '/main')
  }
}
</script>

<style scoped>
.dev-panel {
  margin-top: 18px;
  padding: 16px;
  background: #fffbeb;
  border: 1px dashed #f59e0b;
  border-radius: 10px;
}

.dev-panel h3 {
  margin: 0 0 6px 0;
  font-size: 15px;
  color: #92400e;
}

.hint {
  margin: 0 0 12px 0;
  color: #92400e;
  font-size: 12px;
  line-height: 1.5;
}

.roles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.role-btn {
  padding: 8px 10px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.role-btn.student { background: #10b981; }
.role-btn.mentor { background: #3b82f6; }
.role-btn.coordinator { background: #8b5cf6; }
.role-btn.consultant { background: #f59e0b; }
.role-btn.admin { background: #ef4444; }
.role-btn.support { background: #6b7280; }

.role-btn:hover { opacity: 0.9; }

.advanced {
  margin-top: 12px;
  font-size: 12px;
}

.advanced summary {
  cursor: pointer;
  color: #92400e;
}

.jump-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.jump-row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  font-size: 12px;
}

.jump-row select {
  padding: 6px 8px;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  font-size: 12px;
}

.jump-row button {
  padding: 6px 12px;
  background: #92400e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
</style>
