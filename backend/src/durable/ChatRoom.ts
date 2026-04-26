import type { Env } from '../types';

interface Session {
  socket: WebSocket;
  userId: string;
  userName: string;
  userRole: string;
}

export class ChatRoom {
  private sessions: Session[] = [];
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const roomId = url.pathname.split('/').pop()!;

    if (!token) return new Response('Token required', { status: 401 });

    const userId = await this.env.SESSIONS.get(`session:${token}`);
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const user = await this.env.DB.prepare('SELECT id, name, role FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; name: string; role: string }>();
    if (!user) return new Response('User not found', { status: 401 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    const session: Session = { socket: server, userId: user.id, userName: user.name, userRole: user.role };
    this.sessions.push(session);

    server.addEventListener('message', async (evt) => {
      try {
        const data = JSON.parse(evt.data as string);
        if (data.type === 'message' && data.content?.trim()) {
          const msgId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
          const now = Math.floor(Date.now() / 1000);

          await this.env.DB.prepare(
            'INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(msgId, roomId, user.id, data.content.trim(), now).run();

          const broadcast = JSON.stringify({
            type: 'message',
            id: msgId,
            room_id: roomId,
            sender_id: user.id,
            sender_name: user.name,
            sender_role: user.role,
            content: data.content.trim(),
            created_at: now,
          });

          this.sessions.forEach((s) => {
            try { s.socket.send(broadcast); } catch {}
          });
        }
      } catch {}
    });

    server.addEventListener('close', () => {
      this.sessions = this.sessions.filter((s) => s !== session);
    });

    server.addEventListener('error', () => {
      this.sessions = this.sessions.filter((s) => s !== session);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
