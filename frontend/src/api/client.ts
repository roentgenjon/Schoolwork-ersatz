const WORKER_URL = 'https://schoolwork-backend.jonathanrontgen7.workers.dev'
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io')
const BASE_URL = IS_GITHUB_PAGES ? WORKER_URL : '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function removeToken(): void {
  localStorage.removeItem('token')
}

function redirectToOnboarding(): void {
  window.location.hash = '#/onboarding'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body !== undefined) options.body = JSON.stringify(body)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new Error('Backend nicht erreichbar. Bitte Internetverbindung prüfen.')
  }

  if (response.status === 401) {
    removeToken()
    redirectToOnboarding()
    throw new Error('Nicht angemeldet')
  }

  if (!response.ok) {
    let errorMessage = `Fehler ${response.status}`
    try {
      const errorData = (await response.json()) as { error?: string }
      if (errorData.error) errorMessage = errorData.error
    } catch { /* ignore */ }
    throw new Error(errorMessage)
  }

  const text = await response.text()
  if (!text) return undefined as unknown as T
  return JSON.parse(text) as T
}

export const client = {
  get<T>(path: string): Promise<T> { return request<T>('GET', path) },
  post<T>(path: string, body?: unknown): Promise<T> { return request<T>('POST', path, body) },
  put<T>(path: string, body?: unknown): Promise<T> { return request<T>('PUT', path, body) },
  del<T>(path: string): Promise<T> { return request<T>('DELETE', path) },
}
