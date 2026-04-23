import { Hono } from 'hono';
import type { Env, Variables, Class } from '../types';
import {
  getClass,
  getAllClasses,
  getClassesByTeacher,
  getClassesByStudent,
  insertClass,
  updateClass,
  deleteClass,
  getClassStudents,
  addClassMember,
  removeClassMember,
  isClassMember,
  getAssignmentsByClass,
  insertChatRoom,
} from '../db/queries';

const classes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/classes
classes.get('/', async (c) => {
  const user = c.get('user');
  let list: Class[];

  if (user.role === 'admin') {
    list = await getAllClasses(c.env.DB);
  } else if (user.role === 'teacher') {
    list = await getClassesByTeacher(c.env.DB, user.id);
  } else {
    list = await getClassesByStudent(c.env.DB, user.id);
  }

  return c.json(list);
});

// POST /api/classes
classes.post('/', async (c) => {
  const user = c.get('user');
  if (user.role === 'student') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let body: { name?: string; subject?: string; color?: string; icon?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 400);
  }

  const cls: Class = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    teacher_id: user.role === 'teacher' ? user.id : ((body as { teacher_id?: string }).teacher_id || user.id),
    subject: body.subject ?? null,
    color: body.color ?? null,
    icon: body.icon ?? null,
    created_at: Math.floor(Date.now() / 1000),
  };

  await insertClass(c.env.DB, cls);

  // Auto-create a class chat room
  await insertChatRoom(c.env.DB, {
    id: `class_${cls.id}`,
    name: cls.name,
    type: 'class',
    class_id: cls.id,
  });

  return c.json(cls, 201);
});

// GET /api/classes/:id
classes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const cls = await getClass(c.env.DB, id);
  if (!cls) {
    return c.json({ error: 'Class not found' }, 404);
  }

  // Access control: students must be members, teachers must own it (unless admin)
  if (user.role === 'student') {
    const member = await isClassMember(c.env.DB, id, user.id);
    if (!member) return c.json({ error: 'Forbidden' }, 403);
  } else if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const [students, assignments] = await Promise.all([
    getClassStudents(c.env.DB, id),
    getAssignmentsByClass(c.env.DB, id),
  ]);

  return c.json({ class: cls, students, assignments });
});

// PUT /api/classes/:id
classes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const cls = await getClass(c.env.DB, id);
  if (!cls) return c.json({ error: 'Class not found' }, 404);

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
  if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let body: { name?: string; subject?: string; color?: string; icon?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  await updateClass(c.env.DB, id, {
    name: body.name,
    subject: body.subject,
    color: body.color,
    icon: body.icon,
  });

  const updated = await getClass(c.env.DB, id);
  return c.json(updated);
});

// DELETE /api/classes/:id
classes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const cls = await getClass(c.env.DB, id);
  if (!cls) return c.json({ error: 'Class not found' }, 404);

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
  if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await deleteClass(c.env.DB, id);
  return c.json({ success: true });
});

// POST /api/classes/:id/students
classes.post('/:id/students', async (c) => {
  const user = c.get('user');
  const classId = c.req.param('id');

  const cls = await getClass(c.env.DB, classId);
  if (!cls) return c.json({ error: 'Class not found' }, 404);

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
  if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let body: { student_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.student_id) return c.json({ error: 'student_id is required' }, 400);

  await addClassMember(c.env.DB, classId, body.student_id);
  return c.json({ success: true }, 201);
});

// DELETE /api/classes/:id/students/:student_id
classes.delete('/:id/students/:student_id', async (c) => {
  const user = c.get('user');
  const classId = c.req.param('id');
  const studentId = c.req.param('student_id');

  const cls = await getClass(c.env.DB, classId);
  if (!cls) return c.json({ error: 'Class not found' }, 404);

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
  if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await removeClassMember(c.env.DB, classId, studentId);
  return c.json({ success: true });
});

export default classes;
