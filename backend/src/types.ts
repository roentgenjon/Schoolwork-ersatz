export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_at: number;
}

export interface Class {
  id: string;
  name: string;
  teacher_id: string;
  subject: string | null;
  color: string | null;
  icon: string | null;
  created_at: number;
}

export interface ClassMember {
  class_id: string;
  student_id: string;
}

export type AssignmentType = 'quiz' | 'handout' | 'activity' | 'book_report' | 'collaboration';

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  due_date: number | null;
  points: number;
  created_by: string;
  created_at: number;
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'turned_in' | 'returned' | 'graded';

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  submitted_at: number | null;
  updated_at: number;
}

export interface Handout {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  created_by: string;
  created_at: number;
}

export type ChatRoomType = 'global' | 'class' | 'dm';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: number;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  type: ChatRoomType;
  class_id: string | null;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  FRONTEND_URL: string;
}

// Context variable types used in Hono
export interface Variables {
  user: User;
}
