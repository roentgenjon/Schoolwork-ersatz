import type { Env } from '../types';
import { authenticate, requireRole } from '../middleware/auth';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getProgress(request: Request, env: Env, classId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin', 'teacher');
  if (err) return err;

  const cls = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(classId).first<{ teacher_id: string }>();
  if (!cls) return json({ error: 'Not found' }, 404);
  if (user!.role === 'teacher' && cls.teacher_id !== user!.id) return json({ error: 'Forbidden' }, 403);

  const { results: students } = await env.DB.prepare(`
    SELECT u.id, u.name FROM users u
    JOIN class_members cm ON cm.student_id = u.id
    WHERE cm.class_id = ?
    ORDER BY u.name
  `).bind(classId).all<{ id: string; name: string }>();

  const { results: assignments } = await env.DB.prepare(
    'SELECT id, title, points FROM assignments WHERE class_id = ?'
  ).bind(classId).all<{ id: string; title: string; points: number }>();

  const progress = await Promise.all(
    students.map(async (student) => {
      const { results: subs } = await env.DB.prepare(
        'SELECT * FROM submissions WHERE student_id = ? AND assignment_id IN (SELECT id FROM assignments WHERE class_id = ?)'
      ).bind(student.id, classId).all<{ assignment_id: string; status: string; score: number | null }>();

      const subMap = Object.fromEntries(subs.map((s) => [s.assignment_id, s]));
      const totalPoints = assignments.reduce((sum, a) => sum + a.points, 0);
      const earnedPoints = subs.reduce((sum, s) => sum + (s.score ?? 0), 0);
      const submitted = subs.filter((s) => s.status === 'turned_in' || s.status === 'graded').length;

      return {
        student,
        submissions: assignments.map((a) => ({
          assignment_id: a.id,
          title: a.title,
          points: a.points,
          status: subMap[a.id]?.status ?? 'not_started',
          score: subMap[a.id]?.score ?? null,
        })),
        stats: {
          total_assignments: assignments.length,
          submitted,
          completion_rate: assignments.length > 0 ? Math.round((submitted / assignments.length) * 100) : 0,
          total_points: totalPoints,
          earned_points: earnedPoints,
          grade_percent: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null,
        },
      };
    })
  );

  return json(progress);
}
