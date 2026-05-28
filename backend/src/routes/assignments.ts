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

async function getAttachmentsMeta(env: Env, assignmentId: string) {
  const { results } = await env.DB.prepare(
    'SELECT id, assignment_id, type, url, name, mime_type, r2_key FROM assignment_attachments WHERE assignment_id = ? ORDER BY created_at ASC'
  ).bind(assignmentId).all();
  return results;
}

async function getAttachmentsWithData(env: Env, assignmentId: string) {
  const { results } = await env.DB.prepare(
    'SELECT id, assignment_id, type, url, name, mime_type, r2_key FROM assignment_attachments WHERE assignment_id = ? ORDER BY created_at ASC'
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

  const assignments = await Promise.all(
    (rows as any[]).map(async (a) => ({
      ...a,
      attachments: await getAttachmentsMeta(env, a.id),
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
    attachments?: { type: string; url?: string; name: string; r2_key?: string; data?: string; mime_type?: string }[];
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
      body.attachments.map(async (att) => {
        let r2Key = att.r2_key ?? null;
        if (att.type === 'file' && !r2Key && att.data && att.mime_type) {
          const bytes = Uint8Array.from(atob(att.data), (c) => c.charCodeAt(0));
          r2Key = `${nanoid()}-${att.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await env.FILES.put(r2Key, bytes, { httpMetadata: { contentType: att.mime_type } });
        }
        return env.DB.prepare(
          'INSERT INTO assignment_attachments (id, assignment_id, type, url, name, mime_type, r2_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(nanoid(), id, att.type, att.url ?? null, att.name, att.mime_type ?? null, r2Key).run();
      })
    );
  }

  const row = await env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first();
  const attachments = await getAttachmentsMeta(env, id);
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

  const attachments = await getAttachmentsWithData(env, assignmentId);

  let submissions: any[] = [];
  if (user!.role !== 'student') {
    const { results } = await env.DB.prepare(
      'SELECT s.*, u.name as student_name FROM submissions s JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ? ORDER BY s.updated_at DESC'
    ).bind(assignmentId).all();

    submissions = await Promise.all(
      (results as any[]).map(async (sub) => {
        const { results: files } = await env.DB.prepare(
          'SELECT id, submission_id, name, mime_type, size, r2_key, created_at FROM submission_files WHERE submission_id = ? ORDER BY created_at ASC'
        ).bind(sub.id).all();
        return { ...sub, files };
      })
    );
  } else {
    const sub = await env.DB.prepare(
      'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?'
    ).bind(assignmentId, user!.id).first<any>();
    if (sub) {
      const { results: files } = await env.DB.prepare(
        'SELECT id, submission_id, name, mime_type, size, r2_key, created_at FROM submission_files WHERE submission_id = ? ORDER BY created_at ASC'
      ).bind(sub.id).all();
      submissions = [{ ...sub, files }];
    }
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

  const body = await request.json<{ type: string; url?: string; name: string; r2_key?: string; data?: string; mime_type?: string }>();
  if (!body.type || !body.name) return json({ error: 'type and name required' }, 400);
  if (body.type === 'link' && !body.url) return json({ error: 'url required for link' }, 400);
  if (body.type === 'file' && !body.r2_key && !body.data) return json({ error: 'r2_key or data required for file' }, 400);
  if (!['file', 'link'].includes(body.type)) return json({ error: 'Invalid type' }, 400);

  let r2Key: string | null = body.r2_key ?? null;

  // Legacy: if data is provided instead of r2_key, upload to R2
  if (body.type === 'file' && !r2Key && body.data && body.mime_type) {
    const bytes = Uint8Array.from(atob(body.data), (c) => c.charCodeAt(0));
    r2Key = `${nanoid()}-${body.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await env.FILES.put(r2Key, bytes, { httpMetadata: { contentType: body.mime_type } });
  }

  const id = nanoid();
  await env.DB.prepare(
    'INSERT INTO assignment_attachments (id, assignment_id, type, url, name, mime_type, r2_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, assignmentId, body.type, body.url ?? null, body.name, body.mime_type ?? null, r2Key).run();

  return json({ id, assignment_id: assignmentId, type: body.type, url: body.url ?? null, name: body.name, r2_key: r2Key }, 201);
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

  const body = await request.json<{ status?: string; score?: number; feedback?: string; content?: string }>();

  if (user!.role === 'student') {
    if (sub.student_id !== user!.id) return json({ error: 'Forbidden' }, 403);
    const allowed = ['in_progress', 'turned_in'];
    if (body.status && !allowed.includes(body.status)) return json({ error: 'Invalid status transition' }, 400);
    await env.DB.prepare(
      `UPDATE submissions SET
        status = COALESCE(?, status),
        content = COALESCE(?, content),
        submitted_at = CASE WHEN ? = 'turned_in' THEN unixepoch() ELSE submitted_at END,
        updated_at = unixepoch()
       WHERE id = ?`
    ).bind(body.status ?? null, body.content ?? null, body.status ?? null, submissionId).run();
  } else {
    await env.DB.prepare(
      `UPDATE submissions SET
        status = COALESCE(?, status),
        score = COALESCE(?, score),
        feedback = COALESCE(?, feedback),
        updated_at = unixepoch()
       WHERE id = ?`
    ).bind(body.status ?? null, body.score ?? null, body.feedback ?? null, submissionId).run();
  }

  return json({ ok: true });
}

// POST /api/submissions  (student upsert)
export async function upsertSubmission(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  if (user!.role !== 'student') return json({ error: 'Students only' }, 403);

  const body = await request.json<{ assignment_id: string; status: string; content?: string }>();
  if (!body.assignment_id || !body.status) return json({ error: 'assignment_id and status required' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?'
  ).bind(body.assignment_id, user!.id).first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE submissions SET
        status = ?,
        content = COALESCE(?, content),
        submitted_at = CASE WHEN ? = 'turned_in' THEN unixepoch() ELSE submitted_at END,
        updated_at = unixepoch()
       WHERE id = ?`
    ).bind(body.status, body.content ?? null, body.status, existing.id).run();
    return json({ id: existing.id, status: body.status });
  } else {
    const id = nanoid();
    await env.DB.prepare(
      'INSERT INTO submissions (id, assignment_id, student_id, status, content) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, body.assignment_id, user!.id, body.status, body.content ?? null).run();
    return json({ id, status: body.status }, 201);
  }
}

// GET /api/submissions/:id/files
export async function listSubmissionFiles(request: Request, env: Env, submissionId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const sub = await env.DB.prepare('SELECT student_id FROM submissions WHERE id = ?')
    .bind(submissionId).first<{ student_id: string }>();
  if (!sub) return json({ error: 'Not found' }, 404);
  if (user!.role === 'student' && sub.student_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  const { results } = await env.DB.prepare(
    'SELECT id, submission_id, name, mime_type, size, data, created_at FROM submission_files WHERE submission_id = ? ORDER BY created_at ASC'
  ).bind(submissionId).all();

  return json(results);
}

// POST /api/submissions/:id/files
export async function uploadSubmissionFile(request: Request, env: Env, submissionId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const sub = await env.DB.prepare('SELECT student_id FROM submissions WHERE id = ?')
    .bind(submissionId).first<{ student_id: string }>();
  if (!sub) return json({ error: 'Not found' }, 404);
  if (user!.role === 'student' && sub.student_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  const body = await request.json<{ name: string; mime_type: string; r2_key?: string; data?: string; size?: number }>();
  if (!body.name || !body.mime_type) return json({ error: 'name, mime_type required' }, 400);
  if (!body.r2_key && !body.data) return json({ error: 'r2_key or data required' }, 400);

  let r2Key = body.r2_key ?? null;

  // Legacy: if data provided, upload to R2
  if (!r2Key && body.data) {
    if (body.data.length > 7_000_000) return json({ error: 'Datei zu groß (max. 5 MB)' }, 413);
    const bytes = Uint8Array.from(atob(body.data), (c) => c.charCodeAt(0));
    r2Key = `${nanoid()}-${body.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await env.FILES.put(r2Key, bytes, { httpMetadata: { contentType: body.mime_type } });
  }

  const id = nanoid();
  await env.DB.prepare(
    'INSERT INTO submission_files (id, submission_id, name, mime_type, r2_key, size) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, submissionId, body.name, body.mime_type, r2Key, body.size ?? 0).run();

  return json({ id, name: body.name, mime_type: body.mime_type, size: body.size ?? 0, r2_key: r2Key }, 201);
}

// DELETE /api/submission-files/:id
export async function deleteSubmissionFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const file = await env.DB.prepare(
    'SELECT sf.id, s.student_id FROM submission_files sf JOIN submissions s ON sf.submission_id = s.id WHERE sf.id = ?'
  ).bind(fileId).first<{ student_id: string }>();
  if (!file) return json({ error: 'Not found' }, 404);
  if (user!.role === 'student' && file.student_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  await env.DB.prepare('DELETE FROM submission_files WHERE id = ?').bind(fileId).run();
  return json({ ok: true });
}
