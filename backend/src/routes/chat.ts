import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import {
  getAllChatRooms,
  getChatRoomsForTeacher,
  getChatRoomsForStudent,
  getChatRoom,
  getRecentMessages,
  insertChatRoom,
  getUser,
} from '../db/queries';

const chat = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/chat/rooms
chat.get('/rooms', async (c) => {
  const user = c.get('user');

  if (user.role === 'admin') {
    return c.json(await getAllChatRooms(c.env.DB));
  }
  if (user.role === 'teacher') {
    return c.json(await getChatRoomsForTeacher(c.env.DB, user.id));
  }
  return c.json(await getChatRoomsForStudent(c.env.DB, user.id));
});

// GET /api/chat/rooms/:id/messages
chat.get('/rooms/:id/messages', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');

  const room = await getChatRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);

  // Access control for class rooms: only members
  if (room.type === 'class' && room.class_id) {
    if (user.role === 'student') {
      const { isClassMember } = await import('../db/queries');
      const member = await isClassMember(c.env.DB, room.class_id, user.id);
      if (!member) return c.json({ error: 'Forbidden' }, 403);
    } else if (user.role === 'teacher') {
      const { getClass } = await import('../db/queries');
      const cls = await getClass(c.env.DB, room.class_id);
      if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    }
  }

  const messages = await getRecentMessages(c.env.DB, roomId, 50);
  return c.json(messages);
});

// POST /api/chat/rooms/dm — DM-Raum erstellen oder bestehenden zurückgeben
chat.post('/rooms/dm', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ target_user_id: string }>();
  const targetId = body.target_user_id;

  if (!targetId || targetId === user.id) {
    return c.json({ error: 'Invalid target user' }, 400);
  }
  const target = await getUser(c.env.DB, targetId);
  if (!target) return c.json({ error: 'User not found' }, 404);

  // Stabiler Raum-ID: kleinere ID zuerst
  const [a, b] = [user.id, targetId].sort();
  const roomId = `dm_${a}_${b}`;
  const roomName = target.name;

  let room = await getChatRoom(c.env.DB, roomId);
  if (!room) {
    room = { id: roomId, name: roomName, type: 'dm', class_id: null };
    await insertChatRoom(c.env.DB, room);
  }
  return c.json(room);
});

// WS /api/chat/ws/:room_id — upgrade to WebSocket via Durable Object
chat.get('/ws/:room_id', async (c) => {
  const roomId = c.req.param('room_id');

  // Auth via query param (WebSocket clients can't set headers easily)
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'Missing token' }, 401);
  }

  const raw = await c.env.SESSIONS.get(token);
  if (!raw) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Check the upgrade header
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  // Route to the correct Durable Object instance (one per room)
  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Forward the request (including token in URL for the DO to parse)
  const url = new URL(c.req.url);
  url.searchParams.set('userId', JSON.parse(raw).id);
  url.searchParams.set('userName', JSON.parse(raw).name);

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

export default chat;
