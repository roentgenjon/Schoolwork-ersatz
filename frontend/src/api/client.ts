const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await (res.json() as Promise<{ error: string }>).catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export function createWebSocket(roomId: string): WebSocket {
  const token = getToken();
  const wsBase = BASE_URL.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/api/chat/ws/${roomId}?token=${token}`);
}

/** Returns an authenticated URL for serving a file from R2. */
export function fileUrl(r2Key: string): string {
  const token = getToken();
  return `${BASE_URL}/api/files/${encodeURIComponent(r2Key)}?token=${token ?? ''}`;
}

/** Uploads a File to R2 via /api/upload, returns the R2 key. */
export async function uploadFile(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await request<{ key: string }>('POST', '/api/upload', {
    name: file.name,
    mime_type: file.type || 'application/octet-stream',
    data,
    size: file.size,
  });
  return res.key;
}
