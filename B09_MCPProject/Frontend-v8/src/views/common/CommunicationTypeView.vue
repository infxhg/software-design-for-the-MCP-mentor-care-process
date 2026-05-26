<template>
  <div class="communication-type-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Communication</p>
        <h1>Communication Center</h1>
        <p class="subtitle">Choose a communication function.</p>
      </div>

      <button class="secondary" type="button" @click="goHome">Home</button>
    </header>

    <div class="cards">
      <article class="card">
        <h2>Normal Message</h2>
        <p>Send text messages by entering one or more receiver IDs.</p>
        <button type="button" @click="goNormalMessage">Open</button>
      </article>

      <article v-if="role === 'mentor'" class="card">
        <h2>Interview Arrangement</h2>
        <p>Create available interview time slots for students to book.</p>
        <button type="button" @click="goInterview">Open</button>
      </article>

      <article v-if="role === 'student'" class="card">
        <h2>Appointment Selection</h2>
        <p>Select an available interview slot from your mentor.</p>
        <button type="button" @click="goAppointment">Open</button>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = computed(() => localStorage.getItem('role') || '')

function goNormalMessage() {
  router.push('/communication/normal')
}

function goInterview() {
  router.push('/mentor/interview-arrangement')
}

function goAppointment() {
  router.push('/student/appointment-select')
}

function goHome() {
  router.push('/main')
}
</script>

<style scoped>
.communication-type-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 32px;
}

.subtitle {
  margin: 10px 0 0;
  color: #6b7280;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.card {
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.card h2 {
  margin: 0 0 10px;
  color: #111827;
}

.card p {
  min-height: 48px;
  margin: 0 0 18px;
  color: #6b7280;
  line-height: 1.5;
}

button {
  border: none;
  border-radius: 9px;
  padding: 9px 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button.secondary {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
}
</style>
