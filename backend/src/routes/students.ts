import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { getAllUsers, deleteUser, getUser, insertUser } from '../db/queries';
import type { User, UserRole } from '../types';

const students = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/users
students.get('/', async (c) => {
  const users = await getAllUsers(c.env.DB);
  return c.json(users);
});

// POST /api/users — admin legt Konto vor (kein Token, kein Login)
students.post('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<{ name?: string; role?: string }>();
  if (!body.name?.trim()) return c.json({ error: 'Name erforderlich' }, 400);
  if (!['admin', 'teacher', 'student'].includes(body.role ?? '')) {
    return c.json({ error: 'Ungültige Rolle' }, 400);
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    role: body.role as UserRole,
    created_at: Math.floor(Date.now() / 1000),
  };
  await insertUser(c.env.DB, newUser);
  return c.json(newUser, 201);
});

// DELETE /api/users/:id — admin only
students.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');
  if (id === user.id) return c.json({ error: 'Cannot delete your own account' }, 400);

  const target = await getUser(c.env.DB, id);
  if (!target) return c.json({ error: 'User not found' }, 404);

  await deleteUser(c.env.DB, id);
  return c.json({ success: true });
});

export default students;
