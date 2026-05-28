import type { Env } from '../types';
import { authenticate, requireAuth } from '../middleware/auth';

function nanoid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// POST /api/upload
// Body: { name, mime_type, data (base64), size }
// Stores in D1 files table, returns { key }
export async function uploadFile(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const body = await request.json<{ name: string; mime_type: string; data: string; size?: number }>();
  if (!body.name || !body.mime_type || !body.data) return json({ error: 'name, mime_type, data required' }, 400);
  if (body.data.length > 6_800_000) return json({ error: 'Datei zu groß (max. 5 MB)' }, 413);

  const key = nanoid();
  await env.DB.prepare(
    'INSERT INTO files (id, name, mime_type, data, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(key, body.name, body.mime_type, body.data, body.size ?? 0, user!.id).run();

  return json({ key }, 201);
}

// GET /api/files/:key  (auth via Authorization header or ?token= query param for <img> tags)
export async function serveFile(request: Request, env: Env, key: string): Promise<Response> {
  let token: string | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = new URL(request.url).searchParams.get('token');
  }

  if (!token) return json({ error: 'Unauthorized' }, 401);
  const userId = await env.SESSIONS.get(`session:${token}`);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const file = await env.DB.prepare(
    'SELECT name, mime_type, data FROM files WHERE id = ?'
  ).bind(key).first<{ name: string; mime_type: string; data: string }>();
  if (!file) return json({ error: 'Not found' }, 404);

  const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Disposition': `inline; filename="${file.name}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
