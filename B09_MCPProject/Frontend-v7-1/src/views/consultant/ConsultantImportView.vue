<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Import Students' Name Lists</h1>
        <p class="desc">
          Upload an Excel file (ID, Name, Major, Status, Group, Mentor, Office, Email).
          Existing historical info is preserved.
        </p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Excel File</label>
        <input type="file" accept=".xlsx,.xls" @change="onFileChange" />
        <small v-if="file">Selected: {{ file.name }}</small>
        <small v-else>No file selected.</small>
      </div>

      <p class="format-hint">
        <strong>Expected format:</strong> Student ID, Student Name, Major, Status,
        Group ID, Mentor, Office, Mentor Email
      </p>

      <div class="buttons">
        <button :disabled="isLoading" @click="importFile">
          {{ isLoading ? 'Importing...' : 'Import' }}
        </button>
        <button class="secondary" @click="goBack">Back</button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>

      <div v-if="result" class="result-box">
        <p><strong>Import Result:</strong></p>
        <ul>
          <li>Created: {{ result.created }} new records</li>
          <li>Updated: {{ result.updated }} existing records</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { importStudentNameList } from '../../api/consultant'

const router = useRouter()

const file = ref<File | null>(null)
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const result = ref<{ created: number; updated: number } | null>(null)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] || null
  message.value = ''
  result.value = null
}

async function importFile() {
  message.value = ''
  isError.value = false
  result.value = null

  if (!file.value) {
    message.value = 'Warning: Please choose an Excel file first.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    const res = await importStudentNameList(file.value)
    result.value = res
    message.value = 'Import completed successfully.'
  } catch (err: any) {
    message.value = err.message || 'Import failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 600px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input[type="file"] {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
small { display: block; margin-top: 6px; color: #6b7280; }
.format-hint {
  margin-top: 18px; padding: 12px; background: #f3f4f6;
  border-radius: 6px; color: #4b5563; font-size: 13px;
}
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.result-box {
  margin-top: 14px; padding: 14px;
  background: #dcfce7; border-radius: 8px; color: #15803d;
}
.result-box ul { margin: 8px 0 0 20px; }
</style>
