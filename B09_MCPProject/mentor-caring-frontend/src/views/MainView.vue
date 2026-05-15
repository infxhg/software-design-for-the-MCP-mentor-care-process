<template>
  <div>
    <h1>Dashboard</h1>
    <p class="desc">Welcome to Mentor Caring System.</p>

    <div v-if="visibleCards.length > 0" class="cards">
      <div v-for="card in visibleCards" :key="card.title" class="card">
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
        <router-link :to="card.path">{{ card.linkText }}</router-link>
      </div>
    </div>

    <div v-else class="no-function">
      <h2>No available test module</h2>
      <p>
        Your current role does not have access to the selected frontend test modules.
      </p>
      <p>
        The current test scope focuses on Mentor, MCP Coordinator, and Faculty Consultant.
      </p>
    </div>

    <div class="test-info">
      <h2>Test Data</h2>
      <p><strong>Current Role:</strong> {{ roleLabel }}</p>
      <p><strong>Student inside mentor group:</strong> S001</p>
      <p><strong>Student outside mentor group:</strong> S002</p>
      <p><strong>Non-existing student:</strong> S999</p>
      <p><strong>Mentor name:</strong> Dr. Smith</p>
      <p><strong>Mentor email:</strong> smith@university.edu</p>
      <p><strong>Group ID:</strong> G001</p>

      <button class="danger" @click="resetData">Reset Mock Data</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Role } from '../data/mockData'
import { getRoleLabel, resetMockData } from '../data/mockData'

const role = ((localStorage.getItem('role') as Role) || 'student')

const roleLabel = computed(() => {
  return getRoleLabel(role)
})

const cards = [
  {
    title: 'Search Student Info',
    description: 'Mentors and MCP Coordinators can search student information.',
    path: '/search-student',
    linkText: 'Go to Search',
    roles: ['mentor', 'coordinator'] as Role[],
  },
  {
    title: 'Edit Interview Record',
    description: 'Mentors can edit student interview records after searching a student.',
    path: '/search-student',
    linkText: 'Search Student First',
    roles: ['mentor'] as Role[],
  },
  {
    title: 'Search Mentor Info',
    description: 'Faculty Consultants and MCP Coordinators can search mentor information.',
    path: '/search-mentor',
    linkText: 'Go to Search',
    roles: ['consultant', 'coordinator'] as Role[],
  },
]

const visibleCards = computed(() => {
  return cards.filter((card) => card.roles.includes(role))
})

function resetData() {
  resetMockData()
  alert('Mock data has been reset.')
}
</script>

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

.no-function {
  margin-top: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.no-function p {
  color: #6b7280;
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

button.danger {
  margin-top: 12px;
}
</style>
