/**
 * Dev-only fake authentication helper.
 *
 * 用途：
 * 在不连后端、不走真实登录流程的情况下，
 * 直接以某个角色"进入"系统，方便离线 UI / 跳转测试。
 *
 * 原理：
 * - 写入一个 fake token（router.beforeEach 只检查 token 是否存在）
 * - 写入 role / username，沿用现有 App.vue / MainView.vue 的角色判断
 *
 * 自动剥离：
 * 所有调用点都用 import.meta.env.DEV 包裹，
 * 生产 build (npm run build) 时被 tree-shake 掉。
 *
 * ⚠️ 不要在 production 调用这个文件里的任何函数。
 */

import type { Role } from '../types'

export const DEV_ROLES: Array<{ role: Role; label: string; sampleUsername: string }> = [
  { role: 'student',    label: 'Student',            sampleUsername: 'dev-student'     },
  { role: 'mentor',     label: 'Mentor',             sampleUsername: 'dev-mentor'      },
  { role: 'coordinator',label: 'MCP Coordinator',    sampleUsername: 'dev-coordinator' },
  { role: 'consultant', label: 'Faculty Consultant', sampleUsername: 'dev-consultant'  },
  { role: 'admin',      label: 'Administrator',      sampleUsername: 'dev-admin'       },
  { role: 'support',    label: 'Supporting Staff',   sampleUsername: 'dev-support'     },
]

/**
 * Fake-login as a given role.
 * Writes a dummy token + role + username to localStorage,
 * then navigates the app to /main.
 *
 * Returns true on success, false if called in non-dev mode.
 */
export function devLoginAs(role: Role, username?: string): boolean {
  if (!import.meta.env.DEV) {
    console.warn('[devtools] devLoginAs is disabled in production build.')
    return false
  }

  const fakeToken = `DEV_FAKE_TOKEN.${role}.${Date.now()}`
  const fakeName = username
    || DEV_ROLES.find((r) => r.role === role)?.sampleUsername
    || `dev-${role}`

  localStorage.setItem('token', fakeToken)
  localStorage.setItem('role', role)
  localStorage.setItem('username', fakeName)
  localStorage.setItem(
    'userInfo',
    JSON.stringify({
      user: { id: 'dev-id', username: fakeName, realName: fakeName, email: '', status: 1 },
      roles: [role.toUpperCase()],
      permissions: [],
      orgUnits: [],
    }),
  )

  return true
}

/** Clear any dev-login state. Equivalent to logging out. */
export function devLogout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('username')
  localStorage.removeItem('userInfo')
}

/** True if the current localStorage token looks like a dev-fake one. */
export function isDevFakeLogin(): boolean {
  const t = localStorage.getItem('token') || ''
  return t.startsWith('DEV_FAKE_TOKEN.')
}
