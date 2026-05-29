import type { Env } from '../types';
import { authenticate, requireAuth, requireRole } from '../middleware/auth';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function nanoid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// GET /api/classes
export async function listClasses(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  let classes;
  if (user!.role === 'admin') {
    const { results } = await env.DB.prepare(
      'SELECT c.*, u.name as teacher_name FROM classes c LEFT JOIN users u ON c.teacher_id = u.id ORDER BY c.created_at DESC'
    ).all();
    classes = results;
  } else if (user!.role === 'teacher') {
    const { results } = await env.DB.prepare(
      'SELECT c.*, u.name as teacher_name FROM classes c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.teacher_id = ? ORDER BY c.created_at DESC'
    ).bind(user!.id).all();
    classes = results;
  } else {
    const { results } = await env.DB.prepare(`
      SELECT c.*, u.name as teacher_name FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      JOIN class_members cm ON cm.class_id = c.id
      WHERE cm.student_id = ? ORDER BY c.created_at DESC
    `).bind(user!.id).all();
    classes = results;
  }

  return json(classes);
}

// POST /api/classes
export async function createClass(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const body = await request.json<{ name: string; subject?: string; color?: string; icon?: string }>();
  if (!body.name?.trim()) return json({ error: 'Name required' }, 400);

  const id = nanoid();
  const teacherId = user!.role === 'teacher' ? user!.id : null;

  await env.DB.prepare(
    'INSERT INTO classes (id, name, teacher_id, subject, color, icon) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.name.trim(), teacherId, body.subject ?? null, body.color ?? '#007AFF', body.icon ?? '📚').run();

  // Create class chat room
  await env.DB.prepare(
    "INSERT OR IGNORE INTO chat_rooms (id, name, type, class_id) VALUES (?, ?, 'class', ?)"
  ).bind(`class_${id}`, body.name.trim(), id).run();

  const row = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  return json(row, 201);
}

// GET /api/classes/:id
export async function getClass(request: Request, env: Env, classId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const cls = await env.DB.prepare(
    'SELECT c.*, u.name as teacher_name FROM classes c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = ?'
  ).bind(classId).first();
  if (!cls) return json({ error: 'Not found' }, 404);

  const { results: students } = await env.DB.prepare(`
    SELECT u.id, u.name, u.role FROM users u
    JOIN class_members cm ON cm.student_id = u.id
    WHERE cm.class_id = ?
    ORDER BY u.name
  `).bind(classId).all();

  const { results: assignments } = await env.DB.prepare(
    'SELECT * FROM assignments WHERE class_id = ? ORDER BY created_at DESC'
  ).bind(classId).all();

  return json({ ...cls, students, assignments });
}

// PUT /api/classes/:id
export async function updateClass(request: Request, env: Env, classId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const cls = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(classId).first<{ teacher_id: string }>();
  if (!cls) return json({ error: 'Not found' }, 404);

  if (user!.role === 'teacher' && cls.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  const body = await request.json<{ name?: string; subject?: string; color?: string; icon?: string }>();
  await env.DB.prepare(
    'UPDATE classes SET name = COALESCE(?, name), subject = COALESCE(?, subject), color = COALESCE(?, color), icon = COALESCE(?, icon) WHERE id = ?'
  ).bind(body.name ?? null, body.subject ?? null, body.color ?? null, body.icon ?? null, classId).run();

  return json({ ok: true });
}

// DELETE /api/classes/:id
export async function deleteClass(request: Request, env: Env, classId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const cls = await env.DB.prepare('SELECT teacher_id FROM classes WHERE id = ?').bind(classId).first<{ teacher_id: string }>();
  if (!cls) return json({ error: 'Not found' }, 404);
  if (user!.role === 'teacher' && cls.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  // Remove class chat room and its messages
  await env.DB.prepare('DELETE FROM chat_messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE class_id = ?)').bind(classId).run();
  await env.DB.prepare('DELETE FROM chat_room_members WHERE room_id IN (SELECT id FROM chat_rooms WHERE class_id = ?)').bind(classId).run();
  await env.DB.prepare('DELETE FROM chat_rooms WHERE class_id = ?').bind(classId).run();

  await env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(classId).run();
  return json({ ok: true });
}

// POST /api/classes/:id/students
export async function addStudent(request: Request, env: Env, classId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const body = await request.json<{ student_id: string }>();
  if (!body.student_id) return json({ error: 'student_id required' }, 400);

  await env.DB.prepare(
    'INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)'
  ).bind(classId, body.student_id).run();

  return json({ ok: true });
}

// DELETE /api/classes/:id/students/:student_id
export async function removeStudent(
  request: Request, env: Env, classId: string, studentId: string
): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  await env.DB.prepare(
    'DELETE FROM class_members WHERE class_id = ? AND student_id = ?'
  ).bind(classId, studentId).run();

  return json({ ok: true });
}
