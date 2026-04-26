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

async function getAttachments(env: Env, assignmentId: string) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM assignment_attachments WHERE assignment_id = ? ORDER BY created_at ASC'
  ).bind(assignmentId).all();
  return results;
}

// GET /api/assignments
export async function listAssignments(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const url = new URL(request.url);
  const classId = url.searchParams.get('class_id');

  let rows;
  if (user!.role === 'admin') {
    const q = classId
      ? 'SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.class_id = ? ORDER BY a.created_at DESC'
      : 'SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id ORDER BY a.created_at DESC';
    const { results } = classId
      ? await env.DB.prepare(q).bind(classId).all()
      : await env.DB.prepare(q).all();
    rows = results;
  } else if (user!.role === 'teacher') {
    const q = classId
      ? 'SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.class_id = ? AND c.teacher_id = ? ORDER BY a.created_at DESC'
      : 'SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id WHERE c.teacher_id = ? ORDER BY a.created_at DESC';
    const { results } = classId
      ? await env.DB.prepare(q).bind(classId, user!.id).all()
      : await env.DB.prepare(q).bind(user!.id).all();
    rows = results;
  } else {
    const q = classId
      ? `SELECT a.*, c.name as class_name FROM assignments a
         JOIN classes c ON a.class_id = c.id
         JOIN class_members cm ON cm.class_id = a.class_id
         WHERE cm.student_id = ? AND a.class_id = ? ORDER BY a.created_at DESC`
      : `SELECT a.*, c.name as class_name FROM assignments a
         JOIN classes c ON a.class_id = c.id
         JOIN class_members cm ON cm.class_id = a.class_id
         WHERE cm.student_id = ? ORDER BY a.created_at DESC`;
    const { results } = classId
      ? await env.DB.prepare(q).bind(user!.id, classId).all()
      : await env.DB.prepare(q).bind(user!.id).all();
    rows = results;
  }

  // Attach attachments to each assignment
  const assignments = await Promise.all(
    (rows as any[]).map(async (a) => ({
      ...a,
      attachments: await getAttachments(env, a.id),
    }))
  );

  return json(assignments);
}

// POST /api/assignments
export async function createAssignment(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const body = await request.json<{
    class_id: string;
    title: string;
    description?: string;
    type: string;
    due_date?: number;
    points?: number;
    attachments?: { type: string; url: string; name: string }[];
  }>();

  if (!body.class_id || !body.title?.trim() || !body.type) {
    return json({ error: 'class_id, title and type required' }, 400);
  }

  const validTypes = ['quiz', 'handout', 'activity', 'book_report', 'collaboration'];
  if (!validTypes.includes(body.type)) return json({ error: 'Invalid type' }, 400);

  const id = nanoid();
  await env.DB.prepare(
    'INSERT INTO assignments (id, class_id, title, description, type, due_date, points, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, body.class_id, body.title.trim(), body.description ?? null, body.type, body.due_date ?? null, body.points ?? 100, user!.id).run();

  if (body.attachments?.length) {
    await Promise.all(
      body.attachments.map((att) =>
        env.DB.prepare(
          "INSERT INTO assignment_attachments (id, assignment_id, type, url, name) VALUES (?, ?, ?, ?, ?)"
        ).bind(nanoid(), id, att.type, att.url, att.name).run()
      )
    );
  }

  const row = await env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first();
  const attachments = await getAttachments(env, id);
  return json({ ...row, attachments }, 201);
}

// GET /api/assignments/:id
export async function getAssignment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const row = await env.DB.prepare(
    'SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.id = ?'
  ).bind(assignmentId).first();
  if (!row) return json({ error: 'Not found' }, 404);

  const attachments = await getAttachments(env, assignmentId);

  let submissions = [];
  if (user!.role !== 'student') {
    const { results } = await env.DB.prepare(
      'SELECT s.*, u.name as student_name FROM submissions s JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ?'
    ).bind(assignmentId).all();
    submissions = results;
  } else {
    const sub = await env.DB.prepare(
      'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?'
    ).bind(assignmentId, user!.id).first();
    if (sub) submissions = [sub];
  }

  return json({ ...row, attachments, submissions });
}

// PUT /api/assignments/:id
export async function updateAssignment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const row = await env.DB.prepare(
    'SELECT a.*, c.teacher_id FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.id = ?'
  ).bind(assignmentId).first<{ teacher_id: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  if (user!.role === 'teacher' && row.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  const body = await request.json<{
    title?: string; description?: string; type?: string; due_date?: number; points?: number;
  }>();

  await env.DB.prepare(
    'UPDATE assignments SET title = COALESCE(?, title), description = COALESCE(?, description), type = COALESCE(?, type), due_date = COALESCE(?, due_date), points = COALESCE(?, points) WHERE id = ?'
  ).bind(body.title ?? null, body.description ?? null, body.type ?? null, body.due_date ?? null, body.points ?? null, assignmentId).run();

  return json({ ok: true });
}

// DELETE /api/assignments/:id
export async function deleteAssignment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const row = await env.DB.prepare(
    'SELECT a.id, c.teacher_id FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.id = ?'
  ).bind(assignmentId).first<{ teacher_id: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  if (user!.role === 'teacher' && row.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(assignmentId).run();
  return json({ ok: true });
}

// POST /api/assignments/:id/attachments
export async function addAttachment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const body = await request.json<{ type: string; url: string; name: string }>();
  if (!body.type || !body.url || !body.name) return json({ error: 'type, url and name required' }, 400);
  if (!['file', 'link'].includes(body.type)) return json({ error: 'Invalid type' }, 400);

  const id = nanoid();
  await env.DB.prepare(
    'INSERT INTO assignment_attachments (id, assignment_id, type, url, name) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, assignmentId, body.type, body.url, body.name).run();

  return json({ id, assignment_id: assignmentId, ...body }, 201);
}

// DELETE /api/assignments/:id/attachments/:att_id
export async function deleteAttachment(
  request: Request, env: Env, assignmentId: string, attId: string
): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  await env.DB.prepare(
    'DELETE FROM assignment_attachments WHERE id = ? AND assignment_id = ?'
  ).bind(attId, assignmentId).run();

  return json({ ok: true });
}

// GET /api/assignments/:id/submissions
export async function listSubmissions(request: Request, env: Env, assignmentId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const { results } = await env.DB.prepare(
    'SELECT s.*, u.name as student_name FROM submissions s JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ?'
  ).bind(assignmentId).all();

  return json(results);
}

// PUT /api/submissions/:id
export async function updateSubmission(request: Request, env: Env, submissionId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const sub = await env.DB.prepare(
    'SELECT * FROM submissions WHERE id = ?'
  ).bind(submissionId).first<{ student_id: string; status: string }>();
  if (!sub) return json({ error: 'Not found' }, 404);

  const body = await request.json<{ status?: string; score?: number; feedback?: string }>();

  if (user!.role === 'student') {
    if (sub.student_id !== user!.id) return json({ error: 'Forbidden' }, 403);
    const allowed = ['in_progress', 'turned_in'];
    if (body.status && !allowed.includes(body.status)) return json({ error: 'Invalid status transition' }, 400);
    await env.DB.prepare(
      'UPDATE submissions SET status = COALESCE(?, status), submitted_at = CASE WHEN ? = \'turned_in\' THEN unixepoch() ELSE submitted_at END, updated_at = unixepoch() WHERE id = ?'
    ).bind(body.status ?? null, body.status ?? null, submissionId).run();
  } else {
    await env.DB.prepare(
      'UPDATE submissions SET status = COALESCE(?, status), score = COALESCE(?, score), feedback = COALESCE(?, feedback), updated_at = unixepoch() WHERE id = ?'
    ).bind(body.status ?? null, body.score ?? null, body.feedback ?? null, submissionId).run();
  }

  return json({ ok: true });
}

// POST /api/submissions  (student starts/submits)
export async function upsertSubmission(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  if (user!.role !== 'student') return json({ error: 'Students only' }, 403);

  const body = await request.json<{ assignment_id: string; status: string }>();
  if (!body.assignment_id || !body.status) return json({ error: 'assignment_id and status required' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?'
  ).bind(body.assignment_id, user!.id).first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      'UPDATE submissions SET status = ?, submitted_at = CASE WHEN ? = \'turned_in\' THEN unixepoch() ELSE submitted_at END, updated_at = unixepoch() WHERE id = ?'
    ).bind(body.status, body.status, existing.id).run();
    return json({ id: existing.id, status: body.status });
  } else {
    const id = nanoid();
    await env.DB.prepare(
      'INSERT INTO submissions (id, assignment_id, student_id, status) VALUES (?, ?, ?, ?)'
    ).bind(id, body.assignment_id, user!.id, body.status).run();
    return json({ id, status: body.status }, 201);
  }
}
