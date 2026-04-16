import { Hono } from 'hono';
import type { Env, Variables, User, UserRole } from '../types';
import { insertUser, getUser } from '../db/queries';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/auth/register
auth.post('/register', async (c) => {
  let body: { name?: string; role?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { name, role } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 400);
  }
  if (!role || !['admin', 'teacher', 'student'].includes(role)) {
    return c.json({ error: 'role must be admin, teacher, or student' }, 400);
  }

  const user: User = {
    id: crypto.randomUUID(),
    name: name.trim(),
    role: role as UserRole,
    created_at: Math.floor(Date.now() / 1000),
  };

  await insertUser(c.env.DB, user);

  const token = crypto.randomUUID();
  // Store session for 30 days
  await c.env.SESSIONS.put(token, JSON.stringify(user), {
    expirationTtl: 86400 * 30,
  });

  return c.json({ token, user }, 201);
});

// GET /api/auth/me  (protected by auth middleware mounted in index.ts)
auth.get('/me', async (c) => {
  const user = c.get('user');
  // Refresh user data from DB in case it was updated
  const fresh = await getUser(c.env.DB, user.id);
  if (!fresh) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ user: fresh });
});

export default auth;
