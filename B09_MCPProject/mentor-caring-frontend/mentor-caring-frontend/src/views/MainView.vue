<template>
  <div>
    <h1>Dashboard</h1>
    <p class="desc">Welcome to Mentor Caring System.</p>

    <div class="cards">
      <div class="card">
        <h3>Search Student Info</h3>
        <p>Mentors and MCP Coordinators can search student information.</p>
        <router-link to="/students/search">Go to Search</router-link>
      </div>

      <div class="card">
        <h3>Edit Interview Record</h3>
        <p>Mentors can edit student interview records after searching a student.</p>
        <router-link to="/students/search">Search Student First</router-link>
      </div>

      <div class="card">
        <h3>Search Mentor Info</h3>
        <p>Faculty Consultants and MCP Coordinators can search mentor information.</p>
        <router-link to="/mentors/search">Go to Search</router-link>
      </div>
    </div>

    <div class="test-info">
      <h2>Test Data</h2>
      <p><strong>Student inside mentor group:</strong> S001</p>
      <p><strong>Student outside mentor group:</strong> S002</p>
      <p><strong>Non-existing student:</strong> S999</p>
      <p><strong>Mentor name:</strong> Dr. Smith</p>
      <p><strong>Mentor email:</strong> smith@university.edu</p>
      <p><strong>Group ID:</strong> G001</p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.desc {
  color: #6b7280;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 24px;
}

.card {
  padding: 22px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.card h3 {
  margin-top: 0;
}

.card p {
  color: #6b7280;
}

.card a {
  display: inline-block;
  margin-top: 12px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.test-info {
  margin-top: 28px;
  padding: 22px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.test-info h2 {
  margin-top: 0;
}
</style>
