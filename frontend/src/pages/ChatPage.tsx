import { useEffect, useRef, useState } from 'react'
import { Send, Hash, MessageCircle, Plus, X, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useChatStore } from '../store/chatStore'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import type { ChatMessage, ChatRoom, User } from '../types'

export default function ChatPage() {
  const { rooms, messages, activeRoom, fetchRooms, setActiveRoom, sendMessage, createDmRoom } =
    useChatStore()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [showDmPicker, setShowDmPicker] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [creatingDm, setCreatingDm] = useState(false)
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

  async function openDmPicker() {
    setShowDmPicker(true)
    setSearch('')
    if (users.length === 0) {
      const all = await client.get<User[]>('/users')
      setUsers(Array.isArray(all) ? all : [])
    }
  }

  async function startDm(target: User) {
    setCreatingDm(true)
    const room = await createDmRoom(target)
    setCreatingDm(false)
    setShowDmPicker(false)
    setActiveRoom(room.id)
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

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Room sidebar */}
        <div
          className="w-64 shrink-0 flex-col hidden md:flex"
          style={{ borderRight: '1px solid #38383A', backgroundColor: '#1C1C1E' }}
        >
          <div
            className="px-4 py-4 shrink-0 flex items-center justify-between"
            style={{ borderBottom: '1px solid #38383A' }}
          >
            <h2 className="text-white font-semibold">Nachrichten</h2>
            <button
              onClick={openDmPicker}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#2C2C2E] transition-all"
              title="Neue Nachricht"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 ios-scroll py-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 rounded-xl mx-1"
                style={{
                  width: 'calc(100% - 8px)',
                  backgroundColor: activeRoom === room.id ? '#2C2C2E' : 'transparent',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                  style={{
                    backgroundColor: room.type === 'global' ? '#007AFF20' :
                      room.type === 'class' ? '#34C75920' : '#FF9F0A20',
                    color: room.type === 'global' ? '#007AFF' :
                      room.type === 'class' ? '#34C759' : '#FF9F0A',
                  }}
                >
                  {room.type === 'global' ? <Hash size={15} /> :
                    room.type === 'class' ? <MessageCircle size={15} /> :
                    (room.name?.charAt(0) ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {room.name ?? (room.type === 'global' ? 'Alle' : room.id)}
                  </p>
                  <p className="text-[#8E8E93] text-xs">
                    {room.type === 'global' ? 'Globaler Chat' :
                      room.type === 'class' ? 'Klasse' : 'Direktnachricht'}
                  </p>
                </div>
                {(room.unread_count ?? 0) > 0 && (
                  <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#FF3B30', minWidth: 20, textAlign: 'center' }}>
                    {room.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          <Header
            title={activeRoomData?.name ?? 'Chat'}
            actions={
              <button
                onClick={openDmPicker}
                className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#007AFF]"
                style={{ backgroundColor: '#007AFF20' }}
              >
                <Plus size={18} />
              </button>
            }
          />

          {/* Messages */}
          <div className="flex-1 ios-scroll px-4 py-4 space-y-3">
            {activeMessages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-[#8E8E93] text-sm">Noch keine Nachrichten.</p>
              </div>
            )}
            {activeMessages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              const initials = (msg.sender_name ?? '?')
                .split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2)

              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mb-0.5"
                      style={{ backgroundColor: roleColor(msg.sender_role ?? '') }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isMe && (
                      <span className="text-[#8E8E93] text-xs mb-1 px-1">{msg.sender_name}</span>
                    )}
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: isMe ? '#007AFF' : '#2C2C2E',
                        color: '#fff',
                        borderBottomRightRadius: isMe ? 6 : 16,
                        borderBottomLeftRadius: isMe ? 16 : 6,
                      }}
                    >
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

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderTop: '1px solid #38383A' }}
          >
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

      {/* DM User Picker */}
      {showDmPicker && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDmPicker(false)} />
          <div
            className="relative w-full md:max-w-sm rounded-t-3xl md:rounded-2xl z-10 flex flex-col"
            style={{ backgroundColor: '#1C1C1E', maxHeight: '70vh' }}
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #38383A' }}>
              <h3 className="text-white font-semibold">Neue Nachricht</h3>
              <button onClick={() => setShowDmPicker(false)} className="text-[#8E8E93]">
                <X size={20} />
              </button>
            </div>

            {/* Suche */}
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#2C2C2E' }}>
                <Search size={15} className="text-[#8E8E93] shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name suchen…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#48484A]"
                />
              </div>
            </div>

            {/* Userliste */}
            <div className="flex-1 ios-scroll pb-4">
              {filteredUsers.length === 0 && (
                <p className="text-[#8E8E93] text-sm text-center py-8">Keine Nutzer gefunden.</p>
              )}
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDm(u)}
                  disabled={creatingDm}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#2C2C2E] transition-all disabled:opacity-50"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                    style={{ backgroundColor: roleColor(u.role) }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-[#8E8E93] text-xs capitalize">
                      {u.role === 'teacher' ? 'Lehrer' : u.role === 'admin' ? 'Admin' : 'Schüler'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
