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

    // 修改部分：Search Student Info 不再使用 /students/search，避免被 /students/:studentId 吃掉
    {
      path: '/search-student',
      component: SearchStudentView,
    },

    // 修改部分：学生详情页改成明确路径 /student-detail/:studentId
    {
      path: '/student-detail/:studentId',
      component: StudentDetailView,
    },

    // 修改部分：编辑记录页改成明确路径 /edit-record/:studentId
    {
      path: '/edit-record/:studentId',
      component: EditRecordView,
    },

    // 修改部分：Search Mentor Info 不再使用 /mentors/search
    {
      path: '/search-mentor',
      component: SearchMentorView,
    },

    // 修改部分：导师结果页改成 /mentor-result
    {
      path: '/mentor-result',
      component: MentorResultView,
    },

    // 修改部分：小组成员页改成 /group-members/:groupId
    {
      path: '/group-members/:groupId',
      component: GroupMembersView,
    },

    // 修改部分：学生记录页改成 /student-record/:studentId
    {
      path: '/student-record/:studentId',
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
