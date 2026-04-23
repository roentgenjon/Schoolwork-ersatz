import { Hono } from 'hono';
import type { Env, Variables, User, UserRole } from '../types';
import { insertUser, getUser, getAllUsers, getUserByName } from '../db/queries';

export interface AppSettings {
  allow_admin_register: boolean;
  open_registration: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  allow_admin_register: true,
  open_registration: true,
};

export async function getSettings(kv: KVNamespace): Promise<AppSettings> {
  const raw = await kv.get('app_settings');
  if (!raw) return DEFAULT_SETTINGS;
  try { return JSON.parse(raw) as AppSettings; } catch { return DEFAULT_SETTINGS; }
}

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/auth/setup — öffentlich, kein Token nötig
auth.get('/setup', async (c) => {
  const allUsers = await getAllUsers(c.env.DB);
  const settings = await getSettings(c.env.SESSIONS);
  return c.json({ hasUsers: allUsers.length > 0, settings });
});

// POST /api/auth/register
auth.post('/register', async (c) => {
  let body: { name?: string; role?: string };
  try { body = await c.req.json(); } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { name } = body;
  let role = body.role;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 400);
  }

  const allUsers = await getAllUsers(c.env.DB);
  const settings = await getSettings(c.env.SESSIONS);

  // Erster Nutzer → immer Admin
  if (allUsers.length === 0) {
    role = 'admin';
  } else if (!settings.open_registration) {
    // Geschlossene Registrierung: nur vorbereitete Konten dürfen sich anmelden
    const existing = await getUserByName(c.env.DB, name.trim());
    if (!existing) {
      return c.json({ error: 'Kein Konto für diesen Namen gefunden. Wende dich an den Administrator.' }, 403);
    }
    const token = crypto.randomUUID();
    await c.env.SESSIONS.put(token, JSON.stringify(existing), { expirationTtl: 86400 * 30 });
    return c.json({ token, user: existing }, 200);
  } else {
    if (!role || !['admin', 'teacher', 'student'].includes(role)) {
      return c.json({ error: 'role must be admin, teacher, or student' }, 400);
    }
    if (!settings.allow_admin_register && role === 'admin') {
      return c.json({ error: 'Admin-Konten können nicht selbst erstellt werden.' }, 403);
    }
  }

  const user: User = {
    id: crypto.randomUUID(),
    name: name.trim(),
    role: role as UserRole,
    created_at: Math.floor(Date.now() / 1000),
  };

  await insertUser(c.env.DB, user);

  const token = crypto.randomUUID();
  await c.env.SESSIONS.put(token, JSON.stringify(user), { expirationTtl: 86400 * 30 });
  return c.json({ token, user }, 201);
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  const user = c.get('user');
  const fresh = await getUser(c.env.DB, user.id);
  if (!fresh) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: fresh });
});

export default auth;
