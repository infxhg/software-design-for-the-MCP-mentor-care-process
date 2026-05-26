<template>
  <div class="page-card">
    <h1>Student Dashboard</h1>
    <p class="desc">Welcome, {{ username }}.</p>

    <div class="cards">
      <router-link to="/student/check-mentor" class="card">
        <h3>Check Mentor Info</h3>
        <p>View your group status, assigned mentor, and interview records.</p>
      </router-link>

      <router-link to="/student/appointment-select" class="card">
        <h3>Select Interview Appointment</h3>
        <p>Choose one available 30-minute interview slot from your mentor.</p>
      </router-link>

      <router-link to="/student/communication" class="card">
        <h3>Communication</h3>
        <p>Read messages and send messages to your mentor.</p>
      </router-link>

      <router-link to="/feedback" class="card">
        <h3>Give Feedback</h3>
        <p>Send feedback about the system to supporting staff.</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
function getDisplayName(): string {
  const raw = localStorage.getItem('userInfo')

  if (raw) {
    try {
      const data = JSON.parse(raw)
      return (
        data?.user?.realName ||
        data?.realName ||
        data?.user?.username ||
        data?.username ||
        localStorage.getItem('username') ||
        'Student'
      )
    } catch {
      // Fall back to username below.
    }
  }

  return localStorage.getItem('username') || 'Student'
}

const username = getDisplayName()
</script>

<style scoped>
.desc { color: #6b7280; margin-bottom: 22px; }
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.card {
  padding: 22px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
}
.card:hover { border-color: #2563eb; }
.card h3 { margin-top: 0; }
.card p { color: #6b7280; }
</style>
