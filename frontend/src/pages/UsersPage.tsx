import { useEffect, useState } from 'react'
import { LogOut, Trash2 } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import type { User } from '../types'

export default function UsersPage() {
  const { user: me, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    client.get<User[]>('/users').then((all) => {
      setUsers(Array.isArray(all) ? all : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [isAdmin])

  async function handleRemove(target: User) {
    if (!confirm(`${target.name} wirklich abmelden und entfernen?`)) return
    setRemoving(target.id)
    try {
      await client.del(`/users/${target.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    } finally {
      setRemoving(null)
    }
  }

  const roleLabel = (role: string) =>
    role === 'teacher' ? 'Lehrer' : role === 'admin' ? 'Admin' : 'Schüler'

  const roleColor = (role: string) =>
    role === 'teacher' ? '#FF9F0A' : role === 'admin' ? '#BF5AF2' : '#007AFF'

  const groups: { label: string; role: string }[] = [
    { label: 'Administratoren', role: 'admin' },
    { label: 'Lehrer', role: 'teacher' },
    { label: 'Schüler', role: 'student' },
  ]

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-[#8E8E93]">Kein Zugriff.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header title="Nutzerverwaltung" />
        <div className="flex-1 ios-scroll px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Lade Nutzer…</p>
            </div>
          )}
          {!loading && groups.map(({ label, role }) => {
            const group = users.filter((u) => u.role === role)
            if (group.length === 0) return null
            return (
              <section key={role}>
                <h3 className="text-[#8E8E93] text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                  {label} ({group.length})
                </h3>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#1C1C1E' }}
                >
                  {group.map((u, idx) => {
                    const initials = u.name
                      .split(' ')
                      .map((p) => p[0] ?? '')
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                    const isMe = u.id === me?.id
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{
                          borderTop: idx > 0 ? '1px solid #38383A' : 'none',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                          style={{ backgroundColor: roleColor(u.role) }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {u.name}{isMe ? ' (ich)' : ''}
                          </p>
                          <p className="text-[#8E8E93] text-xs">{roleLabel(u.role)}</p>
                        </div>
                        {!isMe && (
                          <button
                            onClick={() => handleRemove(u)}
                            disabled={removing === u.id}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E] disabled:opacity-40"
                            title="Abmelden & entfernen"
                            style={{ color: '#FF3B30' }}
                          >
                            {u.role === 'student' ? <LogOut size={17} /> : <Trash2 size={17} />}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
          {!loading && users.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93] text-sm">Keine Nutzer vorhanden.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
