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

// GET /api/handouts
export async function listHandouts(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const url = new URL(request.url);
  const classId = url.searchParams.get('class_id');

  let rows;
  if (user!.role === 'admin') {
    const q = classId
      ? 'SELECT h.*, c.name as class_name FROM handouts h JOIN classes c ON h.class_id = c.id WHERE h.class_id = ? ORDER BY h.created_at DESC'
      : 'SELECT h.*, c.name as class_name FROM handouts h JOIN classes c ON h.class_id = c.id ORDER BY h.created_at DESC';
    const { results } = classId ? await env.DB.prepare(q).bind(classId).all() : await env.DB.prepare(q).all();
    rows = results;
  } else if (user!.role === 'teacher') {
    const q = classId
      ? 'SELECT h.*, c.name as class_name FROM handouts h JOIN classes c ON h.class_id = c.id WHERE h.class_id = ? AND c.teacher_id = ? ORDER BY h.created_at DESC'
      : 'SELECT h.*, c.name as class_name FROM handouts h JOIN classes c ON h.class_id = c.id WHERE c.teacher_id = ? ORDER BY h.created_at DESC';
    const { results } = classId
      ? await env.DB.prepare(q).bind(classId, user!.id).all()
      : await env.DB.prepare(q).bind(user!.id).all();
    rows = results;
  } else {
    const q = classId
      ? `SELECT h.*, c.name as class_name FROM handouts h
         JOIN classes c ON h.class_id = c.id
         JOIN class_members cm ON cm.class_id = h.class_id
         WHERE cm.student_id = ? AND h.class_id = ? ORDER BY h.created_at DESC`
      : `SELECT h.*, c.name as class_name FROM handouts h
         JOIN classes c ON h.class_id = c.id
         JOIN class_members cm ON cm.class_id = h.class_id
         WHERE cm.student_id = ? ORDER BY h.created_at DESC`;
    const { results } = classId
      ? await env.DB.prepare(q).bind(user!.id, classId).all()
      : await env.DB.prepare(q).bind(user!.id).all();
    rows = results;
  }

  return json(rows);
}

// POST /api/handouts
export async function createHandout(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const body = await request.json<{ class_id: string; title: string; description?: string; file_url?: string; file_type?: string }>();
  if (!body.class_id || !body.title?.trim()) return json({ error: 'class_id and title required' }, 400);

  const id = nanoid();
  await env.DB.prepare(
    'INSERT INTO handouts (id, class_id, title, description, file_url, file_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, body.class_id, body.title.trim(), body.description ?? null, body.file_url ?? null, body.file_type ?? null, user!.id).run();

  const row = await env.DB.prepare('SELECT * FROM handouts WHERE id = ?').bind(id).first();
  return json(row, 201);
}

// DELETE /api/handouts/:id
export async function deleteHandout(request: Request, env: Env, handoutId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const row = await env.DB.prepare(
    'SELECT h.id, c.teacher_id FROM handouts h JOIN classes c ON h.class_id = c.id WHERE h.id = ?'
  ).bind(handoutId).first<{ teacher_id: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  if (user!.role === 'teacher' && row.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  await env.DB.prepare('DELETE FROM handouts WHERE id = ?').bind(handoutId).run();
  return json({ ok: true });
}
