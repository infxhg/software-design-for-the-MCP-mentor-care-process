<template>
  <div class="page-card">
    <h1>Student Dashboard</h1>
    <p class="desc">Welcome, {{ username }}.</p>

    <div class="cards">
      <router-link to="/student/check-mentor" class="card">
        <h3>Check Mentor Info</h3>
        <p>View your assigned mentor's information.</p>
      </router-link>

      <router-link to="/student/communication" class="card">
        <h3>Communication</h3>
        <p>Read messages and respond to interview invitations.</p>
      </router-link>

      <router-link to="/feedback" class="card">
        <h3>Give Feedback</h3>
        <p>Send feedback about the system to the administrator.</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = localStorage.getItem('username') || 'Student'
</script>

<style scoped>
.desc { color: #6b7280; margin-bottom: 22px; }
.cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.card {
  padding: 22px; background: white; border: 1px solid #e5e7eb;
  border-radius: 10px; text-decoration: none; color: inherit;
}
.card:hover { border-color: #2563eb; }
.card h3 { margin-top: 0; }
.card p { color: #6b7280; }
</style>
