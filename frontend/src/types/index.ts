export type Role = 'admin' | 'teacher' | 'student'
export type AssignmentType = 'quiz' | 'handout' | 'activity' | 'book_report' | 'collaboration'
export type SubmissionStatus = 'not_started' | 'in_progress' | 'turned_in' | 'returned' | 'graded'
export type ChatRoomType = 'global' | 'class' | 'dm' | 'group'

export interface User {
  id: string
  name: string
  role: Role
  created_at: number
}

export interface Class {
  id: string
  name: string
  teacher_id: string
  subject: string
  color: string
  icon: string
  created_at: number
  student_count?: number
}

export interface Assignment {
  id: string
  class_id: string
  title: string
  description: string
  type: AssignmentType
  due_date: number | null
  points: number
  created_by: string
  created_at: number
  file_url?: string | null
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  status: SubmissionStatus
  score: number | null
  feedback: string | null
  submitted_at: number | null
  updated_at: number
  student_name?: string
}

export interface Handout {
  id: string
  class_id: string
  title: string
  description: string
  file_url: string
  file_type: string
  created_by: string
  created_at: number
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: number
  sender_name?: string
  sender_role?: Role
}

export interface ChatRoom {
  id: string
  name: string
  type: ChatRoomType
  class_id: string | null
  unread_count?: number
}

export interface StudentProgress {
  student: User
  submissions: Submission[]
  averageScore: number
  completedCount: number
}
