import { useState } from 'react'
import { clsx } from 'clsx'
import { client } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { Role, User } from '../../types'

interface NameInputScreenProps {
  role: Role
  isFirstUser?: boolean
  isClosedMode?: boolean
}

interface RegisterResponse {
  user: User
  token: string
}

export default function NameInputScreen({ role, isFirstUser = false, isClosedMode = false }: NameInputScreenProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const data = await client.post<RegisterResponse>('/auth/register', { name: name.trim(), role })
      login(data.user, data.token)
    } catch (err) {
      setError((err as Error).message || 'Anmeldung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-white text-center mb-2">
          {isFirstUser ? 'Admin-Konto erstellen' : isClosedMode ? 'Anmelden' : 'Wie heißt du?'}
        </h2>
        <p className="text-[#8E8E93] text-center mb-10">
          {isFirstUser
            ? 'Du bist der erste Nutzer und wirst automatisch Administrator.'
            : isClosedMode
              ? 'Gib deinen Namen ein wie er vom Administrator eingetragen wurde.'
              : 'Gib deinen Namen ein, um dein Konto zu erstellen.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="flex flex-col rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1C1C1E', border: '1px solid #38383A' }}
          >
            <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              autoComplete="name"
              autoCapitalize="words"
              autoFocus
              className="px-4 pb-3 pt-1 bg-transparent text-white text-lg placeholder-[#48484A] min-h-[44px]"
            />
          </div>

          {error && (
            <p className="text-[#FF3B30] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className={clsx(
              'mt-4 px-12 py-4 rounded-full font-semibold text-lg transition-all duration-200 ease-in-out min-h-[56px]',
              name.trim() && !loading ? 'text-white active:scale-95' : 'text-[#8E8E93] cursor-not-allowed'
            )}
            style={{ backgroundColor: name.trim() && !loading ? '#007AFF' : '#2C2C2E' }}
          >
            {loading ? 'Wird geladen...' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
