import type { Context, Next } from 'hono';
import type { Env, Variables } from '../types';

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return c.json({ error: 'Missing token' }, 401);
  }

  const raw = await c.env.SESSIONS.get(token);
  if (!raw) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  try {
    const user = JSON.parse(raw);
    c.set('user', user);
  } catch {
    return c.json({ error: 'Malformed session data' }, 401);
  }

  await next();
}
