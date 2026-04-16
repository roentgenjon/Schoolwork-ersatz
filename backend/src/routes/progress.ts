import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import {
  getClass,
  getClassStudents,
  getAssignmentsByClass,
  getSubmissionsForClass,
  isClassMember,
} from '../db/queries';

const progress = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/progress/:class_id
progress.get('/:class_id', async (c) => {
  const user = c.get('user');
  const classId = c.req.param('class_id');

  const cls = await getClass(c.env.DB, classId);
  if (!cls) return c.json({ error: 'Class not found' }, 404);

  // Access control
  if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
  if (user.role === 'teacher' && cls.teacher_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const [students, assignments, allSubmissions] = await Promise.all([
    getClassStudents(c.env.DB, classId),
    getAssignmentsByClass(c.env.DB, classId),
    getSubmissionsForClass(c.env.DB, classId),
  ]);

  const result = students.map((student) => {
    const studentSubmissions = allSubmissions.filter((s) => s.student_id === student.id);

    const gradedSubmissions = studentSubmissions.filter(
      (s) => s.status === 'graded' && s.score !== null
    );

    const averageScore =
      gradedSubmissions.length > 0
        ? Math.round(
            gradedSubmissions.reduce((sum, s) => sum + (s.score ?? 0), 0) /
              gradedSubmissions.length
          )
        : null;

    const completedCount = studentSubmissions.filter(
      (s) => s.status === 'turned_in' || s.status === 'graded' || s.status === 'returned'
    ).length;

    return {
      student,
      submissions: studentSubmissions,
      averageScore,
      completedCount,
      totalAssignments: assignments.length,
    };
  });

  return c.json(result);
});

export default progress;
