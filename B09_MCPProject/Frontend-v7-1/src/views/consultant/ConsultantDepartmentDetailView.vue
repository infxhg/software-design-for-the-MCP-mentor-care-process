<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Department Detail</h1>
        <p class="desc">Department: <strong>{{ dept?.departmentName || deptId }}</strong></p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else-if="dept">
      <div class="info-box">
        <p><strong>Current MCP Coordinator:</strong> {{ dept.coordinatorName || 'Not designated' }}</p>
        <p v-if="dept.coordinatorEmail"><strong>Email:</strong> {{ dept.coordinatorEmail }}</p>
      </div>

      <h2>Actions for Coordinator</h2>

      <div class="actions-row">
        <button @click="showChange = !showChange">
          {{ showChange ? 'Cancel' : 'Change Coordinator' }}
        </button>

        <button
            v-if="dept.coordinatorName"
            class="danger"
            :disabled="isRemoving"
            @click="remove"
        >
          {{ isRemoving ? 'Removing...' : 'Remove' }}
        </button>
      </div>

      <div v-if="showChange" class="change-form">
        <div class="form-item">
          <label>New Coordinator Name</label>
          <input v-model="newName" type="text" />
        </div>
        <div class="form-item">
          <label>Email</label>
          <input v-model="newEmail" type="email" placeholder="name@bnbu.edu.cn" />
        </div>
        <button :disabled="isSaving" @click="save">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
    </div>

    <p v-else class="error">Department not found.</p>

    <div class="buttons">
      <button class="secondary" @click="goBack">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDepartmentDetail,
  designateCoordinator,
  removeCoordinator,
} from '../../api/consultant'
import type { DepartmentSummary } from '../../api/consultant'

const route = useRoute()
const router = useRouter()

const deptId = String(route.params.deptId || '').trim()

const dept = ref<DepartmentSummary | null>(null)
const isLoading = ref(true)
const message = ref('')
const isError = ref(false)
const showChange = ref(false)

const newName = ref('')
const newEmail = ref('')
const isSaving = ref(false)
const isRemoving = ref(false)

onMounted(load)

async function load() {
  isLoading.value = true
  try {
    dept.value = await getDepartmentDetail(deptId)
  } catch (err: any) {
    message.value = err.message || 'Failed to load department.'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

async function save() {
  message.value = ''
  isError.value = false

  if (!newName.value.trim() || !newEmail.value.trim()) {
    message.value = 'Warning: Name and email are required.'
    isError.value = true
    return
  }

  isSaving.value = true
  try {
    await designateCoordinator({
      coordinatorName: newName.value.trim(),
      email: newEmail.value.trim(),
      department: deptId,
    })
    showChange.value = false
    newName.value = ''
    newEmail.value = ''
    await load()
    message.value = 'Coordinator updated.'
  } catch (err: any) {
    message.value = err.message || 'Failed to update.'
    isError.value = true
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!confirm('Remove the coordinator from this department?')) return

  isRemoving.value = true
  message.value = ''
  try {
    await removeCoordinator(deptId)
    await load()
    message.value = 'Coordinator removed.'
  } catch (err: any) {
    message.value = err.message || 'Failed to remove.'
    isError.value = true
  } finally {
    isRemoving.value = false
  }
}

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }

.info-box {
  margin-top: 22px; padding: 16px;
  background: #f9fafb; border-radius: 8px;
}
.info-box p { margin: 4px 0; }

h2 { margin-top: 24px; font-size: 17px; }
.actions-row { display: flex; gap: 10px; margin-top: 14px; }

.change-form {
  margin-top: 18px; padding: 16px;
  background: #f9fafb; border-radius: 8px;
  max-width: 500px;
}
.form-item { margin-bottom: 12px; }
label { display: block; font-weight: 600; margin-bottom: 6px; }
input {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}

.buttons { margin-top: 22px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
.loading { color: #6b7280; padding: 30px; text-align: center; }
</style>
