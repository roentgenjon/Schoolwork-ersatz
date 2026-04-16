import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { getAllUsers, deleteUser, getUser } from '../db/queries';

const students = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/users — admin only
students.get('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const users = await getAllUsers(c.env.DB);
  return c.json(users);
});

// DELETE /api/users/:id — admin only
students.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');

  // Prevent self-deletion
  if (id === user.id) return c.json({ error: 'Cannot delete your own account' }, 400);

  const target = await getUser(c.env.DB, id);
  if (!target) return c.json({ error: 'User not found' }, 404);

  await deleteUser(c.env.DB, id);
  return c.json({ success: true });
});

export default students;
