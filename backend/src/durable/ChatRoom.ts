import type { Env } from '../types';
import { insertChatMessage } from '../db/queries';

interface SessionMeta {
  userId: string;
  userName: string;
  userRole: string;
  roomId: string;
}

interface WsMessage {
  type: 'message' | 'join' | 'leave';
  data: Record<string, unknown>;
}

export class ChatRoom implements DurableObject {
  private sessions: Map<WebSocket, SessionMeta> = new Map();
  private env: Env;
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // Restore WebSocket connections that survived hibernation
    this.state.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment() as SessionMeta | null;
      if (meta) this.sessions.set(ws, meta);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1] ?? 'unknown';
    const userId = url.searchParams.get('userId') ?? 'anonymous';
    const userName = url.searchParams.get('userName') ?? 'Anonymous';
    const userRole = url.searchParams.get('userRole') ?? 'student';

    // Upgrade to WebSocket
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);

    const meta: SessionMeta = { userId, userName, userRole, roomId };
    server.serializeAttachment(meta);
    this.sessions.set(server, meta);

    // Announce join to all other clients
    this.broadcast(
      {
        type: 'join',
        data: { userId, userName, timestamp: Math.floor(Date.now() / 1000) },
      },
      server
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const meta = this.sessions.get(ws);
    if (!meta) return;

    let payload: { content?: string };
    try {
      payload = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid JSON' } }));
      return;
    }

    if (!payload.content) {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'content is required' } }));
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const messageId = crypto.randomUUID();

    // Persist to D1
    try {
      await insertChatMessage(this.env.DB, {
        id: messageId,
        room_id: meta.roomId,
        sender_id: meta.userId,
        content: payload.content,
        created_at: now,
      });
    } catch {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Failed to save message' } }));
      return;
    }

    // Broadcast to all connected clients (including sender)
    const outgoing: WsMessage = {
      type: 'message',
      data: {
        id: messageId,
        room_id: meta.roomId,
        sender_id: meta.userId,
        sender_name: meta.userName,
        sender_role: meta.userRole,
        content: payload.content,
        created_at: now,
      },
    };
    this.broadcast(outgoing);
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
    const meta = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (meta) {
      this.broadcast({
        type: 'leave',
        data: { userId: meta.userId, userName: meta.userName, timestamp: Math.floor(Date.now() / 1000) },
      });
    }

    try {
      ws.close();
    } catch {
      // Already closed
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const meta = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (meta) {
      this.broadcast({
        type: 'leave',
        data: { userId: meta.userId, userName: meta.userName, timestamp: Math.floor(Date.now() / 1000) },
      });
    }

    try {
      ws.close();
    } catch {
      // Already closed
    }
  }

  private broadcast(message: WsMessage, exclude?: WebSocket): void {
    const payload = JSON.stringify(message);
    for (const [ws] of this.sessions) {
      if (ws === exclude) continue;
      try {
        ws.send(payload);
      } catch {
        // Dead connection — remove it
        this.sessions.delete(ws);
      }
    }
  }
}
