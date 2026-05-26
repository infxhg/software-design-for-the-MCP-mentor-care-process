<!--
  Floating dev panel — visible only in DEV mode.

  作用：
  在每个已登录页面右下角加一个 🛠 浮动按钮，
  点开后可以：
    - 一键切换当前角色（保留同一会话，路由会自动重定向到 /main）
    - 跳转到任意 path
    - 看当前 role / username / 路由信息
    - 清掉 fake login（相当于"登出"）

  Mount 方式：见 App.vue 末尾的 <DevFloatingPanel />。
-->
<template>
  <div v-if="isDev" class="dev-floating">
    <button
        class="trigger"
        :class="{ open: isOpen }"
        @click="isOpen = !isOpen"
        title="Dev tools"
    >🛠</button>

    <div v-if="isOpen" class="panel">
      <h4>🛠 Dev Tools</h4>

      <div class="info">
        <p><strong>Path:</strong> <code>{{ $route.path }}</code></p>
        <p><strong>Role:</strong> {{ currentRole }}</p>
        <p><strong>User:</strong> {{ currentUser }}</p>
        <p><strong>Fake login:</strong> {{ isFake ? '✅' : '❌' }}</p>
      </div>

      <h5>Switch role</h5>
      <div class="role-grid">
        <button
            v-for="r in DEV_ROLES"
            :key="r.role"
            class="mini-btn"
            :class="r.role"
            @click="switchRole(r.role)"
        >
          {{ r.label }}
        </button>
      </div>

      <h5>Quick jumps</h5>
      <div class="links">
        <a v-for="link in quickLinks" :key="link.path" @click.prevent="goTo(link)">
          {{ link.label }}
          <span class="role-badge">{{ link.role }}</span>
        </a>
      </div>

      <h5>Free jump</h5>
      <div class="jump-row">
        <input v-model="jumpPath" placeholder="/admin/consultants" />
        <button @click="freeJump">Go</button>
      </div>

      <div class="footer">
        <button class="danger-mini" @click="clearAndGoLogin">
          Clear & back to login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Role } from '../types'
import { DEV_ROLES, devLoginAs, devLogout, isDevFakeLogin } from './devAuth'

const router = useRouter()
const route = useRoute()

const isDev = import.meta.env.DEV
const isOpen = ref(false)
const jumpPath = ref('/main')

const currentRole = computed(() => localStorage.getItem('role') || '(none)')
const currentUser = computed(() => localStorage.getItem('username') || '(none)')
const isFake = computed(() => isDevFakeLogin())

interface QuickLink { label: string; path: string; role: Role }

/**
 * 把所有典型页面集中起来，方便一键跳转 + 自动切到该页面需要的角色。
 * 这些就是 UI Diagram / 流程转移图里的每个分支页面。
 */
const quickLinks: QuickLink[] = [
  // Mentor
  { label: 'Mentor Home',           path: '/main',                              role: 'mentor'      },
  { label: 'Search Student',        path: '/search-student',                    role: 'mentor'      },
  { label: 'Edit Record',           path: '/edit-record/123456789',             role: 'mentor'      },
  { label: 'Forward Case',          path: '/mentor/forward-case',               role: 'mentor'      },
  { label: 'Export Records',        path: '/mentor/export-records',             role: 'mentor'      },
  { label: 'Interview Arrange 1',   path: '/mentor/interview-arrangement',      role: 'mentor'      },
  { label: 'Interview Arrange 2',   path: '/mentor/interview-arrangement/venue',role: 'mentor'      },
  { label: 'Normal Message',        path: '/communication/normal',              role: 'mentor'      },

  // Student
  { label: 'Student Home',          path: '/main',                              role: 'student'     },
  { label: 'Check Mentor Info',     path: '/student/check-mentor',              role: 'student'     },
  { label: 'Student Comm.',         path: '/student/communication',             role: 'student'     },

  // Coordinator
  { label: 'Coord. Home',           path: '/main',                              role: 'coordinator' },
  { label: 'Coord. Forward Case',   path: '/coordinator/forward-case',          role: 'coordinator' },
  { label: 'Search Mentor',         path: '/search-mentor',                     role: 'coordinator' },

  // Consultant
  { label: 'Consult. Home',         path: '/main',                              role: 'consultant'  },
  { label: 'Import Names',          path: '/consultant/import',                 role: 'consultant'  },
  { label: 'Change Mentors',        path: '/consultant/change-mentors',         role: 'consultant'  },
  { label: 'Update Group',          path: '/consultant/update-group',           role: 'consultant'  },
  { label: 'Designate Coord.',      path: '/consultant/designate-coordinators', role: 'consultant'  },
  { label: 'Department List',       path: '/consultant/departments',            role: 'consultant'  },
  { label: 'Department Detail',     path: '/consultant/departments/DCS',        role: 'consultant'  },
  { label: 'Group List',            path: '/consultant/groups',                 role: 'consultant'  },
  { label: 'Group Detail',          path: '/consultant/groups/B01',             role: 'consultant'  },
  { label: 'Consult. Export',       path: '/consultant/export-records',         role: 'consultant'  },

  // Admin
  { label: 'Admin Home',            path: '/main',                              role: 'admin'       },
  { label: 'Consult. Management',   path: '/admin/consultants',                 role: 'admin'       },
  { label: 'Add Consultant',        path: '/admin/consultants/add',             role: 'admin'       },
  { label: 'Org Management',        path: '/admin/organization',                role: 'admin'       },
  { label: 'Org Manual',            path: '/admin/organization/manual',         role: 'admin'       },
  { label: 'Org Excel',             path: '/admin/organization/excel',          role: 'admin'       },
  { label: 'Support Staff Mgmt',    path: '/admin/supporting-staff',            role: 'admin'       },
  { label: 'Add Support Staff',     path: '/admin/supporting-staff/add',        role: 'admin'       },

  // Support
  { label: 'Support Home',          path: '/main',                              role: 'support'     },
  { label: 'Search Log',            path: '/support/search-log',                role: 'support'     },
  { label: 'Log Detail',            path: '/support/log/123456789',             role: 'support'     },
  { label: 'Reply Feedback',        path: '/support/reply-feedback',            role: 'support'     },

  // Common
  { label: 'Feedback (admin)',      path: '/feedback',                          role: 'admin'       },
]

function switchRole(role: Role) {
  if (devLoginAs(role)) {
    // Vue 通过 watch route 来读 localStorage，所以这里要触发一次跳转/刷新
    router.push('/main').then(() => location.reload())
  }
}

function goTo(link: QuickLink) {
  devLoginAs(link.role)
  // reload 一下 App.vue 才能读到新角色
  router.push(link.path).then(() => location.reload())
}

function freeJump() {
  router.push(jumpPath.value || '/main')
  isOpen.value = false
}

function clearAndGoLogin() {
  devLogout()
  router.push('/login').then(() => location.reload())
}
</script>

<style scoped>
.dev-floating {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  font-family: Arial, sans-serif;
}

.trigger {
  width: 44px; height: 44px;
  background: #f59e0b;
  color: white;
  font-size: 20px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: transform 0.15s;
}

.trigger:hover { transform: scale(1.05); }
.trigger.open { background: #d97706; }

.panel {
  position: absolute;
  right: 0; bottom: 56px;
  width: 340px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px;
  background: white;
  border: 1px solid #f59e0b;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.panel h4 {
  margin: 0 0 10px 0;
  font-size: 15px;
  color: #92400e;
}

.panel h5 {
  margin: 14px 0 6px 0;
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info {
  padding: 8px 10px;
  background: #fef3c7;
  border-radius: 6px;
  font-size: 12px;
}
.info p { margin: 2px 0; }
.info code {
  padding: 1px 5px;
  background: white;
  border-radius: 3px;
  font-family: monospace;
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.mini-btn {
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.mini-btn.student { background: #10b981; }
.mini-btn.mentor { background: #3b82f6; }
.mini-btn.coordinator { background: #8b5cf6; }
.mini-btn.consultant { background: #f59e0b; }
.mini-btn.admin { background: #ef4444; }
.mini-btn.support { background: #6b7280; }

.links {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  background: #f9fafb;
  border-radius: 6px;
}

.links a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  font-size: 12px;
  color: #1f2937;
  cursor: pointer;
  border-radius: 3px;
}

.links a:hover { background: white; color: #2563eb; }

.role-badge {
  font-size: 10px;
  padding: 1px 6px;
  background: #e5e7eb;
  border-radius: 3px;
  color: #6b7280;
}

.jump-row { display: flex; gap: 4px; }
.jump-row input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
}
.jump-row button {
  padding: 5px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.footer { margin-top: 12px; }
.danger-mini {
  width: 100%;
  padding: 6px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
</style>
