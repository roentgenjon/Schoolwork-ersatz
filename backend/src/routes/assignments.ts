import { Hono } from 'hono';
import type { Env, Variables, Assignment, Submission, AssignmentType, SubmissionStatus } from '../types';
import {
  getAssignment,
  getAllAssignments,
  getAssignmentsForTeacher,
  getAssignmentsForStudent,
  insertAssignment,
  updateAssignment,
  deleteAssignment,
  getSubmissionsByAssignment,
  getSubmission,
  updateSubmission,
  getStudentSubmissionForAssignment,
  upsertSubmission,
  getClass,
  isClassMember,
} from '../db/queries';

const assignments = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/assignments
assignments.get('/', async (c) => {
  const user = c.get('user');

  if (user.role === 'admin') {
    return c.json(await getAllAssignments(c.env.DB));
  }
  if (user.role === 'teacher') {
    return c.json(await getAssignmentsForTeacher(c.env.DB, user.id));
  }
  return c.json(await getAssignmentsForStudent(c.env.DB, user.id));
});

// POST /api/assignments
assignments.post('/', async (c) => {
  const user = c.get('user');
  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  let body: {
    class_id?: string;
    title?: string;
    description?: string;
    type?: string;
    due_date?: number;
    points?: number;
    file_url?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.class_id) return c.json({ error: 'class_id is required' }, 400);
  if (!body.title || body.title.trim().length === 0) return c.json({ error: 'title is required' }, 400);
  const validTypes: AssignmentType[] = ['quiz', 'handout', 'activity', 'book_report', 'collaboration'];
  if (!body.type || !validTypes.includes(body.type as AssignmentType)) {
    return c.json({ error: 'type must be one of: quiz, handout, activity, book_report, collaboration' }, 400);
  }

  // Teachers can only create assignments for their own classes
  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, body.class_id);
    if (!cls) return c.json({ error: 'Class not found' }, 404);
    if (cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  const assignment: Assignment = {
    id: crypto.randomUUID(),
    class_id: body.class_id,
    title: body.title.trim(),
    description: body.description ?? null,
    type: body.type as AssignmentType,
    due_date: body.due_date ?? null,
    points: body.points ?? 100,
    created_by: user.id,
    created_at: Math.floor(Date.now() / 1000),
    file_url: body.file_url ?? null,
  };

  await insertAssignment(c.env.DB, assignment);
  return c.json(assignment, 201);
});

// GET /api/assignments/:id
assignments.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const assignment = await getAssignment(c.env.DB, id);
  if (!assignment) return c.json({ error: 'Assignment not found' }, 404);

  // Students must be in the class
  if (user.role === 'student') {
    const member = await isClassMember(c.env.DB, assignment.class_id, user.id);
    if (!member) return c.json({ error: 'Forbidden' }, 403);
  } else if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, assignment.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  const submissions = user.role === 'student'
    ? await getStudentSubmissionForAssignment(c.env.DB, id, user.id).then(s => s ? [s] : [])
    : await getSubmissionsByAssignment(c.env.DB, id);

  return c.json({ assignment, submissions });
});

// PUT /api/assignments/:id
assignments.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const assignment = await getAssignment(c.env.DB, id);
  if (!assignment) return c.json({ error: 'Assignment not found' }, 404);

  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, assignment.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  let body: {
    title?: string;
    description?: string;
    type?: string;
    due_date?: number;
    points?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const validTypes: AssignmentType[] = ['quiz', 'handout', 'activity', 'book_report', 'collaboration'];
  if (body.type && !validTypes.includes(body.type as AssignmentType)) {
    return c.json({ error: 'Invalid type' }, 400);
  }

  await updateAssignment(c.env.DB, id, {
    title: body.title,
    description: body.description,
    type: body.type as AssignmentType | undefined,
    due_date: body.due_date,
    points: body.points,
  });

  const updated = await getAssignment(c.env.DB, id);
  return c.json(updated);
});

// DELETE /api/assignments/:id
assignments.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const assignment = await getAssignment(c.env.DB, id);
  if (!assignment) return c.json({ error: 'Assignment not found' }, 404);

  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, assignment.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  await deleteAssignment(c.env.DB, id);
  return c.json({ success: true });
});

// GET /api/assignments/:id/submissions
assignments.get('/:id/submissions', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const assignment = await getAssignment(c.env.DB, id);
  if (!assignment) return c.json({ error: 'Assignment not found' }, 404);

  if (user.role === 'teacher') {
    const cls = await getClass(c.env.DB, assignment.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  const submissions = await getSubmissionsByAssignment(c.env.DB, id);
  return c.json(submissions);
});

// POST /api/assignments/:id/submit  — student submits
assignments.post('/:id/submit', async (c) => {
  const user = c.get('user');
  const assignmentId = c.req.param('id');

  if (user.role !== 'student') return c.json({ error: 'Only students can submit' }, 403);

  const assignment = await getAssignment(c.env.DB, assignmentId);
  if (!assignment) return c.json({ error: 'Assignment not found' }, 404);

  const member = await isClassMember(c.env.DB, assignment.class_id, user.id);
  if (!member) return c.json({ error: 'Forbidden' }, 403);

  const now = Math.floor(Date.now() / 1000);
  const existing = await getStudentSubmissionForAssignment(c.env.DB, assignmentId, user.id);

  const submission: Submission = {
    id: existing?.id ?? crypto.randomUUID(),
    assignment_id: assignmentId,
    student_id: user.id,
    status: 'turned_in',
    score: existing?.score ?? null,
    feedback: existing?.feedback ?? null,
    submitted_at: now,
    updated_at: now,
  };

  await upsertSubmission(c.env.DB, submission);
  return c.json(submission, 201);
});

export default assignments;

// ── Submissions router (mounted separately at /api/submissions) ───────────────

export const submissionsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// PUT /api/submissions/:id  — teacher grades / returns
submissionsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const submission = await getSubmission(c.env.DB, id);
  if (!submission) return c.json({ error: 'Submission not found' }, 404);

  if (user.role === 'teacher') {
    const assignment = await getAssignment(c.env.DB, submission.assignment_id);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    const cls = await getClass(c.env.DB, assignment.class_id);
    if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
  }

  let body: { status?: string; score?: number; feedback?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const validStatuses: SubmissionStatus[] = ['not_started', 'in_progress', 'turned_in', 'returned', 'graded'];
  if (body.status && !validStatuses.includes(body.status as SubmissionStatus)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  await updateSubmission(c.env.DB, id, {
    status: body.status as SubmissionStatus | undefined,
    score: body.score,
    feedback: body.feedback,
    updated_at: now,
  });

  const updated = await getSubmission(c.env.DB, id);
  return c.json(updated);
});
