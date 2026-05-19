<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>{{ isEditMode ? 'Change Consultant' : 'Add Consultant' }}</h1>
        <p class="desc">
          {{ isEditMode ? 'Update consultant information.' : 'Add a new faculty consultant.' }}
        </p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Consultant Name</label>
        <input v-model="name" type="text" placeholder="e.g. Prof. Amy" />
      </div>

      <div class="form-item">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="amy@bnbu.edu.cn" />
      </div>

      <div class="form-item">
        <label>Faculty</label>
        <select v-model="faculty">
          <option value="">-- Select Faculty --</option>
          <option v-for="f in FACULTIES" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>

      <div class="buttons">
        <button :disabled="isSaving" @click="save">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getConsultant,
  addConsultant,
  updateConsultant,
} from '../../api/admin'
import { FACULTIES } from '../../types'

const route = useRoute()
const router = useRouter()

const consultantId = String(route.params.consultantId || '').trim()
const isEditMode = computed(() => !!consultantId)

const name = ref('')
const email = ref('')
const faculty = ref('')
const message = ref('')
const isError = ref(false)
const isSaving = ref(false)

onMounted(async () => {
  if (isEditMode.value) {
    try {
      const c = await getConsultant(consultantId)
      if (c) {
        name.value = c.name
        email.value = c.email
        faculty.value = c.faculty
      } else {
        message.value = 'Consultant not found.'
        isError.value = true
      }
    } catch (err: any) {
      message.value = err.message || 'Failed to load.'
      isError.value = true
    }
  }
})

async function save() {
  message.value = ''
  isError.value = false

  if (!name.value.trim()) {
    message.value = 'Warning: Name cannot be empty.'
    isError.value = true
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) {
    message.value = 'Warning: Invalid email.'
    isError.value = true
    return
  }
  if (!faculty.value) {
    message.value = 'Warning: Please select a faculty.'
    isError.value = true
    return
  }

  isSaving.value = true
  try {
    if (isEditMode.value) {
      await updateConsultant({
        consultantId,
        name: name.value.trim(),
        email: email.value.trim(),
        faculty: faculty.value,
      })
      message.value = 'Consultant updated.'
    } else {
      await addConsultant({
        name: name.value.trim(),
        email: email.value.trim(),
        faculty: faculty.value,
      })
      message.value = 'Consultant added.'
      name.value = ''
      email.value = ''
      faculty.value = ''
    }
  } catch (err: any) {
    message.value = err.message || 'Save failed.'
    isError.value = true
  } finally {
    isSaving.value = false
  }
}

function goBack() { router.push('/admin/consultants') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 500px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input, select {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
.buttons { margin-top: 20px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
