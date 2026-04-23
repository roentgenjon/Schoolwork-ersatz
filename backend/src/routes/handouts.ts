import { Hono } from 'hono';
import type { Env, Variables, Handout } from '../types';
import {
  getAllHandouts,
  getHandoutsForTeacher,
  getHandoutsForStudent,
  getHandout,
  insertHandout,
  deleteHandout,
  updateHandout,
  getClass,
  isClassMember,
} from '../db/queries';

const handouts = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/handouts
handouts.get('/', async (c) => {
  const user = c.get('user');

  if (user.role === 'admin') {
    return c.json(await getAllHandouts(c.env.DB));
  }
  if (user.role === 'teacher') {
    return c.json(await getHandoutsForTeacher(c.env.DB, user.id));
  }
  return c.json(await getHandoutsForStudent(c.env.DB, user.id));
});

// POST /api/handouts
handouts.post('/', async (c) => {
  const user = c.get('user');
  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  let body: {
    class_id?: string;
    title?: string;
    description?: string;
    file_url?: string;
    file_type?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.class_id) return c.json({ error: 'class_id is required' }, 400);
  if (!body.title || body.title.trim().length === 0) return c.json({ error: 'title is required' }, 400);

  // Teachers can only post handouts for their own classes
  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, body.class_id);
    if (!cls) return c.json({ error: 'Class not found' }, 404);
    if (cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  const handout: Handout = {
    id: crypto.randomUUID(),
    class_id: body.class_id,
    title: body.title.trim(),
    description: body.description ?? null,
    file_url: body.file_url ?? null,
    file_type: body.file_type ?? null,
    created_by: user.id,
    created_at: Math.floor(Date.now() / 1000),
  };

  await insertHandout(c.env.DB, handout);
  return c.json(handout, 201);
});

// PUT /api/handouts/:id
handouts.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const handout = await getHandout(c.env.DB, id);
  if (!handout) return c.json({ error: 'Not found' }, 404);

  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, handout.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json<{ title?: string; description?: string; class_id?: string }>();
  await updateHandout(c.env.DB, id, {
    title: body.title?.trim(),
    description: body.description,
    class_id: body.class_id,
  });
  const updated = await getHandout(c.env.DB, id);
  return c.json(updated);
});

// DELETE /api/handouts/:id
handouts.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const handout = await getHandout(c.env.DB, id);
  if (!handout) return c.json({ error: 'Handout not found' }, 404);

  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, handout.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  await deleteHandout(c.env.DB, id);
  return c.json({ success: true });
});

export default handouts;
