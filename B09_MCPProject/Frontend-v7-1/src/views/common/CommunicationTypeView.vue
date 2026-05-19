<template>
  <div class="page-card">
    <div class="header">
      <div>
        <h1>Communication</h1>
        <p class="desc">Choose a communication type to continue.</p>
      </div>
      <button class="secondary" @click="goHome">Home</button>
    </div>

    <div class="choices">
      <router-link to="/communication/normal" class="choice">
        <h3>Normal Communication</h3>
        <p>Send text messages to one or more receivers.</p>
        <span class="link-text">Open →</span>
      </router-link>

      <router-link
          v-if="role === 'mentor'"
          to="/mentor/interview-arrangement"
          class="choice"
      >
        <h3>Interview Arrangement</h3>
        <p>Mark available time slots and arrange an interview with a student.</p>
        <span class="link-text">Open →</span>
      </router-link>

      <p v-if="role !== 'mentor'" class="note">
        Interview Arrangement is only available for mentors.
      </p>
    </div>

    <button class="secondary" @click="goBack">Back</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getRole } from '../../types'

const router = useRouter()
const role = getRole()

function goBack() { router.back() }
function goHome() { router.push('/main') }
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; }
.choices {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
  margin: 24px 0;
}
.choice {
  padding: 22px; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 10px; text-decoration: none; color: inherit;
  display: block;
}
.choice:hover { border-color: #2563eb; }
.choice h3 { margin-top: 0; }
.choice p { color: #6b7280; }
.link-text { color: #2563eb; font-weight: 600; }
.note { padding: 14px; background: #fffbeb; color: #92400e; border-radius: 8px; }
</style>
