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

// PUT /api/users/:id — admin changes name and/or role
students.put('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');
  if (id === user.id) return c.json({ error: 'Eigenes Konto kann nicht geändert werden' }, 400);

  const target = await getUser(c.env.DB, id);
  if (!target) return c.json({ error: 'User not found' }, 404);

  const body = await c.req.json<{ role?: string; name?: string }>();

  const sets: string[] = [];
  const values: unknown[] = [];

  if (body.name?.trim()) {
    sets.push('name = ?');
    values.push(body.name.trim());
  }

  if (body.role) {
    if (!['admin', 'teacher', 'student'].includes(body.role)) {
      return c.json({ error: 'Ungültige Rolle' }, 400);
    }
    sets.push('role = ?');
    values.push(body.role);
  }

  if (sets.length === 0) return c.json({ error: 'Keine Felder angegeben' }, 400);

  values.push(id);
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  const updated = await getUser(c.env.DB, id);
  return c.json(updated);
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
