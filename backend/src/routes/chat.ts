import type { Env } from '../types';
import { authenticate, requireAuth, requireRole } from '../middleware/auth';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function nanoid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
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
         OR (cr.type IN ('dm', 'group') AND cr.id IN (
               SELECT room_id FROM chat_room_members WHERE user_id = ?
             ))
      ORDER BY cr.type, cr.name
    `).bind(user!.id, user!.id).all();
    rooms = results;
  } else {
    const { results } = await env.DB.prepare(`
      SELECT cr.* FROM chat_rooms cr
      WHERE cr.type = 'global'
         OR (cr.type = 'class' AND cr.class_id IN (
               SELECT class_id FROM class_members WHERE student_id = ?
             ))
         OR (cr.type IN ('dm', 'group') AND cr.id IN (
               SELECT room_id FROM chat_room_members WHERE user_id = ?
             ))
      ORDER BY cr.type, cr.name
    `).bind(user!.id, user!.id).all();
    rooms = results;
  }

  return json(rooms);
}

// POST /api/chat/rooms  – create DM or group room
export async function createRoom(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const body = await request.json<{ type: 'dm' | 'group'; target_user_id?: string; name?: string }>();

  if (body.type === 'dm') {
    if (!body.target_user_id) return json({ error: 'target_user_id required for DM' }, 400);

    // Deterministic room id so duplicates can't be created
    const ids = [user!.id, body.target_user_id].sort();
    const roomId = `dm_${ids[0]}_${ids[1]}`;

    const existing = await env.DB.prepare('SELECT id FROM chat_rooms WHERE id = ?').bind(roomId).first();
    if (!existing) {
      const target = await env.DB.prepare('SELECT name FROM users WHERE id = ?')
        .bind(body.target_user_id)
        .first<{ name: string }>();
      if (!target) return json({ error: 'Target user not found' }, 404);

      const roomName = `${user!.name} & ${target.name}`;
      await env.DB.prepare("INSERT INTO chat_rooms (id, name, type) VALUES (?, ?, 'dm')")
        .bind(roomId, roomName).run();

      // Add both users as members
      await env.DB.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)')
        .bind(roomId, user!.id).run();
      await env.DB.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)')
        .bind(roomId, body.target_user_id).run();
    }

    return json({ id: roomId }, 201);
  }

  if (body.type === 'group') {
    if (!body.name?.trim()) return json({ error: 'name required for group' }, 400);

    const roomId = nanoid();
    await env.DB.prepare("INSERT INTO chat_rooms (id, name, type) VALUES (?, ?, 'group')")
      .bind(roomId, body.name.trim()).run();
    await env.DB.prepare('INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)')
      .bind(roomId, user!.id).run();

    return json({ id: roomId, name: body.name.trim(), type: 'group' }, 201);
  }

  return json({ error: 'Invalid type' }, 400);
}

// DELETE /api/chat/rooms/:id
export async function deleteRoom(request: Request, env: Env, roomId: string): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireAuth(user);
  if (err) return err;

  const room = await env.DB.prepare('SELECT * FROM chat_rooms WHERE id = ?')
    .bind(roomId)
    .first<{ id: string; type: string }>();
  if (!room) return json({ error: 'Room not found' }, 404);

  // Global room and class rooms cannot be deleted directly
  if (room.type === 'global') return json({ error: 'Cannot delete the global room' }, 400);
  if (room.type === 'class') return json({ error: 'Delete the class to remove its chat room' }, 400);

  // DM: only members may delete; group: only admins/teachers
  if (room.type === 'dm') {
    const isMember = await env.DB.prepare(
      'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?'
    ).bind(roomId, user!.id).first();
    if (!isMember && user!.role !== 'admin') return json({ error: 'Forbidden' }, 403);
  } else if (user!.role === 'student') {
    return json({ error: 'Forbidden' }, 403);
  }

  await env.DB.prepare('DELETE FROM chat_messages WHERE room_id = ?').bind(roomId).run();
  await env.DB.prepare('DELETE FROM chat_room_members WHERE room_id = ?').bind(roomId).run();
  await env.DB.prepare('DELETE FROM chat_rooms WHERE id = ?').bind(roomId).run();

  return json({ ok: true });
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

// DELETE /api/chat/all  – admin: wipe every message + all dm/group rooms
export async function deleteAllChats(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env);
  const err = requireRole(user, 'admin');
  if (err) return err;

  // Delete all messages first
  await env.DB.prepare('DELETE FROM chat_messages').run();

  // Delete dm and group rooms (global + class rooms stay)
  await env.DB.prepare("DELETE FROM chat_room_members WHERE room_id IN (SELECT id FROM chat_rooms WHERE type IN ('dm','group'))").run();
  await env.DB.prepare("DELETE FROM chat_rooms WHERE type IN ('dm','group')").run();

  return json({ ok: true });
}

// WS /api/chat/ws/:room_id
export async function chatWebSocket(request: Request, env: Env, roomId: string): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return json({ error: 'Token required' }, 401);

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
