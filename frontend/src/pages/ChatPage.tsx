import { useEffect, useRef, useState } from 'react'
import { Send, Hash, MessageCircle, Plus, X, Search, Users, User as UserIcon, Trash2 } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useChatStore } from '../store/chatStore'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import type { ChatMessage, ChatRoom, User } from '../types'

type PickerMode = 'dm' | 'group' | null

export default function ChatPage() {
  const { rooms, messages, activeRoom, fetchRooms, setActiveRoom, sendMessage, createDmRoom, createGroupRoom, deleteRoom } =
    useChatStore()
  const { user, isAdmin } = useAuth()
  const [input, setInput] = useState('')
  const [pickerMode, setPickerMode] = useState<PickerMode>(null)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchRooms() }, [fetchRooms])

  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) {
      const globalRoom = rooms.find((r) => r.type === 'global') ?? rooms[0]
      if (globalRoom) setActiveRoom(globalRoom.id)
    }
  }, [rooms, activeRoom, setActiveRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeRoom])

  async function loadUsers() {
    if (users.length === 0) {
      const all = await client.get<User[]>('/users')
      setUsers(Array.isArray(all) ? all : [])
    }
  }

  function openPicker(mode: PickerMode) {
    setPickerMode(mode)
    setSearch('')
    setGroupName('')
    setSelectedMembers([])
    setShowModeMenu(false)
    loadUsers()
  }

  async function startDm(target: User) {
    setCreating(true)
    try {
      const room = await createDmRoom(target)
      setPickerMode(null)
      setActiveRoom(room.id)
    } finally {
      setCreating(false)
    }
  }

  async function startGroup() {
    if (!groupName.trim() || selectedMembers.length === 0) return
    setCreating(true)
    try {
      const room = await createGroupRoom(groupName.trim(), selectedMembers.map(u => u.id))
      setPickerMode(null)
      setActiveRoom(room.id)
    } finally {
      setCreating(false)
    }
  }

  function toggleMember(u: User) {
    setSelectedMembers(prev =>
      prev.find(m => m.id === u.id)
        ? prev.filter(m => m.id !== u.id)
        : [...prev, u]
    )
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Chat löschen?')) return
    try {
      await deleteRoom(roomId)
    } catch { /* ignore */ }
  }

  function canDeleteRoom(room: ChatRoom): boolean {
    if (isAdmin) return room.type !== 'global'
    if (room.type === 'dm') return room.id.includes(user?.id ?? '')
    if (room.type === 'group') return true
    return false
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  const activeMessages: ChatMessage[] = activeRoom ? (messages[activeRoom] ?? []) : []
  const activeRoomData: ChatRoom | undefined = rooms.find((r) => r.id === activeRoom)
  const filteredUsers = users.filter(
    (u) => u.id !== user?.id && u.name.toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = (role: string) =>
    role === 'teacher' ? '#FF9F0A' : role === 'admin' ? '#BF5AF2' : '#007AFF'

  const roomIcon = (room: ChatRoom) => {
    if (room.type === 'global') return <Hash size={15} />
    if (room.type === 'class') return <MessageCircle size={15} />
    if (room.type === 'group') return <Users size={15} />
    return (room.name?.charAt(0) ?? '?')
  }

  const roomColor = (type: string) => {
    if (type === 'global') return { bg: '#007AFF20', fg: '#007AFF' }
    if (type === 'class') return { bg: '#34C75920', fg: '#34C759' }
    if (type === 'group') return { bg: '#BF5AF220', fg: '#BF5AF2' }
    return { bg: '#FF9F0A20', fg: '#FF9F0A' }
  }

  const plusButton = (
    <div className="relative">
      <button
        onClick={() => setShowModeMenu(v => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#2C2C2E] transition-all"
      >
        <Plus size={18} />
      </button>
      {showModeMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowModeMenu(false)} />
          <div
            className="absolute right-0 top-9 z-20 rounded-xl overflow-hidden shadow-lg"
            style={{ backgroundColor: '#2C2C2E', minWidth: 160 }}
          >
            <button
              onClick={() => openPicker('dm')}
              className="flex items-center gap-2 w-full px-4 py-3 text-white text-sm hover:bg-[#38383A]"
            >
              <UserIcon size={15} /> Direktnachricht
            </button>
            <button
              onClick={() => openPicker('group')}
              className="flex items-center gap-2 w-full px-4 py-3 text-white text-sm hover:bg-[#38383A]"
              style={{ borderTop: '1px solid #38383A' }}
            >
              <Users size={15} /> Gruppe erstellen
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex-col hidden md:flex" style={{ borderRight: '1px solid #38383A', backgroundColor: '#1C1C1E' }}>
          <div className="px-4 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #38383A' }}>
            <h2 className="text-white font-semibold">Nachrichten</h2>
            {plusButton}
          </div>
          <div className="flex-1 ios-scroll py-2">
            {rooms.map((room) => {
              const colors = roomColor(room.type)
              return (
                <div
                  key={room.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl mx-1 cursor-pointer transition-all duration-200"
                  style={{ width: 'calc(100% - 8px)', backgroundColor: activeRoom === room.id ? '#2C2C2E' : 'transparent' }}
                  onClick={() => setActiveRoom(room.id)}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                    style={{ backgroundColor: colors.bg, color: colors.fg }}>
                    {roomIcon(room)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {room.name ?? room.id}
                    </p>
                    <p className="text-[#8E8E93] text-xs">
                      {room.type === 'global' ? 'Globaler Chat' : room.type === 'class' ? 'Klasse' : room.type === 'group' ? 'Gruppe' : 'Direktnachricht'}
                    </p>
                  </div>
                  {(room.unread_count ?? 0) > 0 && (
                    <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: '#FF3B30', minWidth: 20, textAlign: 'center' }}>
                      {room.unread_count}
                    </span>
                  )}
                  {canDeleteRoom(room) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id) }}
                      className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: '#FF3B30' }}
                      title="Chat löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            title={activeRoomData?.name ?? 'Chat'}
            actions={
              <div className="md:hidden">
                {plusButton}
              </div>
            }
          />

          <div className="flex-1 ios-scroll px-4 py-4 space-y-3">
            {activeMessages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-[#8E8E93] text-sm">Noch keine Nachrichten.</p>
              </div>
            )}
            {activeMessages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              const initials = (msg.sender_name ?? '?').split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2)
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mb-0.5"
                      style={{ backgroundColor: roleColor(msg.sender_role ?? '') }}>
                      {initials}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isMe && <span className="text-[#8E8E93] text-xs mb-1 px-1">{msg.sender_name}</span>}
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={{ backgroundColor: isMe ? '#007AFF' : '#2C2C2E', color: '#fff', borderBottomRightRadius: isMe ? 6 : 16, borderBottomLeftRadius: isMe ? 16 : 6 }}>
                      {msg.content}
                    </div>
                    <span className="text-[#48484A] text-xs mt-1 px-1">
                      {new Date(msg.created_at * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderTop: '1px solid #38383A' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht schreiben…"
              className="flex-1 px-4 py-3 rounded-full text-white text-sm outline-none min-h-[44px]"
              style={{ backgroundColor: '#2C2C2E', border: '1px solid #38383A' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#007AFF')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#38383A')}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#007AFF' }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* DM / Group Picker Modal */}
      {pickerMode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPickerMode(null)} />
          <div className="relative w-full md:max-w-sm rounded-t-3xl md:rounded-2xl z-10 flex flex-col"
            style={{ backgroundColor: '#1C1C1E', maxHeight: '75vh' }}>

            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #38383A' }}>
              <h3 className="text-white font-semibold">
                {pickerMode === 'dm' ? 'Direktnachricht' : 'Gruppe erstellen'}
              </h3>
              <button onClick={() => setPickerMode(null)} className="text-[#8E8E93]"><X size={20} /></button>
            </div>

            {pickerMode === 'group' && (
              <div className="px-4 pt-3 shrink-0">
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide block">Gruppenname</label>
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="z.B. Projekt Mathe"
                    className="px-4 pb-3 pt-1 bg-transparent text-white w-full outline-none min-h-[44px]"
                  />
                </div>
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedMembers.map(m => (
                      <span key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                        style={{ backgroundColor: '#007AFF' }}>
                        {m.name}
                        <button onClick={() => toggleMember(m)}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#2C2C2E' }}>
                <Search size={15} className="text-[#8E8E93] shrink-0" />
                <input
                  autoFocus={pickerMode === 'dm'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name suchen…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#48484A]"
                />
              </div>
            </div>

            <div className="flex-1 ios-scroll pb-4">
              {filteredUsers.length === 0 && (
                <p className="text-[#8E8E93] text-sm text-center py-8">Keine Nutzer gefunden.</p>
              )}
              {filteredUsers.map((u) => {
                const isSelected = selectedMembers.find(m => m.id === u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => pickerMode === 'dm' ? startDm(u) : toggleMember(u)}
                    disabled={creating && pickerMode === 'dm'}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#2C2C2E] transition-all disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                      style={{ backgroundColor: roleColor(u.role) }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-[#8E8E93] text-xs">{u.role === 'teacher' ? 'Lehrer' : u.role === 'admin' ? 'Admin' : 'Schüler'}</p>
                    </div>
                    {pickerMode === 'group' && (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? '#007AFF' : '#48484A', backgroundColor: isSelected ? '#007AFF' : 'transparent' }}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {pickerMode === 'group' && (
              <div className="px-5 pb-5 pt-3 shrink-0" style={{ borderTop: '1px solid #38383A' }}>
                <button
                  onClick={startGroup}
                  disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
                  className="w-full py-3.5 rounded-xl text-white font-semibold transition-all active:scale-95 disabled:opacity-40"
                  style={{ backgroundColor: '#007AFF' }}
                >
                  {creating ? 'Wird erstellt…' : `Gruppe erstellen (${selectedMembers.length} Mitglieder)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
