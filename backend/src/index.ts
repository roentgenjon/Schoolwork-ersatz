import type { Env } from './types';
import { ChatRoom } from './durable/ChatRoom';
import { register, login, logout, me } from './routes/auth';
import { listUsers, createUser, deleteUser, forceLogout, updatePermissions, updateRole } from './routes/users';
import { readSettings, writeSettings } from './routes/settings';
import { listClasses, createClass, getClass, updateClass, deleteClass, addStudent, removeStudent } from './routes/classes';
import {
  listAssignments, createAssignment, getAssignment, updateAssignment, deleteAssignment,
  addAttachment, deleteAttachment, listSubmissions, updateSubmission, upsertSubmission,
  listSubmissionFiles, uploadSubmissionFile, deleteSubmissionFile,
} from './routes/assignments';
import { listHandouts, createHandout, deleteHandout } from './routes/handouts';
import { getProgress } from './routes/progress';
import { listRooms, createRoom, deleteRoom, deleteAllChats, getRoomMessages, chatWebSocket } from './routes/chat';

export { ChatRoom };

function cors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin') || env.FRONTEND_URL || '*';

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), origin);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    let response: Response;

    try {
      // Auth routes
      if (path === '/api/auth/register' && method === 'POST') response = await register(request, env);
      else if (path === '/api/auth/login' && method === 'POST') response = await login(request, env);
      else if (path === '/api/auth/logout' && method === 'POST') response = await logout(request, env);
      else if (path === '/api/auth/me' && method === 'GET') response = await me(request, env);

      // Settings
      else if (path === '/api/settings' && method === 'GET') response = await readSettings(request, env);
      else if (path === '/api/settings' && method === 'PUT') response = await writeSettings(request, env);

      // User management (admin)
      else if (path === '/api/users' && method === 'GET') response = await listUsers(request, env);
      else if (path === '/api/users' && method === 'POST') response = await createUser(request, env);
      else if (path.match(/^\/api\/users\/([^/]+)$/) && method === 'DELETE') {
        const [, id] = path.match(/^\/api\/users\/([^/]+)$/)!;
        response = await deleteUser(request, env, id);
      }
      else if (path.match(/^\/api\/users\/([^/]+)\/logout$/) && method === 'POST') {
        const [, id] = path.match(/^\/api\/users\/([^/]+)\/logout$/)!;
        response = await forceLogout(request, env, id);
      }
      else if (path.match(/^\/api\/users\/([^/]+)\/permissions$/) && method === 'PUT') {
        const [, id] = path.match(/^\/api\/users\/([^/]+)\/permissions$/)!;
        response = await updatePermissions(request, env, id);
      }
      else if (path.match(/^\/api\/users\/([^/]+)\/role$/) && method === 'PUT') {
        const [, id] = path.match(/^\/api\/users\/([^/]+)\/role$/)!;
        response = await updateRole(request, env, id);
      }

      // Classes
      else if (path === '/api/classes' && method === 'GET') response = await listClasses(request, env);
      else if (path === '/api/classes' && method === 'POST') response = await createClass(request, env);
      else if (path.match(/^\/api\/classes\/([^/]+)$/) && method === 'GET') {
        const [, id] = path.match(/^\/api\/classes\/([^/]+)$/)!;
        response = await getClass(request, env, id);
      }
      else if (path.match(/^\/api\/classes\/([^/]+)$/) && method === 'PUT') {
        const [, id] = path.match(/^\/api\/classes\/([^/]+)$/)!;
        response = await updateClass(request, env, id);
      }
      else if (path.match(/^\/api\/classes\/([^/]+)$/) && method === 'DELETE') {
        const [, id] = path.match(/^\/api\/classes\/([^/]+)$/)!;
        response = await deleteClass(request, env, id);
      }
      else if (path.match(/^\/api\/classes\/([^/]+)\/students$/) && method === 'POST') {
        const [, id] = path.match(/^\/api\/classes\/([^/]+)\/students$/)!;
        response = await addStudent(request, env, id);
      }
      else if (path.match(/^\/api\/classes\/([^/]+)\/students\/([^/]+)$/) && method === 'DELETE') {
        const [, classId, studentId] = path.match(/^\/api\/classes\/([^/]+)\/students\/([^/]+)$/)!;
        response = await removeStudent(request, env, classId, studentId);
      }

      // Assignments
      else if (path === '/api/assignments' && method === 'GET') response = await listAssignments(request, env);
      else if (path === '/api/assignments' && method === 'POST') response = await createAssignment(request, env);
      else if (path.match(/^\/api\/assignments\/([^/]+)$/) && method === 'GET') {
        const [, id] = path.match(/^\/api\/assignments\/([^/]+)$/)!;
        response = await getAssignment(request, env, id);
      }
      else if (path.match(/^\/api\/assignments\/([^/]+)$/) && method === 'PUT') {
        const [, id] = path.match(/^\/api\/assignments\/([^/]+)$/)!;
        response = await updateAssignment(request, env, id);
      }
      else if (path.match(/^\/api\/assignments\/([^/]+)$/) && method === 'DELETE') {
        const [, id] = path.match(/^\/api\/assignments\/([^/]+)$/)!;
        response = await deleteAssignment(request, env, id);
      }
      else if (path.match(/^\/api\/assignments\/([^/]+)\/attachments$/) && method === 'POST') {
        const [, id] = path.match(/^\/api\/assignments\/([^/]+)\/attachments$/)!;
        response = await addAttachment(request, env, id);
      }
      else if (path.match(/^\/api\/assignments\/([^/]+)\/attachments\/([^/]+)$/) && method === 'DELETE') {
        const [, aId, attId] = path.match(/^\/api\/assignments\/([^/]+)\/attachments\/([^/]+)$/)!;
        response = await deleteAttachment(request, env, aId, attId);
      }
      else if (path.match(/^\/api\/assignments\/([^/]+)\/submissions$/) && method === 'GET') {
        const [, id] = path.match(/^\/api\/assignments\/([^/]+)\/submissions$/)!;
        response = await listSubmissions(request, env, id);
      }
      else if (path === '/api/submissions' && method === 'POST') response = await upsertSubmission(request, env);
      else if (path.match(/^\/api\/submissions\/([^/]+)$/) && method === 'PUT') {
        const [, id] = path.match(/^\/api\/submissions\/([^/]+)$/)!;
        response = await updateSubmission(request, env, id);
      }
      else if (path.match(/^\/api\/submissions\/([^/]+)\/files$/) && method === 'GET') {
        const [, id] = path.match(/^\/api\/submissions\/([^/]+)\/files$/)!;
        response = await listSubmissionFiles(request, env, id);
      }
      else if (path.match(/^\/api\/submissions\/([^/]+)\/files$/) && method === 'POST') {
        const [, id] = path.match(/^\/api\/submissions\/([^/]+)\/files$/)!;
        response = await uploadSubmissionFile(request, env, id);
      }
      else if (path.match(/^\/api\/submission-files\/([^/]+)$/) && method === 'DELETE') {
        const [, id] = path.match(/^\/api\/submission-files\/([^/]+)$/)!;
        response = await deleteSubmissionFile(request, env, id);
      }

      // Handouts
      else if (path === '/api/handouts' && method === 'GET') response = await listHandouts(request, env);
      else if (path === '/api/handouts' && method === 'POST') response = await createHandout(request, env);
      else if (path.match(/^\/api\/handouts\/([^/]+)$/) && method === 'DELETE') {
        const [, id] = path.match(/^\/api\/handouts\/([^/]+)$/)!;
        response = await deleteHandout(request, env, id);
      }

      // Progress
      else if (path.match(/^\/api\/progress\/([^/]+)$/) && method === 'GET') {
        const [, classId] = path.match(/^\/api\/progress\/([^/]+)$/)!;
        response = await getProgress(request, env, classId);
      }

      // Chat
      else if (path === '/api/chat/all' && method === 'DELETE') response = await deleteAllChats(request, env);
      else if (path === '/api/chat/rooms' && method === 'GET') response = await listRooms(request, env);
      else if (path === '/api/chat/rooms' && method === 'POST') response = await createRoom(request, env);
      else if (path.match(/^\/api\/chat\/rooms\/([^/]+)$/) && method === 'DELETE') {
        const [, roomId] = path.match(/^\/api\/chat\/rooms\/([^/]+)$/)!;
        response = await deleteRoom(request, env, roomId);
      }
      else if (path.match(/^\/api\/chat\/rooms\/([^/]+)\/messages$/) && method === 'GET') {
        const [, roomId] = path.match(/^\/api\/chat\/rooms\/([^/]+)\/messages$/)!;
        response = await getRoomMessages(request, env, roomId);
      }
      else if (path.match(/^\/api\/chat\/ws\/([^/]+)$/)) {
        const [, roomId] = path.match(/^\/api\/chat\/ws\/([^/]+)$/)!;
        response = await chatWebSocket(request, env, roomId);
      }

      else response = notFound();
    } catch (e: any) {
      console.error(e);
      response = new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Don't add CORS to WebSocket upgrade responses
    if (response.status === 101) return response;
    return cors(response, origin);
  },
};
