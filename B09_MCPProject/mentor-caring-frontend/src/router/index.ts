import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import MainView from '../views/MainView.vue'
import MessageListView from '../views/MessageListView.vue'
import AppointmentView from '../views/AppointmentView.vue'
import RecordView from '../views/RecordView.vue'
import ImportView from '../views/ImportView.vue'
import ExportView from '../views/ExportView.vue'
import LogView from '../views/LogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      component: LoginView
    },
    {
      path: '/main',
      component: MainView
    },
    {
      path: '/messages',
      component: MessageListView
    },
    {
      path: '/appointments',
      component: AppointmentView
    },
    {
      path: '/records',
      component: RecordView
    },
    {
      path: '/import',
      component: ImportView
    },
    {
      path: '/export',
      component: ExportView
    },
    {
      path: '/logs',
      component: LogView
    }
  ]
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
