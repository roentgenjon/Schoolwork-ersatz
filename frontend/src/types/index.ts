export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: Role;
  permissions: string[];
  created_at?: number;
}

export interface Class {
  id: string;
  name: string;
  teacher_id: string;
  teacher_name?: string;
  subject: string | null;
  color: string;
  icon: string;
  created_at: number;
  students?: User[];
  assignments?: Assignment[];
}

export type AssignmentType = 'quiz' | 'handout' | 'activity' | 'book_report' | 'collaboration';

export interface Attachment {
  id: string;
  assignment_id: string;
  type: 'file' | 'link';
  url: string | null;
  name: string;
  mime_type?: string | null;
  r2_key?: string | null;
  created_at?: number;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  name: string;
  mime_type: string;
  size: number;
  r2_key?: string | null;
  created_at: number;
}

export interface Assignment {
  id: string;
  class_id: string;
  class_name?: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  due_date: number | null;
  points: number;
  created_by: string;
  created_at: number;
  attachments?: Attachment[];
  submissions?: Submission[];
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'turned_in' | 'returned' | 'graded';

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name?: string;
  status: SubmissionStatus;
  content: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: number | null;
  updated_at: number;
  files?: SubmissionFile[];
}

export interface Handout {
  id: string;
  class_id: string;
  class_name?: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  created_by: string;
  created_at: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'class' | 'dm' | 'group';
  class_id?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name?: string;
  sender_role?: Role;
  content: string;
  image_key?: string | null;
  created_at: number;
}

export const ALL_PERMISSIONS = [
  'manage_users',
  'manage_classes',
  'manage_assignments',
  'view_all',
  'chat',
  'grade',
  'manage_handouts',
  'create_classes',
  'manage_own_classes',
  'create_assignments',
  'view_progress',
  'view_classes',
  'submit_assignments',
  'view_grades',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const PERMISSION_LABELS: Record<string, string> = {
  manage_users: 'Nutzer verwalten',
  manage_classes: 'Alle Klassen verwalten',
  manage_assignments: 'Alle Aufgaben verwalten',
  view_all: 'Alles einsehen',
  chat: 'Chat nutzen',
  grade: 'Bewerten',
  manage_handouts: 'Materialien verwalten',
  create_classes: 'Klassen erstellen',
  manage_own_classes: 'Eigene Klassen verwalten',
  create_assignments: 'Aufgaben erstellen',
  view_progress: 'Fortschritt einsehen',
  view_classes: 'Klassen einsehen',
  submit_assignments: 'Aufgaben abgeben',
  view_grades: 'Noten einsehen',
};
