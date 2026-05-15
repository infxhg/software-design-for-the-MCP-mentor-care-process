export type Role =
  | 'student'
  | 'mentor'
  | 'coordinator'
  | 'consultant'
  | 'admin'
  | 'support'

export interface InterviewRecord {
  recordId: string
  date: string
  time: string
  problemStatement: string
  interviewSummary: string
  followupAction: string
}

export interface Student {
  studentId: string
  name: string
  major: string
  departmentId: string
  status: string
  groupId: string
  mentorId: string
  records: InterviewRecord[]
}

export interface Mentor {
  mentorId: string
  name: string
  email: string
  office: string
  major: string
  departmentId: string
  groupId: string
  students: string[]
}

export const currentUser = {
  mentorId: 'M001',
  coordinatorDepartmentId: 'D001',
}

export const students: Student[] = [
  {
    studentId: 'S001',
    name: 'Alice Chen',
    major: 'Computer Science',
    departmentId: 'D001',
    status: 'Active',
    groupId: 'G001',
    mentorId: 'M001',
    records: [
      {
        recordId: 'R001',
        date: '2026-05-01',
        time: '10:00',
        problemStatement: 'Study pressure',
        interviewSummary: 'Discussed weekly study plan.',
        followupAction: 'Follow up next week.',
      },
    ],
  },
  {
    studentId: 'S002',
    name: 'Bob Li',
    major: 'Data Science',
    departmentId: 'D002',
    status: 'Active',
    groupId: 'G002',
    mentorId: 'M002',
    records: [
      {
        recordId: 'R002',
        date: '2026-05-03',
        time: '14:30',
        problemStatement: 'Difficulty in project work',
        interviewSummary: 'Discussed project progress and teamwork.',
        followupAction: 'Arrange another meeting after one week.',
      },
    ],
  },
  {
    studentId: 'S003',
    name: 'Cindy Wang',
    major: 'Computer Science',
    departmentId: 'D001',
    status: 'Active',
    groupId: 'G001',
    mentorId: 'M001',
    records: [],
  },
]

export const mentors: Mentor[] = [
  {
    mentorId: 'M001',
    name: 'Dr. Smith',
    email: 'smith@university.edu',
    office: 'A301',
    major: 'Computer Science',
    departmentId: 'D001',
    groupId: 'G001',
    students: ['S001', 'S003'],
  },
  {
    mentorId: 'M002',
    name: 'Dr. Brown',
    email: 'brown@university.edu',
    office: 'B205',
    major: 'Data Science',
    departmentId: 'D002',
    groupId: 'G002',
    students: ['S002'],
  },
]

export function getRole(): Role {
  return (localStorage.getItem('role') as Role) || 'student'
}

export function findStudentById(studentId: string) {
  return students.find((student) => student.studentId === studentId)
}

export function findMentorById(mentorId: string) {
  return mentors.find((mentor) => mentor.mentorId === mentorId)
}

export function hasStudentAccess(student: Student, role: Role): boolean {
  if (role === 'mentor') {
    return student.mentorId === currentUser.mentorId
  }

  if (role === 'coordinator') {
    return student.departmentId === currentUser.coordinatorDepartmentId
  }

  return false
}

export function hasMentorAccess(mentor: Mentor, role: Role): boolean {
  if (role === 'consultant') {
    return true
  }

  if (role === 'coordinator') {
    return mentor.departmentId === currentUser.coordinatorDepartmentId
  }

  return false
}

export function generateRecordId(): string {
  return `R${Date.now()}`
}
