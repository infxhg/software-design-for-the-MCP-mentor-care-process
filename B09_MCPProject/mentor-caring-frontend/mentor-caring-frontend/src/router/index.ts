import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/students/search',
      component: SearchStudentView,
    },
    {
      path: '/students/:studentId',
      component: StudentDetailView,
    },
    {
      path: '/students/:studentId/edit-record',
      component: EditRecordView,
    },
    {
      path: '/mentors/search',
      component: SearchMentorView,
    },
    {
      path: '/mentors/result',
      component: MentorResultView,
    },
    {
      path: '/groups/:groupId/members',
      component: GroupMembersView,
    },
    {
      path: '/students/:studentId/record',
      component: StudentRecordView,
    },
  ],
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
