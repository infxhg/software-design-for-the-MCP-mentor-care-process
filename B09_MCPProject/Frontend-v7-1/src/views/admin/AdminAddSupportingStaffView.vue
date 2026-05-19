<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>{{ isEditMode ? 'Modify Supporting Staff' : 'Add Supporting Staff' }}</h1>
        <p class="desc">
          {{ isEditMode ? 'Update supporting staff information.' : 'Configure a new supporting staff account.' }}
        </p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>Staff Name</label>
        <input v-model="name" type="text" placeholder="e.g. Staff A" />
      </div>

      <div class="form-item">
        <label>Account ID</label>
        <input v-model="accountId" type="text" placeholder="e.g. 001" />
      </div>

      <div class="form-item">
        <label>Assign Rights</label>
        <div class="checkbox-group">
          <label class="check-label">
            <input type="checkbox" v-model="canViewLog" />
            <span>View the log information of all students</span>
          </label>
          <label class="check-label">
            <input type="checkbox" v-model="canReplyFeedback" />
            <span>Respond to the feedback from the users</span>
          </label>
        </div>
      </div>

      <div class="buttons">
        <button :disabled="isSaving" @click="save">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
        <button class="secondary" @click="cancel">Cancel</button>
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
  getSupportingStaff,
  addSupportingStaff,
  updateSupportingStaff,
} from '../../api/admin'

const route = useRoute()
const router = useRouter()

const staffId = String(route.params.staffId || '').trim()
const isEditMode = computed(() => !!staffId)

const name = ref('')
const accountId = ref('')
const canViewLog = ref(false)
const canReplyFeedback = ref(false)
const message = ref('')
const isError = ref(false)
const isSaving = ref(false)

onMounted(async () => {
  if (isEditMode.value) {
    try {
      const s = await getSupportingStaff(staffId)
      if (s) {
        name.value = s.name
        accountId.value = s.accountId
        canViewLog.value = s.canViewLog
        canReplyFeedback.value = s.canReplyFeedback
      } else {
        message.value = 'Staff not found.'
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
    message.value = 'Warning: Staff name cannot be empty.'
    isError.value = true
    return
  }
  if (!accountId.value.trim()) {
    message.value = 'Warning: Account ID cannot be empty.'
    isError.value = true
    return
  }

  isSaving.value = true
  try {
    if (isEditMode.value) {
      await updateSupportingStaff({
        staffId,
        name: name.value.trim(),
        accountId: accountId.value.trim(),
        canViewLog: canViewLog.value,
        canReplyFeedback: canReplyFeedback.value,
      })
      message.value = 'Staff updated.'
    } else {
      await addSupportingStaff({
        name: name.value.trim(),
        accountId: accountId.value.trim(),
        canViewLog: canViewLog.value,
        canReplyFeedback: canReplyFeedback.value,
      })
      message.value = 'Staff added.'
      name.value = ''
      accountId.value = ''
      canViewLog.value = false
      canReplyFeedback.value = false
    }
  } catch (err: any) {
    message.value = err.message || 'Save failed.'
    isError.value = true
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  if (isEditMode.value) {
    // 修改时取消 → 重新加载
    location.reload()
  } else {
    name.value = ''
    accountId.value = ''
    canViewLog.value = false
    canReplyFeedback.value = false
  }
}

function goBack() { router.push('/admin/supporting-staff') }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.form { max-width: 540px; margin-top: 22px; }
.form-item { margin-top: 16px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
input[type="text"] {
  width: 100%; padding: 10px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px;
}
.checkbox-group { display: flex; flex-direction: column; gap: 10px; }
.check-label { font-weight: normal; cursor: pointer; }
.check-label input { margin-right: 6px; }

.buttons { margin-top: 20px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
