import { useEffect, useState } from 'react'
import { LogOut, Plus, X, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import type { User } from '../types'

interface AppSettings {
  allow_admin_register: boolean
  open_registration: boolean
}

const ROLE_OPTIONS = [
  { value: 'student', label: 'Schüler' },
  { value: 'teacher', label: 'Lehrer' },
  { value: 'admin', label: 'Admin' },
]

const roleLabel = (role: string) =>
  role === 'teacher' ? 'Lehrer' : role === 'admin' ? 'Admin' : 'Schüler'

const roleColor = (role: string) =>
  role === 'teacher' ? '#FF9F0A' : role === 'admin' ? '#BF5AF2' : '#007AFF'

const groups: { label: string; role: string }[] = [
  { label: 'Administratoren', role: 'admin' },
  { label: 'Lehrer', role: 'teacher' },
  { label: 'Schüler', role: 'student' },
]

export default function UsersPage() {
  const { user: me, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<AppSettings>({ allow_admin_register: true, open_registration: true })
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editRoleValue, setEditRoleValue] = useState('')
  const [editNameValue, setEditNameValue] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', role: 'student' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    Promise.all([
      client.get<User[]>('/users'),
      client.get<AppSettings>('/settings'),
    ]).then(([all, s]) => {
      setUsers(Array.isArray(all) ? all : [])
      setSettings(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [isAdmin])

  async function handleRemove(target: User) {
    if (!confirm(`${target.name} wirklich entfernen?`)) return
    setRemoving(target.id)
    try {
      await client.del(`/users/${target.id}`)
      setUsers(prev => prev.filter(u => u.id !== target.id))
    } finally {
      setRemoving(null)
    }
  }

  function startEditRole(u: User) {
    setEditingRole(u.id)
    setEditRoleValue(u.role)
    setEditNameValue(u.name)
  }

  async function saveRole(u: User) {
    const nameChanged = editNameValue.trim() && editNameValue.trim() !== u.name
    const roleChanged = editRoleValue !== u.role
    if (!nameChanged && !roleChanged) { setEditingRole(null); return }
    setSavingRole(true)
    try {
      const body: { role?: string; name?: string } = {}
      if (roleChanged) body.role = editRoleValue
      if (nameChanged) body.name = editNameValue.trim()
      const updated = await client.put<User>(`/users/${u.id}`, body)
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
    } catch { /* ignore */ }
    setSavingRole(false)
    setEditingRole(null)
  }

  async function handleSettingToggle(key: keyof AppSettings) {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    try {
      await client.put<AppSettings>('/settings', updated)
    } catch {
      setSettings(settings)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const newUser = await client.post<User>('/users', {
        name: createForm.name.trim(),
        role: createForm.role,
      })
      setUsers(prev => [newUser, ...prev])
      setCreateForm({ name: '', role: 'student' })
      setShowCreate(false)
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = search.trim()
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    : users

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
        <Header
          title="Nutzerverwaltung"
          actions={
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all active:scale-95 min-h-[36px]"
              style={{ backgroundColor: '#007AFF' }}
            >
              <Plus size={16} />
              Nutzer erstellen
            </button>
          }
        />

        <div className="flex-1 ios-scroll px-4 py-4 space-y-4">

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {groups.map(g => {
              const count = users.filter(u => u.role === g.role).length
              return (
                <div key={g.role} className="flex flex-col items-center py-3 rounded-2xl" style={{ backgroundColor: '#1C1C1E' }}>
                  <span className="text-2xl font-bold" style={{ color: roleColor(g.role) }}>{count}</span>
                  <span className="text-[#8E8E93] text-xs mt-0.5">{g.label}</span>
                </div>
              )
            })}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#1C1C1E' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name suchen…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#48484A]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#8E8E93]"><X size={14} /></button>
            )}
          </div>

          {/* Settings section */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1C1C1E' }}>
            <button
              onClick={() => setShowSettings(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-white font-semibold text-sm">Registrierungs-Einstellungen</span>
              {showSettings ? <ChevronUp size={16} className="text-[#8E8E93]" /> : <ChevronDown size={16} className="text-[#8E8E93]" />}
            </button>
            {showSettings && (
              <div>
                <SettingRow
                  label="Offene Registrierung"
                  description="Nutzer können sich selbst registrieren"
                  value={settings.open_registration}
                  onChange={() => handleSettingToggle('open_registration')}
                />
                <SettingRow
                  label="Admin-Konten erlauben"
                  description="Nutzer können sich als Administrator registrieren"
                  value={settings.allow_admin_register}
                  onChange={() => handleSettingToggle('allow_admin_register')}
                  disabled={!settings.open_registration}
                />
              </div>
            )}
          </div>

          {/* User groups */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Lade Nutzer…</p>
            </div>
          ) : (
            groups.map(({ label, role }) => {
              const group = filteredUsers.filter(u => u.role === role)
              if (group.length === 0) return null
              return (
                <section key={role}>
                  <h3 className="text-[#8E8E93] text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                    {label} ({group.length})
                  </h3>
                  <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1C1C1E' }}>
                    {group.map((u, idx) => {
                      const initials = u.name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)
                      const isMe = u.id === me?.id
                      const isEditing = editingRole === u.id

                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{ borderTop: idx > 0 ? '1px solid #38383A' : 'none' }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                            style={{ backgroundColor: roleColor(u.role) }}
                          >
                            {initials}
                          </div>

                          {/* Name + role */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  value={editNameValue}
                                  onChange={e => setEditNameValue(e.target.value)}
                                  className="text-sm rounded-lg px-2 py-1 outline-none w-full"
                                  style={{ backgroundColor: '#2C2C2E', color: '#fff' }}
                                  placeholder="Name"
                                  autoFocus
                                />
                                <select
                                  value={editRoleValue}
                                  onChange={e => setEditRoleValue(e.target.value)}
                                  className="text-xs rounded-lg px-2 py-1 outline-none appearance-none"
                                  style={{ backgroundColor: '#2C2C2E', color: '#fff' }}
                                >
                                  {ROLE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value} style={{ backgroundColor: '#2C2C2E' }}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <>
                                <p className="text-white font-medium text-sm truncate">
                                  {u.name}{isMe ? ' (ich)' : ''}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: roleColor(u.role) }}>
                                  {roleLabel(u.role)}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          {!isMe && (
                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveRole(u)}
                                    disabled={savingRole}
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E] disabled:opacity-40"
                                    style={{ color: '#34C759' }}
                                    title="Speichern"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingRole(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
                                    style={{ color: '#8E8E93' }}
                                    title="Abbrechen"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => startEditRole(u)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
                                  style={{ color: '#8E8E93' }}
                                  title="Rolle ändern"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemove(u)}
                                disabled={removing === u.id}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E] disabled:opacity-40"
                                style={{ color: '#FF3B30' }}
                                title="Entfernen"
                              >
                                <LogOut size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93] text-sm">
                {search ? 'Keine Nutzer gefunden.' : 'Noch keine Nutzer vorhanden.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div
            className="relative w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 z-10"
            style={{ backgroundColor: '#1C1C1E' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Nutzer erstellen</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#8E8E93]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide block">
                  Name
                </label>
                <input
                  autoFocus
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Max Mustermann"
                  className="px-4 pb-3 pt-1 bg-transparent text-white w-full outline-none min-h-[44px]"
                />
              </div>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide block">
                  Rolle
                </label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                  className="px-4 pb-3 pt-1 bg-transparent text-white w-full outline-none min-h-[44px] appearance-none"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} style={{ backgroundColor: '#2C2C2E' }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-[#FF3B30] text-sm">{createError}</p>}
              <p className="text-[#8E8E93] text-xs">
                Das Konto kann sofort genutzt werden. Der Nutzer meldet sich mit diesem Namen an.
              </p>
              <button
                type="submit"
                disabled={!createForm.name.trim() || creating}
                className="w-full py-4 rounded-xl text-white font-semibold transition-all active:scale-95 disabled:opacity-40 min-h-[52px]"
                style={{ backgroundColor: '#007AFF' }}
              >
                {creating ? 'Wird erstellt…' : 'Konto erstellen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function SettingRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  description: string
  value: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderTop: '1px solid #38383A', opacity: disabled ? 0.4 : 1 }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-[#8E8E93] text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={disabled ? undefined : onChange}
        className="w-12 h-7 rounded-full transition-all duration-200 shrink-0 relative"
        style={{ backgroundColor: value ? '#34C759' : '#38383A' }}
        disabled={disabled}
      >
        <span
          className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: value ? 'calc(100% - 26px)' : '2px' }}
        />
      </button>
    </div>
  )
}
