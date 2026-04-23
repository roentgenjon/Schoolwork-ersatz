import type { User, Class, Assignment, Submission, Handout, ChatMessage, ChatRoom } from '../types';

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUser(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getUserByName(db: D1Database, name: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE name = ?').bind(name).first<User>();
}

export async function getAllUsers(db: D1Database): Promise<User[]> {
  const result = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all<User>();
  return result.results;
}

export async function insertUser(db: D1Database, user: User): Promise<void> {
  await db
    .prepare('INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(user.id, user.name, user.role, user.created_at)
    .run();
}

export async function deleteUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

// ── Classes ──────────────────────────────────────────────────────────────────

export async function getClass(db: D1Database, id: string): Promise<Class | null> {
  return db.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first<Class>();
}

export async function getAllClasses(db: D1Database): Promise<Class[]> {
  const result = await db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all<Class>();
  return result.results;
}

export async function getClassesByTeacher(db: D1Database, teacherId: string): Promise<Class[]> {
  const result = await db
    .prepare('SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC')
    .bind(teacherId)
    .all<Class>();
  return result.results;
}

export async function getClassesByStudent(db: D1Database, studentId: string): Promise<Class[]> {
  const result = await db
    .prepare(
      `SELECT c.* FROM classes c
       INNER JOIN class_members cm ON cm.class_id = c.id
       WHERE cm.student_id = ?
       ORDER BY c.created_at DESC`
    )
    .bind(studentId)
    .all<Class>();
  return result.results;
}

export async function insertClass(db: D1Database, cls: Class): Promise<void> {
  await db
    .prepare(
      'INSERT INTO classes (id, name, teacher_id, subject, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(cls.id, cls.name, cls.teacher_id, cls.subject, cls.color, cls.icon, cls.created_at)
    .run();
}

export async function updateClass(
  db: D1Database,
  id: string,
  fields: Partial<Pick<Class, 'name' | 'subject' | 'color' | 'icon'>>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.subject !== undefined) { sets.push('subject = ?'); values.push(fields.subject); }
  if (fields.color !== undefined) { sets.push('color = ?'); values.push(fields.color); }
  if (fields.icon !== undefined) { sets.push('icon = ?'); values.push(fields.icon); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE classes SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteClass(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();
}

// ── Class Members ─────────────────────────────────────────────────────────────

export async function getClassStudents(db: D1Database, classId: string): Promise<User[]> {
  const result = await db
    .prepare(
      `SELECT u.* FROM users u
       INNER JOIN class_members cm ON cm.student_id = u.id
       WHERE cm.class_id = ?`
    )
    .bind(classId)
    .all<User>();
  return result.results;
}

export async function isClassMember(
  db: D1Database,
  classId: string,
  studentId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM class_members WHERE class_id = ? AND student_id = ?')
    .bind(classId, studentId)
    .first();
  return row !== null;
}

export async function addClassMember(
  db: D1Database,
  classId: string,
  studentId: string
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)')
    .bind(classId, studentId)
    .run();
}

export async function removeClassMember(
  db: D1Database,
  classId: string,
  studentId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM class_members WHERE class_id = ? AND student_id = ?')
    .bind(classId, studentId)
    .run();
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function getAssignment(db: D1Database, id: string): Promise<Assignment | null> {
  return db.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first<Assignment>();
}

export async function getAssignmentsByClass(
  db: D1Database,
  classId: string
): Promise<Assignment[]> {
  const result = await db
    .prepare('SELECT * FROM assignments WHERE class_id = ? ORDER BY created_at DESC')
    .bind(classId)
    .all<Assignment>();
  return result.results;
}

export async function getAssignmentsForTeacher(
  db: D1Database,
  teacherId: string
): Promise<Assignment[]> {
  const result = await db
    .prepare(
      `SELECT a.* FROM assignments a
       INNER JOIN classes c ON c.id = a.class_id
       WHERE c.teacher_id = ?
       ORDER BY a.created_at DESC`
    )
    .bind(teacherId)
    .all<Assignment>();
  return result.results;
}

export async function getAssignmentsForStudent(
  db: D1Database,
  studentId: string
): Promise<Assignment[]> {
  const result = await db
    .prepare(
      `SELECT a.* FROM assignments a
       INNER JOIN class_members cm ON cm.class_id = a.class_id
       WHERE cm.student_id = ?
       ORDER BY a.created_at DESC`
    )
    .bind(studentId)
    .all<Assignment>();
  return result.results;
}

export async function getAllAssignments(db: D1Database): Promise<Assignment[]> {
  const result = await db
    .prepare('SELECT * FROM assignments ORDER BY created_at DESC')
    .all<Assignment>();
  return result.results;
}

export async function insertAssignment(db: D1Database, a: Assignment): Promise<void> {
  await db
    .prepare(
      `INSERT INTO assignments (id, class_id, title, description, type, due_date, points, created_by, created_at, file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(a.id, a.class_id, a.title, a.description, a.type, a.due_date, a.points, a.created_by, a.created_at, a.file_url ?? null)
    .run();
}

export async function updateAssignment(
  db: D1Database,
  id: string,
  fields: Partial<Pick<Assignment, 'title' | 'description' | 'type' | 'due_date' | 'points'>>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }
  if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
  if (fields.type !== undefined) { sets.push('type = ?'); values.push(fields.type); }
  if (fields.due_date !== undefined) { sets.push('due_date = ?'); values.push(fields.due_date); }
  if (fields.points !== undefined) { sets.push('points = ?'); values.push(fields.points); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE assignments SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteAssignment(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM assignments WHERE id = ?').bind(id).run();
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function getSubmission(db: D1Database, id: string): Promise<Submission | null> {
  return db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first<Submission>();
}

export async function getSubmissionsByAssignment(
  db: D1Database,
  assignmentId: string
): Promise<Submission[]> {
  const result = await db
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? ORDER BY updated_at DESC')
    .bind(assignmentId)
    .all<Submission>();
  return result.results;
}

export async function getSubmissionsByStudent(
  db: D1Database,
  studentId: string
): Promise<Submission[]> {
  const result = await db
    .prepare('SELECT * FROM submissions WHERE student_id = ? ORDER BY updated_at DESC')
    .bind(studentId)
    .all<Submission>();
  return result.results;
}

export async function getSubmissionsForClass(
  db: D1Database,
  classId: string
): Promise<Submission[]> {
  const result = await db
    .prepare(
      `SELECT s.* FROM submissions s
       INNER JOIN assignments a ON a.id = s.assignment_id
       WHERE a.class_id = ?`
    )
    .bind(classId)
    .all<Submission>();
  return result.results;
}

export async function getStudentSubmissionForAssignment(
  db: D1Database,
  assignmentId: string,
  studentId: string
): Promise<Submission | null> {
  return db
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .bind(assignmentId, studentId)
    .first<Submission>();
}

export async function upsertSubmission(db: D1Database, s: Submission): Promise<void> {
  await db
    .prepare(
      `INSERT INTO submissions (id, assignment_id, student_id, status, score, feedback, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         score = excluded.score,
         feedback = excluded.feedback,
         submitted_at = excluded.submitted_at,
         updated_at = excluded.updated_at`
    )
    .bind(s.id, s.assignment_id, s.student_id, s.status, s.score, s.feedback, s.submitted_at, s.updated_at)
    .run();
}

export async function updateSubmission(
  db: D1Database,
  id: string,
  fields: Partial<Pick<Submission, 'status' | 'score' | 'feedback' | 'submitted_at' | 'updated_at'>>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.status !== undefined) { sets.push('status = ?'); values.push(fields.status); }
  if (fields.score !== undefined) { sets.push('score = ?'); values.push(fields.score); }
  if (fields.feedback !== undefined) { sets.push('feedback = ?'); values.push(fields.feedback); }
  if (fields.submitted_at !== undefined) { sets.push('submitted_at = ?'); values.push(fields.submitted_at); }
  if (fields.updated_at !== undefined) { sets.push('updated_at = ?'); values.push(fields.updated_at); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE submissions SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

// ── Handouts ──────────────────────────────────────────────────────────────────

export async function getHandout(db: D1Database, id: string): Promise<Handout | null> {
  return db.prepare('SELECT * FROM handouts WHERE id = ?').bind(id).first<Handout>();
}

export async function getHandoutsByClass(db: D1Database, classId: string): Promise<Handout[]> {
  const result = await db
    .prepare('SELECT * FROM handouts WHERE class_id = ? ORDER BY created_at DESC')
    .bind(classId)
    .all<Handout>();
  return result.results;
}

export async function getHandoutsForTeacher(db: D1Database, teacherId: string): Promise<Handout[]> {
  const result = await db
    .prepare(
      `SELECT h.* FROM handouts h
       INNER JOIN classes c ON c.id = h.class_id
       WHERE c.teacher_id = ?
       ORDER BY h.created_at DESC`
    )
    .bind(teacherId)
    .all<Handout>();
  return result.results;
}

export async function getHandoutsForStudent(db: D1Database, studentId: string): Promise<Handout[]> {
  const result = await db
    .prepare(
      `SELECT h.* FROM handouts h
       INNER JOIN class_members cm ON cm.class_id = h.class_id
       WHERE cm.student_id = ?
       ORDER BY h.created_at DESC`
    )
    .bind(studentId)
    .all<Handout>();
  return result.results;
}

export async function getAllHandouts(db: D1Database): Promise<Handout[]> {
  const result = await db.prepare('SELECT * FROM handouts ORDER BY created_at DESC').all<Handout>();
  return result.results;
}

export async function insertHandout(db: D1Database, h: Handout): Promise<void> {
  await db
    .prepare(
      `INSERT INTO handouts (id, class_id, title, description, file_url, file_type, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(h.id, h.class_id, h.title, h.description, h.file_url, h.file_type, h.created_by, h.created_at)
    .run();
}

export async function deleteHandout(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM handouts WHERE id = ?').bind(id).run();
}

export async function updateHandout(
  db: D1Database,
  id: string,
  fields: Partial<Pick<Handout, 'title' | 'description' | 'class_id'>>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.title !== undefined) { sets.push('title = ?'); values.push(fields.title); }
  if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
  if (fields.class_id !== undefined) { sets.push('class_id = ?'); values.push(fields.class_id); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE handouts SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function getChatRoom(db: D1Database, id: string): Promise<ChatRoom | null> {
  return db.prepare('SELECT * FROM chat_rooms WHERE id = ?').bind(id).first<ChatRoom>();
}

export async function getAllChatRooms(db: D1Database): Promise<ChatRoom[]> {
  const result = await db.prepare('SELECT * FROM chat_rooms').all<ChatRoom>();
  return result.results;
}

export async function getChatRoomsForUser(
  db: D1Database,
  userId: string,
  role: string
): Promise<ChatRoom[]> {
  const result = await db
    .prepare(
      `SELECT r.* FROM chat_rooms r WHERE r.type = 'global'
       UNION
       SELECT r.* FROM chat_rooms r
       INNER JOIN class_members cm ON cm.class_id = r.class_id
       WHERE r.type = 'class' AND cm.student_id = ?
       UNION
       SELECT r.* FROM chat_rooms r
       INNER JOIN classes c ON c.id = r.class_id
       WHERE r.type = 'class' AND c.teacher_id = ?
       UNION
       SELECT r.* FROM chat_rooms r
       WHERE r.type = 'dm' AND r.id LIKE '%' || ? || '%'
       UNION
       SELECT r.* FROM chat_rooms r
       INNER JOIN chat_room_members crm ON crm.room_id = r.id
       WHERE r.type = 'group' AND crm.user_id = ?`
    )
    .bind(userId, userId, userId, userId)
    .all<ChatRoom>();
  return result.results;
}

export async function getChatRoomsForStudent(db: D1Database, studentId: string): Promise<ChatRoom[]> {
  return getChatRoomsForUser(db, studentId, 'student');
}

export async function getChatRoomsForTeacher(db: D1Database, teacherId: string): Promise<ChatRoom[]> {
  return getChatRoomsForUser(db, teacherId, 'teacher');
}

export async function insertChatRoomMember(db: D1Database, roomId: string, userId: string): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)')
    .bind(roomId, userId)
    .run();
}

export async function getChatRoomMemberIds(db: D1Database, roomId: string): Promise<string[]> {
  const result = await db
    .prepare('SELECT user_id FROM chat_room_members WHERE room_id = ?')
    .bind(roomId)
    .all<{ user_id: string }>();
  return result.results.map(r => r.user_id);
}

export async function insertChatRoom(db: D1Database, room: ChatRoom): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO chat_rooms (id, name, type, class_id) VALUES (?, ?, ?, ?)')
    .bind(room.id, room.name, room.type, room.class_id)
    .run();
}

export async function getRecentMessages(
  db: D1Database,
  roomId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const result = await db
    .prepare(
      `SELECT * FROM (
         SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?
       ) ORDER BY created_at ASC`
    )
    .bind(roomId, limit)
    .all<ChatMessage>();
  return result.results;
}

export async function insertChatMessage(db: D1Database, msg: ChatMessage): Promise<void> {
  await db
    .prepare(
      'INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(msg.id, msg.room_id, msg.sender_id, msg.content, msg.created_at)
    .run();
}
