import type { Env } from '../types';
import { authenticate, requireRole } from '../middleware/auth';

export interface AppSettings {
  registrationOpen: boolean;
  adminRegistrationAllowed: boolean;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function loadSettings(env: Env): Promise<AppSettings> {
  const raw = await env.SESSIONS.get('app_settings');
  if (!raw) return { registrationOpen: true, adminRegistrationAllowed: true };
  try { return JSON.parse(raw); } catch { return { registrationOpen: true, adminRegistrationAllowed: true }; }
}

// GET /api/settings – öffentlich, keine Anmeldung erforderlich
export async function readSettings(request: Request, env: Env): Promise<Response> {
  return json(await loadSettings(env));
}

// PUT /api/settings – nur Admin
export async function writeSettings(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  const body = await request.json<Partial<AppSettings>>();
  const current = await loadSettings(env);
  const updated: AppSettings = {
    registrationOpen: body.registrationOpen ?? current.registrationOpen,
    adminRegistrationAllowed: body.adminRegistrationAllowed ?? current.adminRegistrationAllowed,
  };
  await env.SESSIONS.put('app_settings', JSON.stringify(updated));
  return json(updated);
}
