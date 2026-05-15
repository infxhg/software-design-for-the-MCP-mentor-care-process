import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '../data/mockData'

import LoginView from '../views/LoginView.vue'
import MainView from '../views/MainView.vue'
import SearchStudentView from '../views/SearchStudentView.vue'
import StudentDetailView from '../views/StudentDetailView.vue'
import EditRecordView from '../views/EditRecordView.vue'
import SearchMentorView from '../views/SearchMentorView.vue'
import MentorResultView from '../views/MentorResultView.vue'
import GroupMembersView from '../views/GroupMembersView.vue'
import StudentRecordView from '../views/StudentRecordView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: LoginView,
    },
    {
      path: '/main',
      component: MainView,
    },

    {
      path: '/search-student',
      component: SearchStudentView,
      meta: {
        allowedRoles: ['mentor', 'coordinator'],
      },
    },
    {
      path: '/student-detail/:studentId',
      component: StudentDetailView,
      meta: {
        allowedRoles: ['mentor', 'coordinator'],
      },
    },
    {
      path: '/edit-record/:studentId',
      component: EditRecordView,
      meta: {
        allowedRoles: ['mentor'],
      },
    },

    {
      path: '/search-mentor',
      component: SearchMentorView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },
    {
      path: '/mentor-result',
      component: MentorResultView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },
    {
      path: '/group-members/:groupId',
      component: GroupMembersView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },
    {
      path: '/student-record/:studentId',
      component: StudentRecordView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role') as Role | null

  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }

  const allowedRoles = to.meta.allowedRoles as Role[] | undefined

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    alert('Authorization warning: You do not have permission to access this page.')
    next('/main')
    return
  }

  next()
})

export default router
