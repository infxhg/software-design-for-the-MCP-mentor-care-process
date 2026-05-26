<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Manual Setup</h1>
        <p class="desc">Add a faculty/department/major entry manually.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Faculty Name</label>
        <input v-model="faculty" type="text" placeholder="e.g. FST" />
      </div>

      <div class="form-item">
        <label>Department Name</label>
        <input v-model="department" type="text" placeholder="e.g. DCS" />
      </div>

      <div class="form-item">
        <label>Major Name</label>
        <input v-model="major" type="text" placeholder="e.g. CST" />
      </div>

      <div class="buttons">
        <button :disabled="isLoading" @click="enter">
          {{ isLoading ? 'Saving...' : 'Enter' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { addOrgEntry } from '../../api/admin'

const router = useRouter()

const faculty = ref('')
const department = ref('')
const major = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

async function enter() {
  message.value = ''
  isError.value = false

  if (!faculty.value.trim() || !department.value.trim() || !major.value.trim()) {
    message.value = 'Warning: All fields are required.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    await addOrgEntry({
      faculty: faculty.value.trim(),
      department: department.value.trim(),
      major: major.value.trim(),
    })
    message.value = 'Entry added.'
    // keep faculty/department for fast entry of multiple majors
    major.value = ''
  } catch (err: any) {
    message.value = err.message || 'Failed to add entry.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goBack() { router.push('/admin/organization') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 500px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
.buttons { margin-top: 20px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
