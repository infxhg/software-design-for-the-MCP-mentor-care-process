<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Excel Setup</h1>
        <p class="desc">Upload an Excel file to bulk-configure faculties, departments, and majors.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Upload an Excel File</label>
        <input type="file" accept=".xlsx,.xls" @change="onFileChange" />
        <small v-if="file">File Selected: {{ file.name }}</small>
      </div>

      <p class="format-hint">
        Expected columns: Faculty, Department, Major
      </p>

      <div class="buttons">
        <button :disabled="isLoading" @click="save">
          {{ isLoading ? 'Importing...' : 'Save' }}
        </button>
        <button class="secondary" @click="cancel">Cancel</button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { importOrgFromExcel } from '../../api/admin'

const router = useRouter()

const file = ref<File | null>(null)
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] || null
  message.value = ''
}

async function save() {
  message.value = ''
  isError.value = false

  if (!file.value) {
    message.value = 'Warning: Please choose a file first.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    await importOrgFromExcel(file.value)
    message.value = 'Organization information imported successfully.'
    file.value = null
  } catch (err: any) {
    message.value = err.message || 'Import failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function cancel() {
  file.value = null
  message.value = ''
}

function goBack() { router.push('/admin/organization') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 500px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input[type="file"] {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
small { display: block; margin-top: 6px; color: #6b7280; }
.format-hint {
  margin-top: 14px; padding: 10px; background: #f3f4f6;
  border-radius: 6px; color: #4b5563; font-size: 13px;
}
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
