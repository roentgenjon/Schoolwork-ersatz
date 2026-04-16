import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import assignmentRoutes, { submissionsRouter } from './routes/assignments';
import handoutRoutes from './routes/handouts';
import progressRoutes from './routes/progress';
import studentRoutes from './routes/students';
import chatRoutes from './routes/chat';

// Re-export Durable Object so Cloudflare Workers can find it
export { ChatRoom } from './durable/ChatRoom';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.FRONTEND_URL;
      // Allow configured frontend, localhost (dev), and the same origin
      if (!origin || origin === allowed || origin.startsWith('http://localhost')) {
        return origin ?? '*';
      }
      return allowed;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
    credentials: true,
  })
);

// ── Auth middleware: skip only POST /api/auth/register ───────────────────────
app.use('/api/*', async (c, next) => {
  // Register is the only public endpoint
  if (c.req.method === 'POST' && c.req.path === '/api/auth/register') {
    return next();
  }
  return authMiddleware(c, next);
});

// ── All routes ────────────────────────────────────────────────────────────────
app.route('/api/auth', authRoutes);

// ── Protected routes ──────────────────────────────────────────────────────────
app.route('/api/classes', classRoutes);
app.route('/api/assignments', assignmentRoutes);
app.route('/api/submissions', submissionsRouter);
app.route('/api/handouts', handoutRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/users', studentRoutes);
app.route('/api/chat', chatRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ── Global error handler ──────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
