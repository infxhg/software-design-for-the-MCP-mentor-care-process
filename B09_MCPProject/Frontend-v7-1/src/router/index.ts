import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '../types'

const LoginView = () => import('../views/LoginView.vue')
const MainView = () => import('../views/MainView.vue')

const SearchStudentView = () => import('../views/SearchStudentView.vue')
const StudentDetailView = () => import('../views/StudentDetailView.vue')
const EditRecordView = () => import('../views/EditRecordView.vue')
const SearchMentorView = () => import('../views/SearchMentorView.vue')
const MentorResultView = () => import('../views/MentorResultView.vue')
const GroupMembersView = () => import('../views/GroupMembersView.vue')
const StudentRecordView = () => import('../views/StudentRecordView.vue')

const FeedbackView = () => import('../views/common/FeedbackView.vue')
const CommunicationTypeView = () => import('../views/common/CommunicationTypeView.vue')
const NormalMessageView = () => import('../views/common/NormalMessageView.vue')

const MentorExportRecordsView = () => import('../views/mentor/MentorExportRecordsView.vue')
const MentorForwardCaseView = () => import('../views/mentor/MentorForwardCaseView.vue')
const InterviewArrangementView = () => import('../views/mentor/InterviewArrangementView.vue')
const InterviewArrangementVenueView = () => import('../views/mentor/InterviewArrangementVenueView.vue')

const StudentHomeView = () => import('../views/student/StudentHomeView.vue')
const CheckMentorInfoView = () => import('../views/student/CheckMentorInfoView.vue')
const StudentCommunicationView = () => import('../views/student/StudentCommunicationView.vue')
const StudentAppointmentSelectView = () => import('../views/student/StudentAppointmentSelectView.vue')

const CoordinatorForwardCaseView = () => import('../views/coordinator/CoordinatorForwardCaseView.vue')

const ConsultantImportView = () => import('../views/consultant/ConsultantImportView.vue')
const ConsultantChangeMentorsView = () => import('../views/consultant/ConsultantChangeMentorsView.vue')
const ConsultantUpdateGroupView = () => import('../views/consultant/ConsultantUpdateGroupView.vue')
const ConsultantDesignateCoordinatorsView = () =>
  import('../views/consultant/ConsultantDesignateCoordinatorsView.vue')
const ConsultantExportRecordsView = () => import('../views/consultant/ConsultantExportRecordsView.vue')
const ConsultantGroupListView = () => import('../views/consultant/ConsultantGroupListView.vue')
const ConsultantGroupDetailView = () => import('../views/consultant/ConsultantGroupDetailView.vue')
const ConsultantDepartmentListView = () => import('../views/consultant/ConsultantDepartmentListView.vue')
const ConsultantDepartmentDetailView = () =>
  import('../views/consultant/ConsultantDepartmentDetailView.vue')

const AdminConsultantManagementView = () => import('../views/admin/AdminConsultantManagementView.vue')
const AdminAddConsultantView = () => import('../views/admin/AdminAddConsultantView.vue')
const AdminOrgManagementView = () => import('../views/admin/AdminOrgManagementView.vue')
const AdminOrgManualSetupView = () => import('../views/admin/AdminOrgManualSetupView.vue')
const AdminOrgExcelSetupView = () => import('../views/admin/AdminOrgExcelSetupView.vue')
const AdminSupportingStaffManagementView = () =>
  import('../views/admin/AdminSupportingStaffManagementView.vue')
const AdminAddSupportingStaffView = () => import('../views/admin/AdminAddSupportingStaffView.vue')

const SupportSearchLogView = () => import('../views/support/SupportSearchLogView.vue')
const SupportLogInfoView = () => import('../views/support/SupportLogInfoView.vue')
const SupportReplyFeedbackView = () => import('../views/support/SupportReplyFeedbackView.vue')

function normalizeRole(value: unknown): Role | null {
  const role = String(value || '').trim().toLowerCase()

  if (role === 'student') return 'student'
  if (role === 'mentor') return 'mentor'
  if (role === 'coordinator') return 'coordinator'
  if (role === 'consultant') return 'consultant'
  if (role === 'admin') return 'admin'
  if (role === 'support') return 'support'

  return null
}

function getStoredRole(): Role | null {
  return normalizeRole(localStorage.getItem('role'))
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginView },
    { path: '/main', component: MainView },

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

    {
      path: '/feedback',
      component: FeedbackView,
      meta: {
        allowedRoles: [
          'mentor',
          'student',
          'coordinator',
          'consultant',
          'admin',
          'support',
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

    {
      path: '/coordinator/forward-case',
      component: CoordinatorForwardCaseView,
      meta: { allowedRoles: ['coordinator'] },
    },

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

    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const role = getStoredRole()

  if (to.path !== '/login' && !token) {
    return '/login'
  }

  if (to.path === '/login' && token) {
    return '/main'
  }

  const allowedRoles = to.meta.allowedRoles as Role[] | undefined

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    console.warn('Authorization warning: You do not have permission to access this page.')
    return '/main'
  }

  return true
})

router.onError((error) => {
  console.error('[router] failed to load route component:', error)
})

export default router
