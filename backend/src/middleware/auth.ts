import type { Env, User } from '../types';

export async function authenticate(request: Request, env: Env): Promise<User | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  const userId = await env.SESSIONS.get(`session:${token}`);
  if (!userId) return null;

  const row = await env.DB.prepare(
    'SELECT id, name, role, permissions FROM users WHERE id = ?'
  ).bind(userId).first<{ id: string; name: string; role: string; permissions: string }>();

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    role: row.role as User['role'],
    permissions: JSON.parse(row.permissions || '[]'),
    created_at: 0,
  };
}

export function requireAuth(user: User | null): Response | null {
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return null;
}

export function requireRole(user: User | null, ...roles: string[]): Response | null {
  const authErr = requireAuth(user);
  if (authErr) return authErr;
  if (!roles.includes(user!.role)) return json({ error: 'Forbidden' }, 403);
  return null;
}

export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.SESSIONS.put(`session:${token}`, userId, { expirationTtl: 60 * 60 * 24 * 30 });
  const existing = await env.SESSIONS.get(`user_tokens:${userId}`);
  const tokens: string[] = existing ? JSON.parse(existing) : [];
  tokens.push(token);
  await env.SESSIONS.put(`user_tokens:${userId}`, JSON.stringify(tokens), { expirationTtl: 60 * 60 * 24 * 31 });
  return token;
}

export async function destroySession(env: Env, token: string): Promise<void> {
  const userId = await env.SESSIONS.get(`session:${token}`);
  await env.SESSIONS.delete(`session:${token}`);
  if (userId) {
    const existing = await env.SESSIONS.get(`user_tokens:${userId}`);
    if (existing) {
      const tokens: string[] = JSON.parse(existing).filter((t: string) => t !== token);
      await env.SESSIONS.put(`user_tokens:${userId}`, JSON.stringify(tokens));
    }
  }
}

export async function destroyAllSessions(env: Env, userId: string): Promise<void> {
  const existing = await env.SESSIONS.get(`user_tokens:${userId}`);
  if (existing) {
    const tokens: string[] = JSON.parse(existing);
    await Promise.all(tokens.map((t) => env.SESSIONS.delete(`session:${t}`)));
    await env.SESSIONS.delete(`user_tokens:${userId}`);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = enc.encode('schoolwork-salt-v1');
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
