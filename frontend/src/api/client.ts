import { mockRequest } from './mock'

const BASE_URL = '/api'

// Automatisch Mock-Modus wenn auf GitHub Pages oder Backend nicht erreichbar
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io')
  || window.location.hostname.endsWith('github.com')

let useMock = IS_GITHUB_PAGES

function getToken(): string | null {
  return localStorage.getItem('token')
}

function removeToken(): void {
  localStorage.removeItem('token')
}

function redirectToOnboarding(): void {
  window.location.hash = '#/onboarding'
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken()

  // Mock-Modus: direkt die Mock-API aufrufen
  if (useMock) {
    return mockRequest<T>(method, path, body ?? null, token)
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body !== undefined) options.body = JSON.stringify(body)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    // Netzwerkfehler → auf Mock umschalten
    console.warn('Backend nicht erreichbar, wechsle zu Mock-Modus')
    useMock = true
    return mockRequest<T>(method, path, body ?? null, token)
  }

  // 404/405 von GitHub Pages → Mock
  if (response.status === 404 || response.status === 405) {
    useMock = true
    return mockRequest<T>(method, path, body ?? null, token)
  }

  if (response.status === 401) {
    removeToken()
    redirectToOnboarding()
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`
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
