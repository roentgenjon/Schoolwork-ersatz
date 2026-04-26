import type { Env } from '../types';
import { authenticate, requireAuth } from '../middleware/auth';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/chat/rooms
export async function listRooms(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  let rooms;
  if (user!.role === 'admin') {
    const { results } = await env.DB.prepare('SELECT * FROM chat_rooms ORDER BY type, name').all();
    rooms = results;
  } else if (user!.role === 'teacher') {
    const { results } = await env.DB.prepare(`
      SELECT cr.* FROM chat_rooms cr
      WHERE cr.type = 'global'
         OR (cr.type = 'class' AND cr.class_id IN (SELECT id FROM classes WHERE teacher_id = ?))
      ORDER BY cr.type, cr.name
    `).bind(user!.id).all();
    rooms = results;
  } else {
    const { results } = await env.DB.prepare(`
      SELECT cr.* FROM chat_rooms cr
      WHERE cr.type = 'global'
         OR (cr.type = 'class' AND cr.class_id IN (
               SELECT class_id FROM class_members WHERE student_id = ?
             ))
      ORDER BY cr.type, cr.name
    `).bind(user!.id).all();
    rooms = results;
  }

  return json(rooms);
}

// GET /api/chat/rooms/:id/messages
export async function getRoomMessages(request: Request, env: Env, roomId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const { results } = await env.DB.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM chat_messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 50
  `).bind(roomId).all();

  return json(results.reverse());
}

// WS /api/chat/ws/:room_id  – upgrades to WebSocket via Durable Object
export async function chatWebSocket(request: Request, env: Env, roomId: string): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return json({ error: 'Token required' }, 401);

  // Validate token quickly via KV
  const userId = await env.SESSIONS.get(`session:${token}`);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const user = await env.DB.prepare('SELECT id, name, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; name: string; role: string }>();
  if (!user) return json({ error: 'User not found' }, 401);

  const doId = env.CHAT_ROOM.idFromName(roomId);
  const stub = env.CHAT_ROOM.get(doId);
  return stub.fetch(request);
}
