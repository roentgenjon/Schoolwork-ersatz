export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  FILES: R2Bucket;
  FRONTEND_URL: string;
  JWT_SECRET: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  permissions: string[];
  created_at: number;
}

export interface UserWithHash extends User {
  password_hash: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

export interface Class {
  id: string;
  name: string;
  teacher_id: string;
  subject: string | null;
  color: string;
  icon: string;
  created_at: number;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  type: 'quiz' | 'handout' | 'activity' | 'book_report' | 'collaboration';
  due_date: number | null;
  points: number;
  created_by: string;
  created_at: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  assignment_id: string;
  type: 'file' | 'link';
  url: string;
  name: string;
  created_at: number;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: 'not_started' | 'in_progress' | 'turned_in' | 'returned' | 'graded';
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

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name?: string;
  content: string;
  created_at: number;
}

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ['manage_users', 'manage_classes', 'manage_assignments', 'view_all', 'chat', 'grade', 'manage_handouts'],
  teacher: ['create_classes', 'manage_own_classes', 'create_assignments', 'grade', 'chat', 'view_progress', 'manage_handouts'],
  student: ['view_classes', 'submit_assignments', 'view_grades', 'chat'],
};
