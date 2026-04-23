import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

const BASE_URL = window.location.hostname.endsWith('github.io')
  ? 'https://schoolwork-backend.jonathanrontgen7.workers.dev/api'
  : '/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user: User, token: string) => {
        localStorage.setItem('token', token)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json() as { user: User }
            set({ user: data.user })
          } else if (res.status === 401) {
            localStorage.removeItem('token')
            set({ user: null, token: null, isAuthenticated: false })
          }
        } catch { /* network error — keep existing state */ }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('token', state.token)
        }
      },
    }
  )
)
