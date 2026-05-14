<template>
  <div>
    <h1>Dashboard</h1>
    <p>Welcome, your current role is: {{ role }}</p>

    <div class="cards">
      <div class="card">
        <h3>Messages</h3>
        <p>View and send messages.</p>
      </div>

      <div class="card">
        <h3>Appointments</h3>
        <p>Manage interview appointments.</p>
      </div>

      <div class="card">
        <h3>Interview Records</h3>
        <p>Create and edit interview records.</p>
      </div>

      <div class="card">
        <h3>Export</h3>
        <p>Export records as Word files.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const role = localStorage.getItem('role') || 'student'
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}

.card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
</style>
