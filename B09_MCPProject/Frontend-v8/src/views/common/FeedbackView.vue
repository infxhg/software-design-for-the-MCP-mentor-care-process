<template>
  <div class="feedback-page">
    <div class="card">
      <div class="header-row">
        <div>
          <h1>Give Feedback</h1>
          <p class="desc">Please describe your issue or feedback regarding the system usage.</p>
        </div>

        <button class="secondary" type="button" @click="goHome">Home</button>
      </div>

      <form class="form" @submit.prevent="submit">
        <label for="feedback">Your feedback</label>

        <textarea
            id="feedback"
            v-model="content"
            maxlength="1000"
            rows="8"
            placeholder="Describe your issue or suggestion..."
            :disabled="saving"
        />

        <div class="counter">{{ content.length }}/1000</div>

        <div class="actions">
          <button class="primary" type="submit" :disabled="saving || !content.trim()">
            {{ saving ? 'Submitting...' : 'Submit' }}
          </button>
          <button class="secondary" type="button" :disabled="saving" @click="goBack">Back</button>
        </div>

        <p v-if="success" class="success">{{ success }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { submitFeedback } from '../../api/user'

const router = useRouter()

const content = ref('')
const saving = ref(false)
const success = ref('')
const error = ref('')

async function submit() {
  const text = content.value.trim()

  success.value = ''
  error.value = ''

  if (!text) {
    error.value = 'Please enter your feedback before submitting.'
    return
  }

  if (text.length > 1000) {
    error.value = 'Feedback cannot exceed 1000 characters.'
    return
  }

  saving.value = true

  try {
    await submitFeedback(text)
    content.value = ''
    success.value = 'Feedback submitted successfully.'
  } catch (err) {
    console.error('[feedback] failed to submit feedback:', err)
    error.value =
        err instanceof Error
            ? err.message || 'Failed to submit feedback.'
            : 'Failed to submit feedback.'
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.feedback-page {
  max-width: 960px;
  margin: 0 auto;
}

.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 48px 28px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

h1 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: 32px;
  line-height: 1.2;
}

.desc {
  margin: 0;
  color: #64748b;
}

.form {
  margin-top: 36px;
  max-width: 640px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 700;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 150px;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font: inherit;
  outline: none;
}

textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

textarea:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}

.counter {
  margin-top: 6px;
  color: #475569;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

button {
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.primary {
  background: #2563eb;
}

.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary {
  background: #6b7280;
}

.secondary:hover:not(:disabled) {
  background: #4b5563;
}

.success {
  margin-top: 14px;
  color: #047857;
}

.error {
  margin-top: 14px;
  color: #dc2626;
}
</style>
