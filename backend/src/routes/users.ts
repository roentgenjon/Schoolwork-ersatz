import type { Env, User } from '../types';
import { authenticate, requireRole, destroyAllSessions, hashPassword } from '../middleware/auth';
import { DEFAULT_PERMISSIONS } from '../types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/users
export async function listUsers(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  const { results } = await env.DB.prepare(
    'SELECT id, name, role, permissions, created_at FROM users ORDER BY role, name'
  ).all<{ id: string; name: string; role: string; permissions: string; created_at: number }>();

  return json(results.map((r) => ({ ...r, permissions: JSON.parse(r.permissions || '[]') })));
}

// DELETE /api/users/:id
export async function deleteUser(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  if (userId === user!.id) return json({ error: 'Cannot delete your own account' }, 400);

  const target = await env.DB.prepare(
    'SELECT id, role FROM users WHERE id = ?'
  ).bind(userId).first<{ id: string; role: string }>();

  if (!target) return json({ error: 'User not found' }, 404);

  if (target.role === 'admin') {
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'"
    ).all<{ cnt: number }>();
    if ((results[0]?.cnt ?? 0) <= 1) {
      return json({ error: 'Cannot delete the last admin account' }, 400);
    }
  }

  // Invalidate all sessions before deletion
  await destroyAllSessions(env, userId);

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return json({ ok: true });
}

// POST /api/users/:id/logout  – admin force-logout
export async function forceLogout(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!target) return json({ error: 'User not found' }, 404);

  await destroyAllSessions(env, userId);
  return json({ ok: true });
}

// PUT /api/users/:id/permissions  – admin update individual permissions
export async function updatePermissions(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  const body = await request.json<{ permissions: string[] }>();
  if (!Array.isArray(body.permissions)) return json({ error: 'permissions must be an array' }, 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; role: string }>();
  if (!target) return json({ error: 'User not found' }, 404);

  await env.DB.prepare('UPDATE users SET permissions = ? WHERE id = ?')
    .bind(JSON.stringify(body.permissions), userId)
    .run();

  return json({ ok: true, permissions: body.permissions });
}

// PUT /api/users/:id/role  – admin change role
export async function updateRole(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  const body = await request.json<{ role: string; password?: string }>();
  if (!['admin', 'teacher', 'student'].includes(body.role)) return json({ error: 'Invalid role' }, 400);

  if ((body.role === 'admin' || body.role === 'teacher') && body.password === undefined) {
    // Keep existing password if not changing
  }

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; role: string }>();
  if (!target) return json({ error: 'User not found' }, 404);

  if (target.role === 'admin' && body.role !== 'admin') {
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'"
    ).all<{ cnt: number }>();
    if ((results[0]?.cnt ?? 0) <= 1) {
      return json({ error: 'Cannot demote the last admin account' }, 400);
    }
  }

  const newPerms = DEFAULT_PERMISSIONS[body.role] ?? [];
  let passwordHash: string | undefined;
  if (body.password) passwordHash = await hashPassword(body.password);

  if (passwordHash) {
    await env.DB.prepare('UPDATE users SET role = ?, permissions = ?, password_hash = ? WHERE id = ?')
      .bind(body.role, JSON.stringify(newPerms), passwordHash, userId).run();
  } else {
    await env.DB.prepare('UPDATE users SET role = ?, permissions = ? WHERE id = ?')
      .bind(body.role, JSON.stringify(newPerms), userId).run();
  }

  return json({ ok: true });
}
