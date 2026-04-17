import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { AppSettings } from './auth';
import { getSettings } from './auth';

const settings = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/settings
settings.get('/', async (c) => {
  return c.json(await getSettings(c.env.SESSIONS));
});

// PUT /api/settings — admin only
settings.put('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<Partial<AppSettings>>();
  const current = await getSettings(c.env.SESSIONS);
  const updated: AppSettings = {
    allow_admin_register: body.allow_admin_register ?? current.allow_admin_register,
    open_registration: body.open_registration ?? current.open_registration,
  };
  await c.env.SESSIONS.put('app_settings', JSON.stringify(updated));
  return c.json(updated);
});

export default settings;
