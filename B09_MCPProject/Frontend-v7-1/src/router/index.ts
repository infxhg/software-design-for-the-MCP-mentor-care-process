import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '../types'

// ----- Existing views (Login + Mentor / Consultant flows) -----
import LoginView from '../views/LoginView.vue'
import MainView from '../views/MainView.vue'
import SearchStudentView from '../views/SearchStudentView.vue'
import StudentDetailView from '../views/StudentDetailView.vue'
import EditRecordView from '../views/EditRecordView.vue'
import SearchMentorView from '../views/SearchMentorView.vue'
import MentorResultView from '../views/MentorResultView.vue'
import GroupMembersView from '../views/GroupMembersView.vue'
import StudentRecordView from '../views/StudentRecordView.vue'

// ----- Common views (Feedback / Communication) -----
import FeedbackView from '../views/common/FeedbackView.vue'
import CommunicationTypeView from '../views/common/CommunicationTypeView.vue'
import NormalMessageView from '../views/common/NormalMessageView.vue'

// ----- Mentor extended views -----
import MentorExportRecordsView from '../views/mentor/MentorExportRecordsView.vue'
import MentorForwardCaseView from '../views/mentor/MentorForwardCaseView.vue'
import InterviewArrangementView from '../views/mentor/InterviewArrangementView.vue'
import InterviewArrangementVenueView from '../views/mentor/InterviewArrangementVenueView.vue'

// ----- Student views -----
import StudentHomeView from '../views/student/StudentHomeView.vue'
import CheckMentorInfoView from '../views/student/CheckMentorInfoView.vue'
import StudentCommunicationView from '../views/student/StudentCommunicationView.vue'
import StudentAppointmentSelectView from '../views/student/StudentAppointmentSelectView.vue'

// ----- Coordinator views -----
import CoordinatorForwardCaseView from '../views/coordinator/CoordinatorForwardCaseView.vue'

// ----- Faculty Consultant views -----
import ConsultantImportView from '../views/consultant/ConsultantImportView.vue'
import ConsultantChangeMentorsView from '../views/consultant/ConsultantChangeMentorsView.vue'
import ConsultantUpdateGroupView from '../views/consultant/ConsultantUpdateGroupView.vue'
import ConsultantDesignateCoordinatorsView from '../views/consultant/ConsultantDesignateCoordinatorsView.vue'
import ConsultantExportRecordsView from '../views/consultant/ConsultantExportRecordsView.vue'
import ConsultantGroupListView from '../views/consultant/ConsultantGroupListView.vue'
import ConsultantGroupDetailView from '../views/consultant/ConsultantGroupDetailView.vue'
import ConsultantDepartmentListView from '../views/consultant/ConsultantDepartmentListView.vue'
import ConsultantDepartmentDetailView from '../views/consultant/ConsultantDepartmentDetailView.vue'

// ----- Administrator views -----
import AdminConsultantManagementView from '../views/admin/AdminConsultantManagementView.vue'
import AdminAddConsultantView from '../views/admin/AdminAddConsultantView.vue'
import AdminOrgManagementView from '../views/admin/AdminOrgManagementView.vue'
import AdminOrgManualSetupView from '../views/admin/AdminOrgManualSetupView.vue'
import AdminOrgExcelSetupView from '../views/admin/AdminOrgExcelSetupView.vue'
import AdminSupportingStaffManagementView from '../views/admin/AdminSupportingStaffManagementView.vue'
import AdminAddSupportingStaffView from '../views/admin/AdminAddSupportingStaffView.vue'

// ----- Supporting Staff views -----
import SupportSearchLogView from '../views/support/SupportSearchLogView.vue'
import SupportLogInfoView from '../views/support/SupportLogInfoView.vue'
import SupportReplyFeedbackView from '../views/support/SupportReplyFeedbackView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginView },
    { path: '/main', component: MainView },

    // ===================== Mentor / Coordinator =====================

    // Search student info (mentor/coordinator/consultant)
    {
      path: '/search-student',
      component: SearchStudentView,
      meta: { allowedRoles: ['mentor', 'coordinator', 'consultant'] },
    },
    {
      path: '/student-detail/:studentId',
      component: StudentDetailView,
      meta: { allowedRoles: ['mentor', 'coordinator', 'consultant'] },
    },
    {
      path: '/edit-record/:studentId',
      component: EditRecordView,
      meta: { allowedRoles: ['mentor'] },
    },

    // Search mentor info (consultant/coordinator)
    {
      path: '/search-mentor',
      component: SearchMentorView,
      meta: { allowedRoles: ['consultant', 'coordinator'] },
    },
    {
      path: '/mentor-result',
      component: MentorResultView,
      meta: { allowedRoles: ['consultant', 'coordinator'] },
    },
    {
      path: '/group-members/:groupId',
      component: GroupMembersView,
      meta: { allowedRoles: ['consultant', 'coordinator'] },
    },
    {
      path: '/student-record/:studentId',
      component: StudentRecordView,
      meta: { allowedRoles: ['consultant', 'coordinator'] },
    },

    // ===================== Mentor extended =====================

    {
      path: '/mentor/export-records',
      component: MentorExportRecordsView,
      meta: { allowedRoles: ['mentor'] },
    },
    {
      path: '/mentor/forward-case',
      component: MentorForwardCaseView,
      meta: { allowedRoles: ['mentor'] },
    },
    {
      path: '/mentor/interview-arrangement',
      component: InterviewArrangementView,
      meta: { allowedRoles: ['mentor'] },
    },
    {
      path: '/mentor/interview-arrangement/venue',
      component: InterviewArrangementVenueView,
      meta: { allowedRoles: ['mentor'] },
    },

    // ===================== Common (multi-role) =====================

    {
      path: '/feedback',
      component: FeedbackView,
      meta: {
        allowedRoles: [
          'mentor', 'student', 'coordinator',
          'consultant', 'admin', 'support',
        ],
      },
    },
    {
      path: '/communication',
      component: CommunicationTypeView,
      meta: { allowedRoles: ['mentor', 'coordinator', 'consultant', 'student'] },
    },
    {
      path: '/communication/normal',
      component: NormalMessageView,
      meta: { allowedRoles: ['mentor', 'coordinator', 'consultant', 'student'] },
    },

    // ===================== Student =====================

    {
      path: '/student',
      component: StudentHomeView,
      meta: { allowedRoles: ['student'] },
    },
    {
      path: '/student/check-mentor',
      component: CheckMentorInfoView,
      meta: { allowedRoles: ['student'] },
    },
    {
      path: '/student/communication',
      component: StudentCommunicationView,
      meta: { allowedRoles: ['student'] },
    },
    {
      path: '/student/appointment-select',
      component: StudentAppointmentSelectView,
      meta: { allowedRoles: ['student'] },
    },

    // ===================== Coordinator =====================

    {
      path: '/coordinator/forward-case',
      component: CoordinatorForwardCaseView,
      meta: { allowedRoles: ['coordinator'] },
    },

    // ===================== Faculty Consultant =====================

    {
      path: '/consultant/import',
      component: ConsultantImportView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/change-mentors',
      component: ConsultantChangeMentorsView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/update-group',
      component: ConsultantUpdateGroupView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/designate-coordinators',
      component: ConsultantDesignateCoordinatorsView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/export-records',
      component: ConsultantExportRecordsView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/groups',
      component: ConsultantGroupListView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/groups/:groupId',
      component: ConsultantGroupDetailView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/departments',
      component: ConsultantDepartmentListView,
      meta: { allowedRoles: ['consultant'] },
    },
    {
      path: '/consultant/departments/:deptId',
      component: ConsultantDepartmentDetailView,
      meta: { allowedRoles: ['consultant'] },
    },

    // ===================== Administrator =====================

    {
      path: '/admin/consultants',
      component: AdminConsultantManagementView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/consultants/add',
      component: AdminAddConsultantView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/consultants/edit/:consultantId',
      component: AdminAddConsultantView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/organization',
      component: AdminOrgManagementView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/organization/manual',
      component: AdminOrgManualSetupView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/organization/excel',
      component: AdminOrgExcelSetupView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/supporting-staff',
      component: AdminSupportingStaffManagementView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/supporting-staff/add',
      component: AdminAddSupportingStaffView,
      meta: { allowedRoles: ['admin'] },
    },
    {
      path: '/admin/supporting-staff/edit/:staffId',
      component: AdminAddSupportingStaffView,
      meta: { allowedRoles: ['admin'] },
    },

    // ===================== Supporting Staff =====================

    {
      path: '/support/search-log',
      component: SupportSearchLogView,
      meta: { allowedRoles: ['support'] },
    },
    {
      path: '/support/log/:userId',
      component: SupportLogInfoView,
      meta: { allowedRoles: ['support'] },
    },
    {
      path: '/support/reply-feedback',
      component: SupportReplyFeedbackView,
      meta: { allowedRoles: ['support'] },
    },
  ],
})

router.beforeEach((to, _from, next) => {
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
