<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Give Feedback</h1>
        <p class="desc">Please describe your issue or feedback regarding the system usage.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="form">
      <label>Your feedback</label>
      <textarea
          v-model="feedback"
          rows="8"
          maxlength="1000"
          placeholder="Describe your issue or suggestion..."
      ></textarea>
      <small>{{ feedback.length }}/1000</small>

      <div class="buttons">
        <button :disabled="isLoading" @click="submitFeedback">
          {{ isLoading ? 'Sending...' : 'Submit' }}
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

const router = useRouter()

const feedback = ref('')
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

async function submitFeedback() {
  message.value = ''
  isError.value = false

  if (!feedback.value.trim()) {
    message.value = 'Warning: Feedback cannot be empty.'
    isError.value = true
    return
  }

  isLoading.value = true

  try {
    /**
     * 后端接口尚未到位，先用 mock：模拟一个延时即可。
     * 实际接口估计是 POST /api/feedback { content }，
     * 后端到位后把这块替换掉就行。
     */
    await new Promise((resolve) => setTimeout(resolve, 400))
    message.value = 'Feedback submitted successfully.'
    isError.value = false
    feedback.value = ''
  } catch (err: any) {
    message.value = 'Failed to submit feedback: ' + (err.message || 'Unknown error')
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
.form { max-width: 640px; margin-top: 22px; }
label { display: block; margin-bottom: 8px; font-weight: 600; }
textarea {
  width: 100%; padding: 12px; box-sizing: border-box;
  border: 1px solid #d1d5db; border-radius: 6px; min-height: 160px;
  font-family: inherit;
}
small { color: #6b7280; }
.buttons { margin-top: 18px; }
.buttons button { margin-right: 10px; }
.message { margin-top: 14px; color: #047857; }
.error { color: #dc2626; }
</style>
