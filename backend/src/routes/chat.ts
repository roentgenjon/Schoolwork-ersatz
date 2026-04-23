import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import {
  getAllChatRooms,
  getChatRoomsForTeacher,
  getChatRoomsForStudent,
  getChatRoom,
  getRecentMessages,
  insertChatRoom,
  insertChatRoomMember,
  getChatRoomMemberIds,
  deleteChatRoom,
  getUser,
  isClassMember,
  getClass,
} from '../db/queries';

const chat = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/chat/rooms
chat.get('/rooms', async (c) => {
  const user = c.get('user');
  if (user.role === 'admin') return c.json(await getAllChatRooms(c.env.DB));
  if (user.role === 'teacher') return c.json(await getChatRoomsForTeacher(c.env.DB, user.id));
  return c.json(await getChatRoomsForStudent(c.env.DB, user.id));
});

// GET /api/chat/rooms/:id/messages
chat.get('/rooms/:id/messages', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');
  const room = await getChatRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);

  // Admin kann alles sehen
  if (user.role !== 'admin') {
    if (room.type === 'class' && room.class_id) {
      if (user.role === 'student') {
        const member = await isClassMember(c.env.DB, room.class_id, user.id);
        if (!member) return c.json({ error: 'Forbidden' }, 403);
      } else if (user.role === 'teacher') {
        const cls = await getClass(c.env.DB, room.class_id);
        if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
      }
    }
    if (room.type === 'group') {
      const members = await getChatRoomMemberIds(c.env.DB, roomId);
      if (!members.includes(user.id)) return c.json({ error: 'Forbidden' }, 403);
    }
    if (room.type === 'dm' && !roomId.includes(user.id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  const messages = await getRecentMessages(c.env.DB, roomId, 50);
  return c.json(messages);
});

// POST /api/chat/rooms/dm
chat.post('/rooms/dm', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ target_user_id: string }>();
  const targetId = body.target_user_id;
  if (!targetId || targetId === user.id) return c.json({ error: 'Invalid target user' }, 400);
  const target = await getUser(c.env.DB, targetId);
  if (!target) return c.json({ error: 'User not found' }, 404);

  const [a, b] = [user.id, targetId].sort();
  const roomId = `dm_${a}_${b}`;
  let room = await getChatRoom(c.env.DB, roomId);
  if (!room) {
    room = { id: roomId, name: target.name, type: 'dm', class_id: null };
    await insertChatRoom(c.env.DB, room);
  }
  return c.json(room);
});

// POST /api/chat/rooms/group
chat.post('/rooms/group', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; member_ids: string[] }>();
  if (!body.name?.trim()) return c.json({ error: 'Name erforderlich' }, 400);

  const roomId = `group_${crypto.randomUUID()}`;
  const room = { id: roomId, name: body.name.trim(), type: 'group' as const, class_id: null };
  await insertChatRoom(c.env.DB, room);

  const memberIds = [...new Set([user.id, ...(body.member_ids ?? [])])];
  for (const memberId of memberIds) {
    await insertChatRoomMember(c.env.DB, roomId, memberId);
  }
  return c.json(room);
});

// DELETE /api/chat/rooms/:id
chat.delete('/rooms/:id', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');

  const room = await getChatRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);

  if (room.type === 'global') {
    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  } else if (room.type === 'class') {
    if (user.role === 'student') return c.json({ error: 'Forbidden' }, 403);
    if (user.role === 'teacher' && room.class_id) {
      const cls = await getClass(c.env.DB, room.class_id);
      if (!cls || cls.teacher_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    }
  } else if (room.type === 'dm') {
    if (!roomId.includes(user.id) && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
  } else if (room.type === 'group') {
    if (user.role !== 'admin') {
      const members = await getChatRoomMemberIds(c.env.DB, roomId);
      if (!members.includes(user.id)) return c.json({ error: 'Forbidden' }, 403);
    }
  }

  await deleteChatRoom(c.env.DB, roomId);
  return c.json({ success: true });
});

// WS /api/chat/ws/:room_id
chat.get('/ws/:room_id', async (c) => {
  const roomId = c.req.param('room_id');
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Missing token' }, 401);

  const raw = await c.env.SESSIONS.get(token);
  if (!raw) return c.json({ error: 'Invalid or expired token' }, 401);

  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);
  const url = new URL(c.req.url);
  const session = JSON.parse(raw);
  url.searchParams.set('userId', session.id);
  url.searchParams.set('userName', session.name);
  url.searchParams.set('userRole', session.role);

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

export default chat;
