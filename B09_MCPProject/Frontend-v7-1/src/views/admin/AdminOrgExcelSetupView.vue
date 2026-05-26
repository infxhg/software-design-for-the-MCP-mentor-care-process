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
        <input
          :key="fileInputKey"
          type="file"
          accept=".xlsx"
          :disabled="isLoading"
          @change="onFileChange"
        />
        <small v-if="file">File Selected: {{ file.name }}</small>
      </div>

      <div class="format-hint">
        <strong>Expected columns:</strong>
        <table>
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Department</th>
              <th>Major</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>FST</td>
              <td>DCS</td>
              <td>CST</td>
            </tr>
          </tbody>
        </table>
        <p>The updated backend endpoint accepts .xlsx files through multipart/form-data.</p>
      </div>

      <div class="buttons">
        <button :disabled="isLoading" @click="save">
          {{ isLoading ? 'Importing...' : 'Save' }}
        </button>
        <button class="secondary" :disabled="isLoading" @click="cancel">Cancel</button>
        <button class="secondary" :disabled="isLoading" @click="goBack">Back</button>
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
const fileInputKey = ref(0)
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

function onFileChange(e: Event) {
  const selected = (e.target as HTMLInputElement).files?.[0] || null
  message.value = ''
  isError.value = false

  if (selected && !selected.name.toLowerCase().endsWith('.xlsx')) {
    file.value = null
    fileInputKey.value += 1
    message.value = 'Warning: The updated backend accepts .xlsx files only.'
    isError.value = true
    return
  }

  file.value = selected
}

async function save() {
  message.value = ''
  isError.value = false

  if (!file.value) {
    message.value = 'Warning: Please choose a .xlsx file first.'
    isError.value = true
    return
  }

  isLoading.value = true
  try {
    await importOrgFromExcel(file.value)
    message.value = 'Organization information imported successfully.'
    file.value = null
    fileInputKey.value += 1
  } catch (err: any) {
    message.value = err.message || 'Import failed.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function cancel() {
  file.value = null
  fileInputKey.value += 1
  message.value = ''
  isError.value = false
}

function goBack() {
  router.push('/admin/organization')
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.form { max-width: 620px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input[type="file"] {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
small { display: block; margin-top: 6px; color: #6b7280; }
.format-hint {
  margin-top: 14px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  color: #4b5563;
  font-size: 13px;
}
.format-hint table { width: 100%; border-collapse: collapse; margin: 10px 0; background: #fff; }
.format-hint th, .format-hint td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
.format-hint p { margin: 8px 0 0; }
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
