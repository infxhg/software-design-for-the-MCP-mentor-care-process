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

    // 只有 Mentor 和 MCP Coordinator 可以搜索学生信息
    {
      path: '/search-student',
      component: SearchStudentView,
      meta: {
        allowedRoles: ['mentor', 'coordinator'],
      },
    },

    // Student Detail 属于 Search Student Info 流程
    {
      path: '/student-detail/:studentId',
      component: StudentDetailView,
      meta: {
        allowedRoles: ['mentor', 'coordinator'],
      },
    },

    // 只有 Mentor 可以编辑 interview record
    {
      path: '/edit-record/:studentId',
      component: EditRecordView,
      meta: {
        allowedRoles: ['mentor'],
      },
    },

    // 只有 Faculty Consultant 和 MCP Coordinator 可以搜索导师信息
    {
      path: '/search-mentor',
      component: SearchMentorView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },

    // Mentor search result 也只允许 Consultant 和 Coordinator 进入
    {
      path: '/mentor-result',
      component: MentorResultView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },

    // Group members 也只允许 Consultant 和 Coordinator 进入
    {
      path: '/group-members/:groupId',
      component: GroupMembersView,
      meta: {
        allowedRoles: ['consultant', 'coordinator'],
      },
    },

    // 从 group members 点学生记录，也只允许 Consultant 和 Coordinator 进入
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
  const role = localStorage.getItem('role')

  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }

  const allowedRoles = to.meta.allowedRoles as string[] | undefined

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    alert('Authorization warning: You do not have permission to access this page.')
    next('/main')
    return
  }

  next()
})

export default router
