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
// Returns: { key }
export async function uploadFile(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const body = await request.json<{ name: string; mime_type: string; data: string; size?: number }>();
  if (!body.name || !body.mime_type || !body.data) return json({ error: 'name, mime_type, data required' }, 400);
  if (body.data.length > 7_000_000) return json({ error: 'Datei zu groß (max. 5 MB)' }, 413);

  const bytes = Uint8Array.from(atob(body.data), (c) => c.charCodeAt(0));
  const key = `${nanoid()}-${body.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  await env.FILES.put(key, bytes, {
    httpMetadata: { contentType: body.mime_type },
    customMetadata: { originalName: body.name, uploadedBy: user!.id },
  });

  return json({ key }, 201);
}

// GET /api/files/:key  (token via Authorization header or ?token= query param)
export async function serveFile(request: Request, env: Env, key: string): Promise<Response> {
  // Auth: accept token from header or query param (needed for <img> tags)
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

  const object = await env.FILES.get(key);
  if (!object) return json({ error: 'Not found' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=3600');
  const name = object.customMetadata?.originalName || key;
  headers.set('Content-Disposition', `inline; filename="${name}"`);

  return new Response(object.body, { headers });
}
