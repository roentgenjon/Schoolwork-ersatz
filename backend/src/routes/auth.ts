import type { Env } from '../types';
import { createSession, destroySession, hashPassword, verifyPassword, authenticate } from '../middleware/auth';
import { DEFAULT_PERMISSIONS } from '../types';
import { loadSettings } from './settings';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function nanoid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// POST /api/auth/register
export async function register(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ name: string; role: string; password?: string }>();
  const { name, role, password } = body;

  if (!name?.trim()) return json({ error: 'Name required' }, 400);
  if (!['admin', 'teacher', 'student'].includes(role)) return json({ error: 'Invalid role' }, 400);

  const settings = await loadSettings(env);
  if (!settings.registrationOpen) return json({ error: 'Registrierung ist deaktiviert. Bitte wende dich an einen Administrator.' }, 403);
  if (role === 'admin' && !settings.adminRegistrationAllowed) return json({ error: 'Admin-Konten können nicht selbst erstellt werden.' }, 403);

  if ((role === 'admin' || role === 'teacher') && !password?.trim()) {
    return json({ error: 'Password required for admin/teacher accounts' }, 400);
  }

  const id = nanoid();
  const perms = DEFAULT_PERMISSIONS[role] ?? [];
  const passwordHash = password ? await hashPassword(password) : null;

  await env.DB.prepare(
    'INSERT INTO users (id, name, role, password_hash, permissions) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name.trim(), role, passwordHash, JSON.stringify(perms)).run();

  const token = await createSession(env, id);

  return json({
    token,
    user: { id, name: name.trim(), role, permissions: perms },
  });
}

// POST /api/auth/login
export async function login(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ name: string; password?: string; role?: string }>();
  const { name, password } = body;

  if (!name?.trim()) return json({ error: 'Name required' }, 400);

  const row = await env.DB.prepare(
    'SELECT id, name, role, password_hash, permissions FROM users WHERE name = ?'
  ).bind(name.trim()).first<{ id: string; name: string; role: string; password_hash: string | null; permissions: string }>();

  if (!row) return json({ error: 'User not found' }, 404);

  if (row.role === 'admin' || row.role === 'teacher') {
    if (!password) return json({ error: 'Password required' }, 400);
    const ok = await verifyPassword(password, row.password_hash!);
    if (!ok) return json({ error: 'Wrong password' }, 401);
  }

  const token = await createSession(env, row.id);
  return json({
    token,
    user: {
      id: row.id,
      name: row.name,
      role: row.role,
      permissions: JSON.parse(row.permissions || '[]'),
    },
  });
}

// POST /api/auth/logout
export async function logout(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    await destroySession(env, auth.slice(7));
  }
  return json({ ok: true });
}

// GET /api/auth/me
export async function me(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return json({ user });
}
