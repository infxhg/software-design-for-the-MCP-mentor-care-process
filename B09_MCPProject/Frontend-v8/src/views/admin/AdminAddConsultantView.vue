<template>
  <section class="page">
    <h1>{{ isEdit ? 'Edit Faculty Consultant' : 'Add Faculty Consultant' }}</h1>

    <p v-if="error" class="error">{{ error }}</p>

    <form class="form" @submit.prevent="submit">
      <label>
        Username
        <input v-model.trim="form.username" :disabled="saving" required />
      </label>

      <label>
        Password
        <input
          v-model.trim="form.password"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : 'At least 6 characters'"
          :required="!isEdit"
          type="password"
          :disabled="saving"
        />
      </label>

      <label>
        Real Name
        <input v-model.trim="form.realName" :disabled="saving" required />
      </label>

      <label>
        Email
        <input v-model.trim="form.email" type="email" :disabled="saving" required />
      </label>

      <label>
        Phone
        <input v-model.trim="form.phone" :disabled="saving" />
      </label>

      <label>
        Status
        <select v-model.number="form.status" :disabled="saving">
          <option :value="1">Active</option>
          <option :value="0">Disabled</option>
        </select>
      </label>

      <div class="actions">
        <button type="button" :disabled="saving" @click="router.back()">Back</button>
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addConsultant, getConsultant, updateConsultant } from '../../api/admin'

const route = useRoute()
const router = useRouter()

const consultantId = computed(() => String(route.params.consultantId || route.params.id || '').trim())
const isEdit = computed(() => Boolean(consultantId.value))
const saving = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  password: '',
  realName: '',
  email: '',
  phone: '',
  status: 1,
})

function validate(): string {
  if (!form.username.trim()) return 'Username is required.'
  if (!form.realName.trim()) return 'Real name is required.'
  if (!form.email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.'
  if (!isEdit.value && form.password.trim().length < 6) return 'Password must be at least 6 characters.'
  if (isEdit.value && form.password.trim() && form.password.trim().length < 6) {
    return 'New password must be at least 6 characters.'
  }
  return ''
}

async function load() {
  if (!isEdit.value) return

  try {
    const data = await getConsultant(consultantId.value)
    form.username = data.username || ''
    form.realName = data.realName || data.name || ''
    form.email = data.email || ''
    form.phone = data.phone || ''
    form.status = Number(data.status ?? 1)
  } catch (e: any) {
    error.value = e.message || 'Failed to load consultant.'
  }
}

async function submit() {
  const validation = validate()
  if (validation) {
    error.value = validation
    return
  }

  saving.value = true
  error.value = ''

  try {
    const payload: any = {
      username: form.username.trim(),
      email: form.email.trim(),
      realName: form.realName.trim(),
      phone: form.phone.trim(),
      status: Number(form.status),
    }

    if (form.password.trim()) payload.password = form.password.trim()

    if (isEdit.value) {
      await updateConsultant(consultantId.value, payload)
    } else {
      await addConsultant(payload)
    }

    router.push('/admin/consultants')
  } catch (e: any) {
    error.value = e.message || 'Save failed.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 24px; }
.form { display: grid; gap: 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
label { display: grid; gap: 6px; font-weight: 600; }
input, select { padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
/* 修改点：统一按钮样式 — 旧版把 button 改成白底，导致没加 class 的 "Back" 按钮
   几乎不可见；这里改回填充式：默认浅灰、.primary 蓝、.danger 红，全部带 hover/disabled 态。 */
button {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f1f5f9;
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color .15s ease, opacity .15s ease;
}
button:hover:not(:disabled) { background: #e2e8f0; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
  font-weight: 600;
}
.primary:hover:not(:disabled) { background: #1a5fd0; border-color: #1a5fd0; }
.secondary {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1f2937;
}
.secondary:hover:not(:disabled) { background: #e2e8f0; }
.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
  font-weight: 600;
}
.danger:hover:not(:disabled) { background: #b91c1c; border-color: #b91c1c; }
.error { color: #b42318; }
</style>
