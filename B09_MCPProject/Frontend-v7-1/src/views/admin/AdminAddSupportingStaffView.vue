<template>
  <section class="page">
    <h1>{{ isEdit ? 'Edit Supporting Staff' : 'Add Supporting Staff' }}</h1>

    <p v-if="error" class="error">{{ error }}</p>

    <form class="form" @submit.prevent="submit">
      <label>
        Username
        <input v-model.trim="form.username" :disabled="saving" required />
      </label>

      <label>
        Password
        <input v-model.trim="form.password" :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''" :required="!isEdit" type="password" :disabled="saving" />
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
        <button type="button" @click="router.back()">Back</button>
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
import {
  addSupportingStaff,
  getSupportingStaffById,
  updateSupportingStaff,
} from '../../api/admin'

const route = useRoute()
const router = useRouter()

const staffId = computed(() => String(route.params.staffId || route.params.id || ''))
const isEdit = computed(() => Boolean(staffId.value))
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

async function load() {
  if (!isEdit.value) return
  try {
    const data = await getSupportingStaffById(staffId.value)
    form.username = data.username || ''
    form.realName = data.realName || ''
    form.email = data.email || ''
    form.phone = data.phone || ''
    form.status = data.status ?? 1
  } catch (e: any) {
    error.value = e.message || 'Failed to load supporting staff.'
  }
}

async function submit() {
  saving.value = true
  error.value = ''

  try {
    const payload: any = {
      username: form.username,
      email: form.email,
      realName: form.realName,
      phone: form.phone,
      status: form.status,
    }

    if (form.password) payload.password = form.password

    if (isEdit.value) {
      await updateSupportingStaff(staffId.value, payload)
    } else {
      await addSupportingStaff(payload)
    }

    router.push('/admin/supporting-staff')
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
button { padding: 8px 14px; border: 1px solid #bbb; border-radius: 8px; background: #fff; cursor: pointer; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; }
</style>
