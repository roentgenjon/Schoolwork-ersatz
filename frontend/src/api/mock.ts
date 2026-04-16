/**
 * Mock API – vollständige localStorage-basierte Simulation des Backends.
 * Wird automatisch aktiviert wenn kein Cloudflare-Backend erreichbar ist.
 */

import type {
  User, Class, Assignment, Submission,
  Handout, ChatMessage, ChatRoom, Role,
} from '../types'

// ─── Storage Helpers ───────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`mock_${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(`mock_${key}`, JSON.stringify(value))
}

function uid(): string {
  return crypto.randomUUID()
}

function now(): number {
  return Math.floor(Date.now() / 1000)
}

// ─── Seed-Daten (beim ersten Start) ────────────────────────────────────────

function seedIfEmpty() {
  if (load<User[]>('users', []).length > 0) return

  const teacher: User = { id: uid(), name: 'Frau Müller', role: 'teacher', created_at: now() }
  const student1: User = { id: uid(), name: 'Max Muster', role: 'student', created_at: now() }
  const student2: User = { id: uid(), name: 'Anna Schmidt', role: 'student', created_at: now() }
  save('users', [teacher, student1, student2])

  const cls: Class = {
    id: uid(), name: '10b', subject: 'Mathematik',
    teacher_id: teacher.id, color: '#007AFF', icon: '🧮',
    created_at: now(), student_count: 2,
  }
  save('classes', [cls])
  save(`class_members_${cls.id}`, [student1.id, student2.id])

  const a1: Assignment = {
    id: uid(), class_id: cls.id, title: 'Lineare Gleichungen',
    description: 'Löse die Aufgaben auf Seite 45–47.',
    type: 'quiz', due_date: now() + 7 * 86400, points: 100,
    created_by: teacher.id, created_at: now(),
  }
  const a2: Assignment = {
    id: uid(), class_id: cls.id, title: 'Geometrie Handout',
    description: 'Lies das Handout und beantworte die Fragen.',
    type: 'handout', due_date: now() + 3 * 86400, points: 50,
    created_by: teacher.id, created_at: now(),
  }
  save('assignments', [a1, a2])

  const sub1: Submission = {
    id: uid(), assignment_id: a1.id, student_id: student1.id,
    status: 'turned_in', score: null, feedback: null,
    submitted_at: now(), updated_at: now(),
  }
  const sub2: Submission = {
    id: uid(), assignment_id: a1.id, student_id: student2.id,
    status: 'graded', score: 92, feedback: 'Sehr gut gemacht!',
    submitted_at: now() - 86400, updated_at: now(),
  }
  save('submissions', [sub1, sub2])

  const handout: Handout = {
    id: uid(), class_id: cls.id, title: 'Geometrie Grundlagen',
    description: 'Einführung in Dreiecke und Vierecke',
    file_url: 'https://example.com/geometrie.pdf',
    file_type: 'application/pdf',
    created_by: teacher.id, created_at: now(),
  }
  save('handouts', [handout])

  const globalRoom: ChatRoom = { id: 'global', name: 'Alle', type: 'global', class_id: null }
  const classRoom: ChatRoom = { id: `class_${cls.id}`, name: `10b – Mathe`, type: 'class', class_id: cls.id }
  save('chat_rooms', [globalRoom, classRoom])

  const msg: ChatMessage = {
    id: uid(), room_id: 'global', sender_id: teacher.id,
    content: 'Willkommen bei SchoolWork! 🎉',
    created_at: now() - 3600,
  }
  save('chat_messages', [msg])
}

// ─── Auth ───────────────────────────────────────────────────────────────────

function register(name: string, role: Role): { user: User; token: string } {
  seedIfEmpty()
  const user: User = { id: uid(), name, role, created_at: now() }
  const users = load<User[]>('users', [])
  save('users', [...users, user])
  const token = uid()
  save(`session_${token}`, user)
  return { user, token }
}

function me(token: string): User {
  const user = load<User | null>(`session_${token}`, null)
  if (!user) throw new Error('Unauthorized')
  return user
}

// ─── Classes ────────────────────────────────────────────────────────────────

function getClasses(user: User): Class[] {
  const all = load<Class[]>('classes', [])
  if (user.role === 'admin') return all
  if (user.role === 'teacher') return all.filter(c => c.teacher_id === user.id)
  // student: classes they are member of
  return all.filter(c => {
    const members = load<string[]>(`class_members_${c.id}`, [])
    return members.includes(user.id)
  })
}

function createClass(user: User, data: Partial<Class>): Class {
  const classes = load<Class[]>('classes', [])
  const cls: Class = {
    id: uid(),
    name: data.name ?? '',
    subject: data.subject ?? '',
    teacher_id: user.id,
    color: data.color ?? '#007AFF',
    icon: data.icon ?? '📚',
    created_at: now(),
    student_count: 0,
  }
  save('classes', [...classes, cls])
  // auto-create class chat room
  const rooms = load<ChatRoom[]>('chat_rooms', [])
  save('chat_rooms', [...rooms, { id: `class_${cls.id}`, name: cls.name, type: 'class', class_id: cls.id }])
  return cls
}

function getClassDetail(id: string) {
  const classes = load<Class[]>('classes', [])
  const cls = classes.find(c => c.id === id)
  if (!cls) throw new Error('Not found')
  const memberIds = load<string[]>(`class_members_${id}`, [])
  const users = load<User[]>('users', [])
  const students = users.filter(u => memberIds.includes(u.id))
  const assignments = load<Assignment[]>('assignments', []).filter(a => a.class_id === id)
  return { ...cls, students, assignments }
}

function deleteClass(id: string) {
  const classes = load<Class[]>('classes', [])
  save('classes', classes.filter(c => c.id !== id))
}

function addStudent(classId: string, studentId: string) {
  const members = load<string[]>(`class_members_${classId}`, [])
  if (!members.includes(studentId)) {
    save(`class_members_${classId}`, [...members, studentId])
  }
  // update student_count
  const classes = load<Class[]>('classes', [])
  save('classes', classes.map(c =>
    c.id === classId ? { ...c, student_count: (c.student_count ?? 0) + 1 } : c
  ))
}

function removeStudent(classId: string, studentId: string) {
  const members = load<string[]>(`class_members_${classId}`, [])
  save(`class_members_${classId}`, members.filter(id => id !== studentId))
  const classes = load<Class[]>('classes', [])
  save('classes', classes.map(c =>
    c.id === classId ? { ...c, student_count: Math.max(0, (c.student_count ?? 1) - 1) } : c
  ))
}

// ─── Assignments ────────────────────────────────────────────────────────────

function getAssignments(user: User): Assignment[] {
  const all = load<Assignment[]>('assignments', [])
  if (user.role === 'admin') return all
  if (user.role === 'teacher') return all.filter(a => a.created_by === user.id)
  const myClasses = getClasses(user).map(c => c.id)
  return all.filter(a => myClasses.includes(a.class_id))
}

function createAssignment(user: User, data: Partial<Assignment>): Assignment {
  const all = load<Assignment[]>('assignments', [])
  const a: Assignment = {
    id: uid(),
    class_id: data.class_id ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    type: data.type ?? 'quiz',
    due_date: data.due_date ?? null,
    points: data.points ?? 100,
    created_by: user.id,
    created_at: now(),
  }
  save('assignments', [...all, a])
  return a
}

function deleteAssignment(id: string) {
  save('assignments', load<Assignment[]>('assignments', []).filter(a => a.id !== id))
}

function getSubmissions(assignmentId: string): Submission[] {
  const all = load<Submission[]>('submissions', [])
  const users = load<User[]>('users', [])
  return all
    .filter(s => s.assignment_id === assignmentId)
    .map(s => ({ ...s, student_name: users.find(u => u.id === s.student_id)?.name }))
}

function submitAssignment(user: User, assignmentId: string): Submission {
  const all = load<Submission[]>('submissions', [])
  const existing = all.find(s => s.assignment_id === assignmentId && s.student_id === user.id)
  if (existing) {
    const updated = all.map(s =>
      s.id === existing.id ? { ...s, status: 'turned_in' as const, submitted_at: now() } : s
    )
    save('submissions', updated)
    return { ...existing, status: 'turned_in', submitted_at: now() }
  }
  const sub: Submission = {
    id: uid(), assignment_id: assignmentId, student_id: user.id,
    status: 'turned_in', score: null, feedback: null,
    submitted_at: now(), updated_at: now(),
  }
  save('submissions', [...all, sub])
  return sub
}

function gradeSubmission(id: string, score: number, feedback: string): Submission {
  const all = load<Submission[]>('submissions', [])
  const updated = all.map(s =>
    s.id === id ? { ...s, status: 'graded' as const, score, feedback, updated_at: now() } : s
  )
  save('submissions', updated)
  return updated.find(s => s.id === id)!
}

// ─── Handouts ───────────────────────────────────────────────────────────────

function getHandouts(user: User): Handout[] {
  const all = load<Handout[]>('handouts', [])
  if (user.role === 'admin') return all
  if (user.role === 'teacher') return all.filter(h => h.created_by === user.id)
  const myClasses = getClasses(user).map(c => c.id)
  return all.filter(h => myClasses.includes(h.class_id))
}

function createHandout(user: User, data: Partial<Handout>): Handout {
  const all = load<Handout[]>('handouts', [])
  const h: Handout = {
    id: uid(), class_id: data.class_id ?? '',
    title: data.title ?? '', description: data.description ?? '',
    file_url: data.file_url ?? '', file_type: data.file_type ?? 'link',
    created_by: user.id, created_at: now(),
  }
  save('handouts', [...all, h])
  return h
}

function deleteHandout(id: string) {
  save('handouts', load<Handout[]>('handouts', []).filter(h => h.id !== id))
}

// ─── Progress ───────────────────────────────────────────────────────────────

function getProgress(classId: string) {
  const memberIds = load<string[]>(`class_members_${classId}`, [])
  const users = load<User[]>('users', [])
  const allSubs = load<Submission[]>('submissions', [])
  const classAssignments = load<Assignment[]>('assignments', []).filter(a => a.class_id === classId)

  return memberIds.map(sid => {
    const student = users.find(u => u.id === sid) ?? { id: sid, name: 'Unbekannt', role: 'student' as Role, created_at: 0 }
    const subs = allSubs.filter(s => s.student_id === sid && classAssignments.some(a => a.id === s.assignment_id))
    const graded = subs.filter(s => s.score !== null)
    const averageScore = graded.length > 0
      ? Math.round(graded.reduce((acc, s) => acc + (s.score ?? 0), 0) / graded.length)
      : 0
    const completedCount = subs.filter(s => s.status === 'turned_in' || s.status === 'graded').length
    return { student, submissions: subs, averageScore, completedCount }
  })
}

// ─── Users (Admin) ──────────────────────────────────────────────────────────

function getUsers(): User[] {
  return load<User[]>('users', [])
}

function deleteUser(id: string) {
  save('users', load<User[]>('users', []).filter(u => u.id !== id))
}

// ─── Chat ───────────────────────────────────────────────────────────────────

function getChatRooms(user: User): ChatRoom[] {
  const all = load<ChatRoom[]>('chat_rooms', [])
  const myClassIds = getClasses(user).map(c => `class_${c.id}`)
  return all.filter(r => r.type === 'global' || myClassIds.includes(r.id))
}

function getChatMessages(roomId: string): ChatMessage[] {
  const users = load<User[]>('users', [])
  return load<ChatMessage[]>('chat_messages', [])
    .filter(m => m.room_id === roomId)
    .slice(-50)
    .map(m => ({
      ...m,
      sender_name: users.find(u => u.id === m.sender_id)?.name ?? 'Unbekannt',
      sender_role: users.find(u => u.id === m.sender_id)?.role,
    }))
}

function sendChatMessage(user: User, roomId: string, content: string): ChatMessage {
  const msg: ChatMessage = {
    id: uid(), room_id: roomId, sender_id: user.id,
    content, created_at: now(),
  }
  const all = load<ChatMessage[]>('chat_messages', [])
  save('chat_messages', [...all, msg])
  return { ...msg, sender_name: user.name, sender_role: user.role }
}

// ─── Router ─────────────────────────────────────────────────────────────────

function getUser(token: string): User {
  return me(token)
}

export async function mockRequest<T>(
  method: string,
  path: string,
  body: unknown,
  token: string | null
): Promise<T> {
  // Simulate small network delay
  await new Promise(r => setTimeout(r, 80))

  seedIfEmpty()

  const user = token ? (() => { try { return getUser(token) } catch { return null } })() : null
  const segments = path.replace(/^\//, '').split('/')

  // POST /auth/register
  if (method === 'POST' && path === '/auth/register') {
    const { name, role } = body as { name: string; role: Role }
    return register(name, role) as T
  }

  // GET /auth/me
  if (method === 'GET' && path === '/auth/me') {
    if (!user) throw new Error('Unauthorized')
    return user as T
  }

  // GET /classes
  if (method === 'GET' && path === '/classes') {
    if (!user) throw new Error('Unauthorized')
    return getClasses(user) as T
  }

  // POST /classes
  if (method === 'POST' && path === '/classes') {
    if (!user) throw new Error('Unauthorized')
    return createClass(user, body as Partial<Class>) as T
  }

  // GET /classes/:id
  if (method === 'GET' && segments[0] === 'classes' && segments[1] && !segments[2]) {
    return getClassDetail(segments[1]) as T
  }

  // DELETE /classes/:id
  if (method === 'DELETE' && segments[0] === 'classes' && segments[1] && !segments[2]) {
    deleteClass(segments[1])
    return undefined as T
  }

  // POST /classes/:id/students
  if (method === 'POST' && segments[0] === 'classes' && segments[2] === 'students') {
    const { student_id } = body as { student_id: string }
    addStudent(segments[1]!, student_id)
    return undefined as T
  }

  // DELETE /classes/:id/students/:sid
  if (method === 'DELETE' && segments[0] === 'classes' && segments[2] === 'students' && segments[3]) {
    removeStudent(segments[1]!, segments[3])
    return undefined as T
  }

  // GET /classes/:id/progress
  if (method === 'GET' && segments[0] === 'classes' && segments[2] === 'progress') {
    return getProgress(segments[1]!) as T
  }

  // GET /assignments
  if (method === 'GET' && path === '/assignments') {
    if (!user) throw new Error('Unauthorized')
    return getAssignments(user) as T
  }

  // POST /assignments
  if (method === 'POST' && path === '/assignments') {
    if (!user) throw new Error('Unauthorized')
    return createAssignment(user, body as Partial<Assignment>) as T
  }

  // DELETE /assignments/:id
  if (method === 'DELETE' && segments[0] === 'assignments' && segments[1] && !segments[2]) {
    deleteAssignment(segments[1])
    return undefined as T
  }

  // GET /assignments/:id/submissions
  if (method === 'GET' && segments[0] === 'assignments' && segments[2] === 'submissions') {
    return getSubmissions(segments[1]!) as T
  }

  // POST /assignments/:id/submit
  if (method === 'POST' && segments[0] === 'assignments' && segments[2] === 'submit') {
    if (!user) throw new Error('Unauthorized')
    return submitAssignment(user, segments[1]!) as T
  }

  // PUT /submissions/:id
  if (method === 'PUT' && segments[0] === 'submissions' && segments[1]) {
    const { score, feedback } = body as { score: number; feedback: string }
    return gradeSubmission(segments[1], score, feedback) as T
  }

  // GET /handouts
  if (method === 'GET' && path === '/handouts') {
    if (!user) throw new Error('Unauthorized')
    return getHandouts(user) as T
  }

  // POST /handouts
  if (method === 'POST' && path === '/handouts') {
    if (!user) throw new Error('Unauthorized')
    return createHandout(user, body as Partial<Handout>) as T
  }

  // DELETE /handouts/:id
  if (method === 'DELETE' && segments[0] === 'handouts' && segments[1]) {
    deleteHandout(segments[1])
    return undefined as T
  }

  // GET /users
  if (method === 'GET' && path === '/users') {
    return getUsers() as T
  }

  // DELETE /users/:id
  if (method === 'DELETE' && segments[0] === 'users' && segments[1]) {
    deleteUser(segments[1])
    return undefined as T
  }

  // GET /chat/rooms
  if (method === 'GET' && path === '/chat/rooms') {
    if (!user) throw new Error('Unauthorized')
    return getChatRooms(user) as T
  }

  // GET /chat/rooms/:id/messages
  if (method === 'GET' && segments[0] === 'chat' && segments[1] === 'rooms' && segments[3] === 'messages') {
    return getChatMessages(segments[2]!) as T
  }

  // POST /chat/rooms/:id/messages (mock send)
  if (method === 'POST' && segments[0] === 'chat' && segments[1] === 'rooms' && segments[3] === 'messages') {
    if (!user) throw new Error('Unauthorized')
    const { content } = body as { content: string }
    return sendChatMessage(user, segments[2]!, content) as T
  }

  throw new Error(`Mock: unbekannte Route ${method} ${path}`)
}

export { sendChatMessage, getChatMessages }
